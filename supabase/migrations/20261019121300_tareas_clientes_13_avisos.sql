-- Tareas de clientes (parte 13/14): avisos automáticos, recurrentes y retención.
--
--   10:00 Santiago, lunes a viernes:
--     · cliente: UN correo con todas sus tareas por entregar (no las creadas
--       hoy, que ya recibieron el correo de "tarea nueva");
--     · encargado: cada 2 días desde 5 días antes del plazo del cliente, y a
--       diario cuando ya venció.
--   10:00 todos los días: dueños, el día que vence el plazo del cliente sin
--   entrega (una vez por tarea).
--   07:00: crea las tareas recurrentes del día.
--   04:45 UTC: retención (ver docs/ley-21719/registro-de-tratamiento.md).
-- Pruebas: SELECT public.tcliente_avisos(true);  SELECT public.tcliente_crear_recurrentes(true);

CREATE OR REPLACE FUNCTION public.tcliente_avisos(p_forzar boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hoy  date := public.hoy_cl();
  r    record;
  nc   integer := 0;
  ne   integer := 0;
  nd   integer := 0;
BEGIN
  IF NOT p_forzar THEN
    IF extract(hour FROM now() AT TIME ZONE 'America/Santiago') <> 10 THEN RETURN NULL; END IF;
    INSERT INTO public.tareas_cliente_corridas VALUES (hoy, 'avisos') ON CONFLICT DO NOTHING;
    IF NOT FOUND THEN RETURN NULL; END IF;
  END IF;

  IF p_forzar OR extract(isodow FROM hoy) <= 5 THEN
    FOR r IN
      SELECT t.contacto_id, array_agg(t.id) AS ids
        FROM public.tareas_cliente t
       WHERE t.cerrada_at IS NULL AND t.cancelada_at IS NULL AND t.estado_cliente IN ('pendiente', 'devuelta')
         AND (p_forzar OR (t.created_at AT TIME ZONE 'America/Santiago')::date < hoy)
       GROUP BY t.contacto_id
    LOOP
      IF public.tcliente_correo_contacto(r.contacto_id, 'cliente_diario', r.ids) IS NOT NULL THEN nc := nc + 1; END IF;
    END LOOP;

    FOR r IN
      SELECT t.encargado_id, array_agg(t.id ORDER BY t.fecha_cliente) AS ids,
             jsonb_agg(public.tcliente_json_correo(t.id) ORDER BY t.fecha_cliente) AS tareas
        FROM public.tareas_cliente t
       WHERE t.cerrada_at IS NULL AND t.cancelada_at IS NULL AND t.estado_cliente IN ('pendiente', 'devuelta')
         AND t.fecha_cliente - hoy <= 5
         AND (p_forzar OR t.aviso_encargado_el IS NULL OR hoy - t.aviso_encargado_el >= 2 OR t.fecha_cliente < hoy)
       GROUP BY t.encargado_id
    LOOP
      PERFORM public.tcliente_correo_equipo(ARRAY[r.encargado_id], 'encargado_recordatorio',
                                            jsonb_build_object('tareas', r.tareas), r.ids);
      UPDATE public.tareas_cliente SET aviso_encargado_el = hoy WHERE id = ANY(r.ids);
      ne := ne + 1;
    END LOOP;
  END IF;

  FOR r IN
    SELECT array_agg(t.id) AS ids, jsonb_agg(public.tcliente_json_correo(t.id) ORDER BY t.fecha_cliente) AS tareas
      FROM public.tareas_cliente t
     WHERE t.cerrada_at IS NULL AND t.cancelada_at IS NULL AND t.estado_cliente IN ('pendiente', 'devuelta')
       AND t.fecha_cliente <= hoy AND t.aviso_duenos_at IS NULL
    HAVING count(*) > 0
  LOOP
    PERFORM public.tcliente_correo_equipo(public.tcliente_duenos(), 'duenos_vencida', jsonb_build_object('tareas', r.tareas), r.ids);
    UPDATE public.tareas_cliente SET aviso_duenos_at = now() WHERE id = ANY(r.ids);
    nd := cardinality(r.ids);
  END LOOP;

  RETURN jsonb_build_object('clientes', nc, 'encargados', ne, 'vencidas_a_duenos', nd);
END $$;

CREATE OR REPLACE FUNCTION public.tcliente_crear_recurrentes(p_forzar boolean DEFAULT false)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hoy date := public.hoy_cl();
  pl  public.tareas_cliente_plantillas;
  n   integer := 0;
BEGIN
  IF NOT p_forzar AND extract(hour FROM now() AT TIME ZONE 'America/Santiago') <> 7 THEN RETURN 0; END IF;
  PERFORM set_config('app.tcliente_sistema', 'on', true);
  FOR pl IN SELECT * FROM public.tareas_cliente_plantillas WHERE activa AND proxima_fecha <= hoy FOR UPDATE LOOP
    BEGIN
      PERFORM public.tcliente_guardar(jsonb_build_object(
        'cliente_id', pl.cliente_id, 'contacto_id', pl.contacto_id, 'encargado_id', pl.encargado_id,
        'titulo', pl.titulo, 'tarea_cliente', pl.tarea_cliente, 'tarea_encargado', pl.tarea_encargado,
        'fecha_cliente', hoy + pl.dias_cliente, 'fecha_encargado', hoy + pl.dias_cliente + pl.dias_encargado,
        'plantilla_id', pl.id,
        'entregables', (SELECT jsonb_agg(jsonb_build_object('texto', x)) FROM unnest(pl.entregables) x)));
      n := n + 1;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'Plantilla % no se pudo crear: %', pl.id, SQLERRM;
    END;
    UPDATE public.tareas_cliente_plantillas SET proxima_fecha = public.tcliente_proxima(frecuencia, dia, hoy + 1) WHERE id = pl.id;
  END LOOP;
  PERFORM set_config('app.tcliente_sistema', '', true);
  RETURN n;
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019121300', 'tareas_clientes_13_avisos')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
