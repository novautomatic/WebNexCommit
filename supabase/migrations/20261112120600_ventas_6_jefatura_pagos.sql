-- CRM de vendedores (6/7): pagos del cliente, cancelaciones, bonos y transferencias.

-- El cliente pagó el 1.er o el 2.º 50 %: se genera esa mitad de la comisión.
CREATE OR REPLACE FUNCTION public.ventas_registrar_pago(p_venta uuid, p_numero int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v ventas_ventas; mitad bigint;
BEGIN
  PERFORM ventas_exigir_jefe();
  SELECT * INTO v FROM ventas_ventas WHERE id = p_venta;
  IF p_numero = 1 THEN
    IF v.estado <> 'aprobada' THEN RAISE EXCEPTION 'Primero aprueba la propuesta.'; END IF;
    mitad := v.comision / 2;
    UPDATE ventas_ventas SET estado = 'en_curso', pago1_at = now() WHERE id = p_venta;
    UPDATE ventas_prospectos SET etapa = 'ganado', ultimo_movimiento = now() WHERE id = v.prospecto_id;
    INSERT INTO ventas_pagos (persona_id, concepto, referencia, detalle, monto)
    VALUES (v.vendedor_id, 'comision_1', v.id, '1.ª mitad · ' || v.descripcion, mitad) ON CONFLICT DO NOTHING;
  ELSIF p_numero = 2 THEN
    IF v.estado <> 'en_curso' THEN RAISE EXCEPTION 'Falta registrar el primer pago.'; END IF;
    UPDATE ventas_ventas SET estado = 'pagada', pago2_at = now() WHERE id = p_venta;
    INSERT INTO ventas_pagos (persona_id, concepto, referencia, detalle, monto)
    VALUES (v.vendedor_id, 'comision_2', v.id, '2.ª mitad · ' || v.descripcion, v.comision - v.comision / 2)
    ON CONFLICT DO NOTHING;
  ELSE
    RAISE EXCEPTION 'El pago es el 1 o el 2.';
  END IF;
  INSERT INTO ventas_notas (prospecto_id, autor, tipo, texto)
  VALUES (v.prospecto_id, ventas_actor(), 'sistema', 'Cliente pagó el ' || p_numero || '.º 50 %.');
END $$;

-- Cancelar: lo ya generado se mantiene; lo que faltaba no se genera.
CREATE OR REPLACE FUNCTION public.ventas_cancelar(p_venta uuid, p_nota text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM ventas_exigir_jefe();
  UPDATE ventas_ventas SET estado = 'cancelada', nota_jefe = nullif(trim(p_nota), '')
   WHERE id = p_venta AND estado NOT IN ('pagada', 'cancelada');
  IF NOT FOUND THEN RAISE EXCEPTION 'Esa venta no se puede cancelar.'; END IF;
END $$;

-- Bono del mes: escalón más alto alcanzado con la suma de contratos cuyo 1.er pago entró ese mes.
CREATE OR REPLACE FUNCTION public.ventas_calcular_bonos(p_mes date)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_bono bigint; v_mes date := date_trunc('month', p_mes)::date; n int := 0;
BEGIN
  PERFORM ventas_exigir_jefe();
  FOR r IN
    SELECT p.id, coalesce(sum(v.total), 0) AS vendido FROM ventas_personas p
    LEFT JOIN ventas_ventas v ON v.vendedor_id = p.id AND v.pago1_at IS NOT NULL
         AND date_trunc('month', v.pago1_at AT TIME ZONE 'America/Santiago')::date = v_mes
    WHERE p.rol = 'vendedor' GROUP BY p.id
  LOOP
    SELECT coalesce(max((b ->> 'bono')::bigint), 0) INTO v_bono
      FROM ventas_config c, jsonb_array_elements(c.bonos) b WHERE (b ->> 'desde')::bigint <= r.vendido;
    DELETE FROM ventas_pagos g WHERE g.persona_id = r.id AND g.concepto = 'bono' AND g.mes = v_mes AND g.pagado_at IS NULL;
    IF v_bono > 0 AND NOT EXISTS (SELECT 1 FROM ventas_pagos g
         WHERE g.persona_id = r.id AND g.concepto = 'bono' AND g.mes = v_mes) THEN
      INSERT INTO ventas_pagos (persona_id, concepto, mes, detalle, monto)
      VALUES (r.id, 'bono', v_mes, 'Bono meta ' || to_char(v_mes, 'MM-YYYY') || ' (vendido $' || r.vendido || ')', v_bono);
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.ventas_marcar_pagado(p_ids uuid[], p_pagado boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM ventas_exigir_jefe();
  UPDATE ventas_pagos SET pagado_at = CASE WHEN p_pagado THEN now() END WHERE id = ANY (p_ids);
END $$;

GRANT EXECUTE ON FUNCTION public.ventas_asignar(uuid, uuid), public.ventas_validar(uuid, boolean),
  public.ventas_jornada_revisar(uuid, boolean), public.ventas_revisar(uuid, boolean, text),
  public.ventas_registrar_pago(uuid, int), public.ventas_cancelar(uuid, text),
  public.ventas_calcular_bonos(date), public.ventas_marcar_pagado(uuid[], boolean) TO authenticated;
