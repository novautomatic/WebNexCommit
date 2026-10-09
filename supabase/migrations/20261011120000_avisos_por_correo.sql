-- ============================================================================
-- Avisos por correo: tareas y Creador de páginas.
--
--   equipo.avisos_correo   recibe por correo sus tareas nuevas/reasignadas y
--                          el resumen matutino (default sí)
--   equipo.avisos_creador  recibe el aviso de cada lead nuevo del Creador
--                          (default no; se encienden JP, Fabián y Stephania).
--                          Lo lee el back de Agente-Next al publicar una página.
--
-- Tareas:
--   - Al crear o reasignar (mismas reglas que el WhatsApp: no si uno se la
--     asigna a sí mismo, no en importaciones con app.sin_avisos): correo al
--     responsable → POST /avisos/tarea-correo.
--   - Resumen diario a las 08:00 de Santiago con las tareas abiertas de cada
--     persona, ordenadas por fecha de entrega → POST /avisos/resumen-tareas.
--     Solo a quien tiene tareas abiertas; una vez por día.
--
-- Usa los mismos secretos de Vault que el WhatsApp (avisos_tareas_url /
-- avisos_tareas_secret): la ruta de correo sale de la misma URL base.
-- El registro va a avisos_whatsapp con canal = 'correo' (tabla de avisos de
-- todos los canales; el nombre quedó por historia).
--
-- Idempotente. Requiere 20261007120000_sistema_tareas.sql.
-- ============================================================================

-- ─── Equipo ────────────────────────────────────────────────────────────────
ALTER TABLE public.equipo ADD COLUMN IF NOT EXISTS avisos_correo boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  -- Solo la primera vez: después lo maneja el panel (Equipo → editar).
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'equipo' AND column_name = 'avisos_creador') THEN
    ALTER TABLE public.equipo ADD COLUMN avisos_creador boolean NOT NULL DEFAULT false;
    UPDATE public.equipo SET avisos_creador = true
     WHERE lower(email) IN ('fabianignacio.tm@gmail.com', 'jpa.pizarro@gmail.com', 'stephaniabilbao@gmail.com');
  END IF;
END $$;

-- ─── Registro de avisos: canal + resumen ───────────────────────────────────
ALTER TABLE public.avisos_whatsapp ADD COLUMN IF NOT EXISTS canal text NOT NULL DEFAULT 'whatsapp';
ALTER TABLE public.avisos_whatsapp ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.avisos_whatsapp ALTER COLUMN tarea_id DROP NOT NULL;

ALTER TABLE public.avisos_whatsapp DROP CONSTRAINT IF EXISTS avisos_whatsapp_canal_check;
ALTER TABLE public.avisos_whatsapp ADD CONSTRAINT avisos_whatsapp_canal_check CHECK (canal IN ('whatsapp', 'correo'));
ALTER TABLE public.avisos_whatsapp DROP CONSTRAINT IF EXISTS avisos_whatsapp_tipo_check;
ALTER TABLE public.avisos_whatsapp ADD CONSTRAINT avisos_whatsapp_tipo_check CHECK (tipo IN ('asignada', 'reasignada', 'resumen'));

CREATE INDEX IF NOT EXISTS avisos_whatsapp_resumen_idx ON public.avisos_whatsapp (equipo_id, created_at DESC) WHERE tipo = 'resumen';

COMMENT ON TABLE public.avisos_whatsapp IS
  'Registro de avisos de tareas (WhatsApp y correo; tipo resumen = correo matutino, sin tarea). Guarda teléfono o correo del destinatario: se borra a los 180 días (cron limpiar-avisos-tareas).';

-- ─── URL de los endpoints de correo ────────────────────────────────────────
-- avisos_tareas_url es ".../avisos/tarea"; las rutas hermanas salen de ahí.
CREATE OR REPLACE FUNCTION public.avisos_url(p_ruta text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT regexp_replace(decrypted_secret, '/avisos/[^/]*/?$', '') || '/avisos/' || p_ruta
    FROM vault.decrypted_secrets WHERE name = 'avisos_tareas_url'
$$;

-- ─── Correo al responsable ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.encolar_correo_tarea(p_tarea uuid, p_tipo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t         record;
  url       text := public.avisos_url('tarea-correo');
  secreto   text;
  req_id    bigint;
  aviso_id  uuid;
BEGIN
  SELECT ta.id, ta.numero, ta.titulo, ta.prioridad, ta.fecha_limite, ta.descripcion,
         p.nombre AS proyecto, e.id AS equipo_id, e.nombre, e.email, e.avisos_correo
    INTO t
    FROM public.tareas ta
    JOIN public.proyectos p ON p.id = ta.proyecto_id
    LEFT JOIN public.equipo e ON e.id = ta.responsable_id AND e.activo
   WHERE ta.id = p_tarea;

  IF t.equipo_id IS NULL OR NOT t.avisos_correo THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'avisos_tareas_secret';
  IF url IS NULL OR secreto IS NULL THEN
    INSERT INTO public.avisos_whatsapp (tarea_id, equipo_id, canal, email, tipo, estado, detalle, procesado_at)
    VALUES (p_tarea, t.equipo_id, 'correo', t.email, p_tipo, 'error',
            'Faltan los secretos avisos_tareas_url / avisos_tareas_secret en Vault.', now())
    RETURNING id INTO aviso_id;
    RETURN aviso_id;
  END IF;

  SELECT net.http_post(
    url     := url,
    body    := jsonb_build_object(
                 'to', t.email,
                 'nombre', split_part(t.nombre, ' ', 1),
                 'titulo', '#' || t.numero || ' ' || t.titulo,
                 'proyecto', t.proyecto,
                 'prioridad', t.prioridad,
                 'fecha_limite', t.fecha_limite,
                 'descripcion', left(coalesce(t.descripcion, ''), 1500),
                 'enlace', 'https://www.nexcommit.com/admin?tab=tareas&tarea=' || t.numero,
                 'tipo', p_tipo),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secreto),
    timeout_milliseconds := 15000
  ) INTO req_id;

  INSERT INTO public.avisos_whatsapp (tarea_id, equipo_id, canal, email, tipo, estado, request_id)
  VALUES (p_tarea, t.equipo_id, 'correo', t.email, p_tipo, 'pendiente', req_id)
  RETURNING id INTO aviso_id;
  RETURN aviso_id;
END $$;

-- Mismo trigger de siempre, ahora con WhatsApp + correo.
CREATE OR REPLACE FUNCTION public.tareas_avisar_responsable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := coalesce(public.mi_equipo_id(), NEW.creado_por);
  tipo  text;
BEGIN
  IF coalesce(current_setting('app.sin_avisos', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.responsable_id IS NULL OR NEW.responsable_id = actor THEN
    RETURN NEW;
  END IF;
  IF NEW.estado IN ('completada', 'cancelada') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    tipo := 'asignada';
  ELSIF OLD.responsable_id IS DISTINCT FROM NEW.responsable_id THEN
    tipo := 'reasignada';
  ELSE
    RETURN NEW;
  END IF;
  PERFORM public.encolar_aviso_tarea(NEW.id, tipo);
  PERFORM public.encolar_correo_tarea(NEW.id, tipo);
  RETURN NEW;
END $$;

-- Botón "Reenviar aviso" del panel: por los dos canales.
CREATE OR REPLACE FUNCTION public.reenviar_aviso_tarea(p_tarea uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wsp    uuid;
  correo uuid;
BEGIN
  IF NOT public.es_equipo() THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;
  wsp    := public.encolar_aviso_tarea(p_tarea, 'asignada');
  correo := public.encolar_correo_tarea(p_tarea, 'asignada');
  RETURN coalesce(correo, wsp);
END $$;

-- ─── Resumen matutino ──────────────────────────────────────────────────────
-- p_forzar: manda ya, a cualquier hora y aunque hoy ya haya salido (pruebas:
-- SELECT public.enviar_resumen_tareas(true);).
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
  IF NOT p_forzar AND extract(hour FROM ahora) <> 8 THEN
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
         WHERE ta.responsable_id = m.id AND ta.estado NOT IN ('completada', 'cancelada')
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

-- ─── Procesar respuestas (ahora distingue el canal) ────────────────────────
CREATE OR REPLACE FUNCTION public.procesar_avisos_whatsapp()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n integer := 0;
  a record;
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.es_equipo() THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  FOR a IN
    SELECT av.id, av.canal, av.detalle, av.created_at, r.status_code, r.content, r.error_msg, r.timed_out
      FROM public.avisos_whatsapp av
      LEFT JOIN net._http_response r ON r.id = av.request_id
     WHERE av.estado = 'pendiente'
  LOOP
    IF a.status_code BETWEEN 200 AND 299 THEN
      UPDATE public.avisos_whatsapp
         SET estado = 'enviado',
             detalle = CASE
                         WHEN a.canal = 'correo' THEN 'Correo enviado' || coalesce(' · ' || a.detalle, '') || '.'
                         WHEN a.content ~ '"via"\s*:\s*"texto"'
                           THEN 'Enviado como texto libre (la plantilla aún no está aprobada).'
                         ELSE 'Enviado con plantilla.' END,
             procesado_at = now()
       WHERE id = a.id;
      n := n + 1;
    ELSIF a.status_code IS NOT NULL OR a.error_msg IS NOT NULL OR a.timed_out THEN
      UPDATE public.avisos_whatsapp
         SET estado = 'error',
             detalle = left(coalesce(
                         CASE WHEN a.content IS NOT NULL AND a.content ~ '^\s*\{' THEN a.content::jsonb ->> 'error' END,
                         a.error_msg,
                         CASE WHEN a.timed_out THEN 'El back no respondió a tiempo.' END,
                         'HTTP ' || a.status_code), 500),
             procesado_at = now()
       WHERE id = a.id;
      n := n + 1;
    ELSIF a.created_at < now() - interval '15 minutes' THEN
      UPDATE public.avisos_whatsapp
         SET estado = 'error', detalle = 'Sin respuesta del back en 15 minutos.', procesado_at = now()
       WHERE id = a.id;
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.avisos_url(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.encolar_correo_tarea(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enviar_resumen_tareas(boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.procesar_avisos_whatsapp() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reenviar_aviso_tarea(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.procesar_avisos_whatsapp() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reenviar_aviso_tarea(uuid) TO authenticated;

-- ─── Cron: 08:00 de Santiago ───────────────────────────────────────────────
-- pg_cron corre en UTC y Chile cambia de horario: se agenda a las 11 y 12 UTC
-- y la función solo actúa cuando en Santiago son las 8 (una vez por día).
DO $$
BEGIN
  PERFORM cron.unschedule('resumen-tareas-diario') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'resumen-tareas-diario');
  PERFORM cron.schedule('resumen-tareas-diario', '0 11,12 * * *', 'SELECT public.enviar_resumen_tareas()');
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261011120000', 'avisos_por_correo')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
