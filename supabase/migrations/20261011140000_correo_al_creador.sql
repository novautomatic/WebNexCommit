-- ============================================================================
-- Correos de tareas: también al CREADOR, y resumen solo de lunes a viernes.
--
--   - tareas.creado_por se completa solo con quien tiene la sesión (el panel
--     nunca lo mandaba). Las que nacen en GitHub ya traen el autor.
--   - Al crear una tarea: correo «creada» al creador y «asignada» al
--     responsable (uno solo si son la misma persona). Al reasignar: correo al
--     nuevo responsable. El WhatsApp no cambia (solo responsable, nunca a uno mismo).
--   - Resumen 08:00 de Santiago, lunes a viernes: tareas abiertas que la
--     persona tiene asignadas o creó.
--
-- Idempotente. Reemplaza lo de 20261011130000. Requiere 20261011120000.
-- ============================================================================

-- ─── Quién creó la tarea ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tareas_fijar_creador()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.creado_por := coalesce(NEW.creado_por, public.mi_equipo_id());
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tareas_fijar_creador ON public.tareas;
CREATE TRIGGER tareas_fijar_creador BEFORE INSERT ON public.tareas
  FOR EACH ROW EXECUTE FUNCTION public.tareas_fijar_creador();

-- ─── Tipo «creada» en el registro de avisos ────────────────────────────────
ALTER TABLE public.avisos_whatsapp DROP CONSTRAINT IF EXISTS avisos_whatsapp_tipo_check;
ALTER TABLE public.avisos_whatsapp ADD CONSTRAINT avisos_whatsapp_tipo_check
  CHECK (tipo IN ('asignada', 'reasignada', 'creada', 'resumen'));

-- ─── Correo de una tarea a una persona del equipo ──────────────────────────
DROP FUNCTION IF EXISTS public.encolar_correo_tarea(uuid, text);

CREATE OR REPLACE FUNCTION public.encolar_correo_tarea(p_tarea uuid, p_tipo text, p_para uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t         record;
  d         record;
  url       text := public.avisos_url('tarea-correo');
  secreto   text;
  req_id    bigint;
  aviso_id  uuid;
BEGIN
  SELECT id, nombre, email, avisos_correo INTO d FROM public.equipo WHERE id = p_para AND activo;
  IF d.id IS NULL OR NOT d.avisos_correo THEN
    RETURN NULL;
  END IF;

  SELECT ta.numero, ta.titulo, ta.prioridad, ta.fecha_limite, ta.descripcion,
         p.nombre AS proyecto, r.nombre AS responsable, c.nombre AS creador
    INTO t
    FROM public.tareas ta
    JOIN public.proyectos p ON p.id = ta.proyecto_id
    LEFT JOIN public.equipo r ON r.id = ta.responsable_id
    LEFT JOIN public.equipo c ON c.id = ta.creado_por
   WHERE ta.id = p_tarea;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'avisos_tareas_secret';
  IF url IS NULL OR secreto IS NULL THEN
    INSERT INTO public.avisos_whatsapp (tarea_id, equipo_id, canal, email, tipo, estado, detalle, procesado_at)
    VALUES (p_tarea, d.id, 'correo', d.email, p_tipo, 'error',
            'Faltan los secretos avisos_tareas_url / avisos_tareas_secret en Vault.', now())
    RETURNING id INTO aviso_id;
    RETURN aviso_id;
  END IF;

  SELECT net.http_post(
    url     := url,
    body    := jsonb_build_object(
                 'to', d.email,
                 'nombre', split_part(d.nombre, ' ', 1),
                 'titulo', '#' || t.numero || ' ' || t.titulo,
                 'proyecto', t.proyecto,
                 'prioridad', t.prioridad,
                 'fecha_limite', t.fecha_limite,
                 'descripcion', left(coalesce(t.descripcion, ''), 1500),
                 'responsable', t.responsable,
                 'creador', t.creador,
                 'enlace', 'https://www.nexcommit.com/admin?tab=tareas&tarea=' || t.numero,
                 'tipo', p_tipo),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secreto),
    timeout_milliseconds := 15000
  ) INTO req_id;

  INSERT INTO public.avisos_whatsapp (tarea_id, equipo_id, canal, email, tipo, estado, request_id)
  VALUES (p_tarea, d.id, 'correo', d.email, p_tipo, 'pendiente', req_id)
  RETURNING id INTO aviso_id;
  RETURN aviso_id;
END $$;

-- ─── Trigger de avisos ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tareas_avisar_responsable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := coalesce(public.mi_equipo_id(), NEW.creado_por);
BEGIN
  IF coalesce(current_setting('app.sin_avisos', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.estado IN ('completada', 'cancelada') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.responsable_id IS NOT NULL THEN
      IF NEW.responsable_id IS DISTINCT FROM actor THEN
        PERFORM public.encolar_aviso_tarea(NEW.id, 'asignada');
      END IF;
      PERFORM public.encolar_correo_tarea(NEW.id, 'asignada', NEW.responsable_id);
    END IF;
    IF NEW.creado_por IS NOT NULL AND NEW.creado_por IS DISTINCT FROM NEW.responsable_id THEN
      PERFORM public.encolar_correo_tarea(NEW.id, 'creada', NEW.creado_por);
    END IF;
  ELSIF NEW.responsable_id IS NOT NULL AND OLD.responsable_id IS DISTINCT FROM NEW.responsable_id THEN
    IF NEW.responsable_id IS DISTINCT FROM actor THEN
      PERFORM public.encolar_aviso_tarea(NEW.id, 'reasignada');
    END IF;
    PERFORM public.encolar_correo_tarea(NEW.id, 'reasignada', NEW.responsable_id);
  END IF;
  RETURN NEW;
END $$;

-- «Reenviar aviso» del panel: WhatsApp + correo al responsable.
CREATE OR REPLACE FUNCTION public.reenviar_aviso_tarea(p_tarea uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  resp   uuid;
  wsp    uuid;
  correo uuid;
BEGIN
  IF NOT public.es_equipo() THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;
  SELECT responsable_id INTO resp FROM public.tareas WHERE id = p_tarea;
  wsp    := public.encolar_aviso_tarea(p_tarea, 'asignada');
  correo := public.encolar_correo_tarea(p_tarea, 'asignada', resp);
  RETURN coalesce(correo, wsp);
END $$;

-- ─── Resumen matutino: lunes a viernes, asignadas + creadas ────────────────
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
                 -- Creada por la persona pero de otro: se muestra «Asignada a X».
                 'asignada_a', CASE WHEN ta.responsable_id IS DISTINCT FROM m.id
                                    THEN coalesce(r.nombre, 'nadie') END,
                 'resumen', nullif(left(trim(regexp_replace(regexp_replace(
                              coalesce(ta.descripcion, ''),
                              'Fecha l[ií]mite:\s*\d{4}-\d{2}-\d{2}', '', 'gi'),
                              '[#*`>_\s]+', ' ', 'g')), 160), ''),
                 'enlace', 'https://www.nexcommit.com/admin?tab=tareas&tarea=' || ta.numero) AS fila
          FROM public.tareas ta
          JOIN public.proyectos p ON p.id = ta.proyecto_id
          LEFT JOIN public.equipo r ON r.id = ta.responsable_id
         WHERE (ta.responsable_id = m.id OR ta.creado_por = m.id)
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

REVOKE ALL ON FUNCTION public.tareas_fijar_creador() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.encolar_correo_tarea(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enviar_resumen_tareas(boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reenviar_aviso_tarea(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reenviar_aviso_tarea(uuid) TO authenticated;

-- ─── Cron: 08:00 de Santiago, lunes a viernes ──────────────────────────────
DO $$
BEGIN
  PERFORM cron.unschedule('resumen-tareas-diario') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'resumen-tareas-diario');
  PERFORM cron.schedule('resumen-tareas-diario', '0 11,12 * * 1-5', 'SELECT public.enviar_resumen_tareas()');
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261011140000', 'correo_al_creador')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
