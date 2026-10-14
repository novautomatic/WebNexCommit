-- ============================================================================
-- Resumen matutino de tareas: solo las tareas ASIGNADAS a cada persona
-- (antes incluía también las que creó para otros). Sigue igual: 08:00 de
-- Santiago, lunes a viernes, solo a quien tiene tareas abiertas, una vez al día.
--
-- Idempotente. Reemplaza la función de 20261011140000.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enviar_resumen_tareas(p_forzar boolean DEFAULT false)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ahora    timestamp := now() AT TIME ZONE 'America/Santiago';
  hoy      date := ahora::date;
  url      text := public.avisos_url('resumen-tareas');
  secreto  text;
  m        record;
  lista    jsonb;
  req_id   bigint;
  n        integer := 0;
  fecha    text;
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

  FOR m IN SELECT id, nombre, email FROM public.equipo WHERE activo AND avisos_correo LOOP
    CONTINUE WHEN NOT p_forzar AND EXISTS (
      SELECT 1 FROM public.avisos_whatsapp
       WHERE equipo_id = m.id AND tipo = 'resumen' AND estado <> 'error'
         AND (created_at AT TIME ZONE 'America/Santiago')::date = hoy);

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

    SELECT net.http_post(
      url     := url,
      body    := jsonb_build_object('to', m.email, 'nombre', split_part(m.nombre, ' ', 1), 'fecha', fecha, 'tareas', lista),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secreto),
      timeout_milliseconds := 20000
    ) INTO req_id;

    INSERT INTO public.avisos_whatsapp (tarea_id, equipo_id, canal, email, tipo, estado, detalle, request_id)
    VALUES (NULL, m.id, 'correo', m.email, 'resumen', 'pendiente',
            jsonb_array_length(lista) || ' tareas abiertas', req_id);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.enviar_resumen_tareas(boolean) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261014120000', 'resumen_solo_asignadas')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
