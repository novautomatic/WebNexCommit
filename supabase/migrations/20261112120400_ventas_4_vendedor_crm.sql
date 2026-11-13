-- CRM de vendedores (4/7): mover etapas, notas y propuestas del vendedor.

CREATE OR REPLACE FUNCTION public.ventas_mover(p_id uuid, p_etapa text, p_motivo text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT ventas_puede(p_id) THEN RAISE EXCEPTION 'Ese prospecto no es tuyo.'; END IF;
  IF p_etapa = 'ganado' AND NOT ventas_jefe() THEN
    RAISE EXCEPTION 'Queda ganado solo cuando el cliente paga el primer 50%%.';
  END IF;
  IF p_etapa = 'perdido' AND length(trim(coalesce(p_motivo, ''))) < 3 THEN
    RAISE EXCEPTION 'Anota por qué se perdió.';
  END IF;
  UPDATE ventas_prospectos SET etapa = p_etapa, motivo_perdida = CASE WHEN p_etapa = 'perdido' THEN trim(p_motivo) END,
         ultimo_movimiento = now() WHERE id = p_id;
  INSERT INTO ventas_notas (prospecto_id, autor, tipo, texto)
  VALUES (p_id, ventas_actor(), 'sistema', 'Etapa: ' || p_etapa || coalesce(' · ' || trim(p_motivo), ''));
END $$;

CREATE OR REPLACE FUNCTION public.ventas_proximo_paso(p_id uuid, p_texto text, p_fecha date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT ventas_puede(p_id) THEN RAISE EXCEPTION 'Ese prospecto no es tuyo.'; END IF;
  UPDATE ventas_prospectos SET proximo_paso = nullif(trim(p_texto), ''), proximo_paso_fecha = p_fecha,
         ultimo_movimiento = now() WHERE id = p_id;
END $$;

CREATE OR REPLACE FUNCTION public.ventas_nota(p_id uuid, p_tipo text, p_texto text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT ventas_puede(p_id) THEN RAISE EXCEPTION 'Ese prospecto no es tuyo.'; END IF;
  IF length(trim(coalesce(p_texto, ''))) = 0 THEN RAISE EXCEPTION 'La nota está vacía.'; END IF;
  INSERT INTO ventas_notas (prospecto_id, autor, tipo, texto) VALUES (p_id, ventas_actor(), p_tipo, trim(p_texto));
  UPDATE ventas_prospectos SET ultimo_movimiento = now() WHERE id = p_id;
END $$;

-- Propuesta: la revisa la jefatura antes de enviarla al cliente.
CREATE OR REPLACE FUNCTION public.ventas_proponer(
  p_prospecto uuid, p_descripcion text, p_lista bigint, p_nivel text, p_mensualidad bigint, p_meses int
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  yo uuid := mi_vendedor_id(); c ventas_config; p ventas_prospectos; impl bigint; tab text; nueva uuid; nivel text := p_nivel;
BEGIN
  SELECT * INTO c FROM ventas_config WHERE id = 1;
  SELECT * INTO p FROM ventas_prospectos WHERE id = p_prospecto;
  IF yo IS NULL OR p.asignado_a IS DISTINCT FROM yo THEN RAISE EXCEPTION 'Ese prospecto no es tuyo.'; END IF;
  IF length(trim(coalesce(p_descripcion, ''))) < 3 THEN RAISE EXCEPTION 'Describe qué se vende.'; END IF;
  IF coalesce(p_lista, 0) <= 0 THEN RAISE EXCEPTION 'Falta el precio lista de la implementación.'; END IF;
  IF coalesce(p_meses, 0) < c.meses_minimos THEN RAISE EXCEPTION 'El contrato mínimo es de % meses.', c.meses_minimos; END IF;
  IF nivel NOT IN ('lista', 'oferta', 'ultima') THEN RAISE EXCEPTION 'Nivel de precio inválido.'; END IF;
  IF p.origen = 'terreno' AND nivel = 'lista' THEN nivel := 'oferta'; END IF; -- el inscrito parte con la oferta
  IF nivel = 'ultima' AND (SELECT count(*) FROM ventas_ventas
       WHERE vendedor_id = yo AND nivel_precio = 'ultima' AND estado NOT IN ('rechazada', 'cancelada')
         AND created_at >= date_trunc('month', now())) >= c.tope_ultimas_mes THEN
    RAISE EXCEPTION 'Ya usaste tus % últimas ofertas de este mes.', c.tope_ultimas_mes;
  END IF;
  impl := round(p_lista * (1 - CASE nivel WHEN 'oferta' THEN c.pct_oferta WHEN 'ultima' THEN c.pct_ultima ELSE 0 END / 100));
  tab := CASE WHEN p.asignado_por_jefe THEN 'asignado' ELSE 'normal' END;
  INSERT INTO ventas_ventas (prospecto_id, vendedor_id, descripcion, implementacion_lista, nivel_precio,
                             implementacion, mensualidad, meses, tabla, comision)
  VALUES (p_prospecto, yo, trim(p_descripcion), p_lista, nivel, impl, coalesce(p_mensualidad, 0), p_meses, tab,
          ventas_comision(impl + coalesce(p_mensualidad, 0) * p_meses, tab))
  RETURNING id INTO nueva;
  UPDATE ventas_prospectos SET etapa = 'propuesta', ultimo_movimiento = now() WHERE id = p_prospecto;
  INSERT INTO ventas_notas (prospecto_id, autor, tipo, texto)
  VALUES (p_prospecto, ventas_actor(), 'sistema', 'Propuesta enviada a revisión: ' || trim(p_descripcion));
  RETURN nueva;
END $$;

GRANT EXECUTE ON FUNCTION public.ventas_comision(bigint, text), public.ventas_jornada_iniciar(text),
  public.ventas_jornada_terminar(), public.ventas_inscribir(text, text, text, text, text, text, text, boolean),
  public.ventas_mover(uuid, text, text), public.ventas_proximo_paso(uuid, text, date),
  public.ventas_nota(uuid, text, text), public.ventas_proponer(uuid, text, bigint, text, bigint, int) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.ventas_actor(), public.ventas_puede(uuid) FROM anon, public;
