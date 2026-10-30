-- ============================================================================
-- Resumen matutino de tareas: ahora también por WhatsApp.
--
-- Mismo flujo que el correo (08:00 de Santiago, lunes a viernes, solo las
-- tareas ASIGNADAS y abiertas, una vez al día por persona). Además del correo
-- (si `avisos_correo`), sale un WhatsApp a quien tenga número en Equipo
-- (`equipo.whatsapp`), por el back de Agente-Next POST /avisos/resumen-tareas-wsp
-- desde el número de avisos de NexCommit. Cada canal se registra aparte en
-- avisos_whatsapp (canal 'correo' / 'whatsapp') y no se repite en el día.
--
-- Prueba: SELECT public.enviar_resumen_tareas(true);
-- Idempotente. Reemplaza la función de 20261014120000.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enviar_resumen_tareas(p_forzar boolean DEFAULT false)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ahora     timestamp := now() AT TIME ZONE 'America/Santiago';
  hoy       date := ahora::date;
  url       text := public.avisos_url('resumen-tareas');
  url_wsp   text := public.avisos_url('resumen-tareas-wsp');
  secreto   text;
  m         record;
  lista     jsonb;
  req_id    bigint;
  n         integer := 0;
  fecha     text;
  correo_ok boolean;
  wsp_ok    boolean;
BEGIN
  IF NOT p_forzar AND (extract(hour FROM ahora) <> 8 OR extract(isodow FROM hoy) > 5) THEN
    RETURN 0;
  END IF;
  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'avisos_tareas_secret';
  IF url IS NULL OR secreto IS NULL THEN
    RAISE WARNING 'enviar_resumen_tareas: faltan avisos_tareas_url / avisos_tareas_secret en Vault';
    RETURN 0;
  END IF;

  fecha := (ARRAY['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'])[extract(dow FROM hoy)::int + 1]
        || ' ' || extract(day FROM hoy)::int || ' de '
        || (ARRAY['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                  'septiembre', 'octubre', 'noviembre', 'diciembre'])[extract(month FROM hoy)::int];

  FOR m IN SELECT id, nombre, email, whatsapp, avisos_correo
             FROM public.equipo
            WHERE activo AND (avisos_correo OR whatsapp IS NOT NULL) LOOP
    -- ¿Qué canal falta hoy? (con p_forzar, los dos)
    correo_ok := m.avisos_correo AND (p_forzar OR NOT EXISTS (
      SELECT 1 FROM public.avisos_whatsapp
       WHERE equipo_id = m.id AND tipo = 'resumen' AND canal = 'correo' AND estado <> 'error'
         AND (created_at AT TIME ZONE 'America/Santiago')::date = hoy));
    wsp_ok := m.whatsapp IS NOT NULL AND (p_forzar OR NOT EXISTS (
      SELECT 1 FROM public.avisos_whatsapp
       WHERE equipo_id = m.id AND tipo = 'resumen' AND canal = 'whatsapp' AND estado <> 'error'
         AND (created_at AT TIME ZONE 'America/Santiago')::date = hoy));
    CONTINUE WHEN NOT correo_ok AND NOT wsp_ok;

    SELECT coalesce(jsonb_agg(x.fila ORDER BY x.orden_fecha NULLS LAST, x.orden_prio, x.numero), '[]'::jsonb)
      INTO lista
      FROM (
        SELECT ta.numero, ta.fecha_limite AS orden_fecha,
               array_position(ARRAY['urgente', 'alta', 'media', 'baja'], ta.prioridad) AS orden_prio,
               jsonb_build_object(
                 'titulo', '#' || ta.numero || ' ' || ta.titulo,
                 'proyecto', p.nombre,
                 'estado', ta.estado,
                 'prioridad', ta.prioridad,
                 'fecha_limite', ta.fecha_limite,
                 'dias', ta.fecha_limite - hoy,
                 'resumen', nullif(left(trim(regexp_replace(regexp_replace(
                              coalesce(ta.descripcion, ''),
                              'Fecha l[ií]mite:\s*\d{4}-\d{2}-\d{2}', '', 'gi'),
                              '[#*`>_\s]+', ' ', 'g')), 160), ''),
                 'enlace', 'https://www.nexcommit.com/admin?tab=tareas&tarea=' || ta.numero) AS fila
          FROM public.tareas ta
          JOIN public.proyectos p ON p.id = ta.proyecto_id
         WHERE ta.responsable_id = m.id
           AND ta.estado NOT IN ('completada', 'cancelada')
         ORDER BY ta.fecha_limite NULLS LAST, array_position(ARRAY['urgente', 'alta', 'media', 'baja'], ta.prioridad), ta.numero
         LIMIT 40
      ) x;

    CONTINUE WHEN jsonb_array_length(lista) = 0;

    IF correo_ok THEN
      SELECT net.http_post(
        url     := url,
        body    := jsonb_build_object('to', m.email, 'nombre', split_part(m.nombre, ' ', 1), 'fecha', fecha, 'tareas', lista),
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secreto),
        timeout_milliseconds := 20000
      ) INTO req_id;
      INSERT INTO public.avisos_whatsapp (tarea_id, equipo_id, canal, email, tipo, estado, detalle, request_id)
      VALUES (NULL, m.id, 'correo', m.email, 'resumen', 'pendiente',
              jsonb_array_length(lista) || ' tareas abiertas', req_id);
    END IF;

    IF wsp_ok THEN
      SELECT net.http_post(
        url     := url_wsp,
        body    := jsonb_build_object('to', m.whatsapp, 'nombre', split_part(m.nombre, ' ', 1), 'fecha', fecha, 'tareas', lista),
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secreto),
        timeout_milliseconds := 20000
      ) INTO req_id;
      INSERT INTO public.avisos_whatsapp (tarea_id, equipo_id, canal, telefono, tipo, estado, detalle, request_id)
      VALUES (NULL, m.id, 'whatsapp', m.whatsapp, 'resumen', 'pendiente',
              jsonb_array_length(lista) || ' tareas abiertas', req_id);
    END IF;

    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.enviar_resumen_tareas(boolean) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261030140000', 'resumen_tareas_whatsapp')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
