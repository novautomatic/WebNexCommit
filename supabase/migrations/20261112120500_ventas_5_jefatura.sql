-- CRM de vendedores (5/7): lo que hace la jefatura (dueños). Cada acción que
-- genera plata para alguien deja una fila en ventas_pagos (se transfiere y se marca).

CREATE OR REPLACE FUNCTION public.ventas_exigir_jefe() RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT ventas_jefe() THEN RAISE EXCEPTION 'Solo la jefatura de ventas puede hacer esto.'; END IF;
END $$;

-- Asignar (o quitar, con NULL). Si el contacto no lo consiguió ese mismo vendedor,
-- la venta se paga con la tabla de asignados.
CREATE OR REPLACE FUNCTION public.ventas_asignar(p_id uuid, p_vendedor uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p ventas_prospectos;
BEGIN
  PERFORM ventas_exigir_jefe();
  SELECT * INTO p FROM ventas_prospectos WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'El prospecto no existe.'; END IF;
  IF p_vendedor IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM ventas_personas WHERE id = p_vendedor AND activo AND rol = 'vendedor') THEN
    RAISE EXCEPTION 'Elige un vendedor activo.';
  END IF;
  UPDATE ventas_prospectos SET
    asignado_a = p_vendedor,
    asignado_at = CASE WHEN p_vendedor IS NOT NULL THEN now() END,
    asignado_por_jefe = p_vendedor IS NOT NULL AND NOT (origen = 'propio' AND captado_por = p_vendedor),
    ultimo_movimiento = now()
  WHERE id = p_id;
  INSERT INTO ventas_notas (prospecto_id, autor, tipo, texto)
  VALUES (p_id, ventas_actor(), 'sistema', coalesce('Asignado a ' ||
    (SELECT nombre FROM ventas_personas WHERE id = p_vendedor), 'Sin asignar'));
END $$;

-- Inscrito válido = número real, sin duplicar, que respondió. Solo los de terreno se pagan.
CREATE OR REPLACE FUNCTION public.ventas_validar(p_id uuid, p_valido boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p ventas_prospectos; c ventas_config;
BEGIN
  PERFORM ventas_exigir_jefe();
  SELECT * INTO p FROM ventas_prospectos WHERE id = p_id;
  SELECT * INTO c FROM ventas_config WHERE id = 1;
  UPDATE ventas_prospectos SET validado = p_valido, validado_at = now() WHERE id = p_id;
  IF p.origen <> 'terreno' OR p.captado_por IS NULL THEN RETURN; END IF;
  IF p_valido THEN
    INSERT INTO ventas_pagos (persona_id, concepto, referencia, mes, detalle, monto)
    VALUES (p.captado_por, 'inscrito', p.id, date_trunc('month', p.created_at)::date,
            'Inscrito: ' || p.negocio, c.pago_inscrito)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM ventas_pagos WHERE concepto = 'inscrito' AND referencia = p.id AND pagado_at IS NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ventas_jornada_revisar(p_id uuid, p_aprobar boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j ventas_jornadas; c ventas_config;
BEGIN
  PERFORM ventas_exigir_jefe();
  SELECT * INTO j FROM ventas_jornadas WHERE id = p_id;
  SELECT * INTO c FROM ventas_config WHERE id = 1;
  UPDATE ventas_jornadas SET estado = CASE WHEN p_aprobar THEN 'aprobada' ELSE 'rechazada' END,
         fin = coalesce(fin, now()) WHERE id = p_id;
  IF p_aprobar THEN
    INSERT INTO ventas_pagos (persona_id, concepto, referencia, mes, detalle, monto)
    VALUES (j.persona_id, 'jornada', j.id, date_trunc('month', j.inicio)::date,
            'Jornada ' || to_char(j.inicio AT TIME ZONE 'America/Santiago', 'DD-MM') || ' · ' || j.zona, c.pago_jornada)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM ventas_pagos WHERE concepto = 'jornada' AND referencia = j.id AND pagado_at IS NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ventas_revisar(p_venta uuid, p_aprobar boolean, p_nota text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v ventas_ventas;
BEGIN
  PERFORM ventas_exigir_jefe();
  SELECT * INTO v FROM ventas_ventas WHERE id = p_venta;
  IF v.estado <> 'propuesta' THEN RAISE EXCEPTION 'Esa propuesta ya fue revisada.'; END IF;
  UPDATE ventas_ventas SET estado = CASE WHEN p_aprobar THEN 'aprobada' ELSE 'rechazada' END,
         nota_jefe = nullif(trim(p_nota), '') WHERE id = p_venta;
  INSERT INTO ventas_notas (prospecto_id, autor, tipo, texto)
  VALUES (v.prospecto_id, ventas_actor(), 'sistema',
          CASE WHEN p_aprobar THEN 'Propuesta aprobada: ya se puede enviar al cliente.' ELSE 'Propuesta rechazada.' END
          || coalesce(' ' || nullif(trim(p_nota), ''), ''));
END $$;
