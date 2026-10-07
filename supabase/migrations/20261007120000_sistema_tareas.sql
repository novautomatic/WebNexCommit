-- ============================================================================
-- Sistema de tareas de NexCommit
--
-- Tablas: equipo, proyectos, tareas, tarea_comentarios, tarea_historial,
--         avisos_whatsapp.
-- Acceso: solo miembros activos de `equipo` (por el email de su sesión de
--         Supabase Auth). anon no ve nada.
-- Avisos: al crear o reasignar una tarea se le avisa por WhatsApp SOLO al
--         responsable. Un trigger encola el aviso y lo manda con pg_net al back
--         de Agente-Next (POST /avisos/tarea), que sale por el número de
--         NexCommit. Un cron de pg_cron reconcilia la respuesta cada minuto.
--         La URL y el secreto viven en Supabase Vault:
--           avisos_tareas_url     https://back-chat-next.vercel.app/avisos/tarea
--           avisos_tareas_secret  igual a AVISOS_TAREAS_SECRET en el back
--
-- Idempotente: se puede volver a correr entera sin romper nada.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── Equipo ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.equipo (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL CHECK (length(trim(nombre)) > 0),
  email       text NOT NULL,
  whatsapp    text CHECK (whatsapp IS NULL OR whatsapp ~ '^[0-9]{8,15}$'),
  rol         text NOT NULL DEFAULT 'miembro' CHECK (rol IN ('dueno', 'miembro')),
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS equipo_email_unico ON public.equipo (lower(email));

COMMENT ON TABLE public.equipo IS
  'Integrantes de NexCommit con acceso al sistema de tareas. whatsapp: solo dígitos con código de país (56912345678). Dato personal: solo lo ve el equipo.';

-- ¿La sesión actual es de alguien del equipo? SECURITY DEFINER para que las
-- políticas de equipo no se llamen a sí mismas (recursión de RLS).
CREATE OR REPLACE FUNCTION public.mi_equipo_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.equipo
  WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) AND activo
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.es_equipo()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.mi_equipo_id() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.es_dueno()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.equipo
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) AND activo AND rol = 'dueno'
  )
$$;

-- ─── Proyectos ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proyectos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text NOT NULL CHECK (length(trim(nombre)) > 0),
  descripcion  text,
  color        text NOT NULL DEFAULT '#248bde',
  etiquetas    text[] NOT NULL DEFAULT '{}',
  github_repo  text,
  es_cliente   boolean NOT NULL DEFAULT false,
  es_interno   boolean NOT NULL DEFAULT false,
  archivado    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS proyectos_nombre_unico ON public.proyectos (lower(nombre));

-- ─── Tareas ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tareas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero            bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  proyecto_id       uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  titulo            text NOT NULL CHECK (length(trim(titulo)) BETWEEN 1 AND 200),
  descripcion       text,
  estado            text NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente', 'en_progreso', 'en_revision', 'bloqueada', 'completada', 'cancelada')),
  prioridad         text NOT NULL DEFAULT 'media'
                    CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  responsable_id    uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  creado_por        uuid REFERENCES public.equipo(id) ON DELETE SET NULL DEFAULT public.mi_equipo_id(),
  fecha_limite      date,
  etiquetas         text[] NOT NULL DEFAULT '{}',
  github_issue_url  text UNIQUE,
  orden             double precision NOT NULL DEFAULT extract(epoch FROM now()),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  completada_at     timestamptz
);
CREATE INDEX IF NOT EXISTS tareas_proyecto_idx    ON public.tareas (proyecto_id);
CREATE INDEX IF NOT EXISTS tareas_responsable_idx ON public.tareas (responsable_id);
CREATE INDEX IF NOT EXISTS tareas_estado_idx      ON public.tareas (estado);

CREATE TABLE IF NOT EXISTS public.tarea_comentarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id    uuid NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  autor_id    uuid REFERENCES public.equipo(id) ON DELETE SET NULL DEFAULT public.mi_equipo_id(),
  texto       text NOT NULL CHECK (length(trim(texto)) BETWEEN 1 AND 5000),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tarea_comentarios_tarea_idx ON public.tarea_comentarios (tarea_id);

CREATE TABLE IF NOT EXISTS public.tarea_historial (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tarea_id    uuid NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  accion      text NOT NULL,
  campo       text,
  antes       text,
  despues     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tarea_historial_tarea_idx ON public.tarea_historial (tarea_id);

CREATE TABLE IF NOT EXISTS public.avisos_whatsapp (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id      uuid NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  equipo_id     uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  telefono      text,
  tipo          text NOT NULL CHECK (tipo IN ('asignada', 'reasignada')),
  estado        text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'error', 'omitido')),
  detalle       text,
  request_id    bigint,
  created_at    timestamptz NOT NULL DEFAULT now(),
  procesado_at  timestamptz
);
CREATE INDEX IF NOT EXISTS avisos_whatsapp_tarea_idx     ON public.avisos_whatsapp (tarea_id);
CREATE INDEX IF NOT EXISTS avisos_whatsapp_pendiente_idx ON public.avisos_whatsapp (estado) WHERE estado = 'pendiente';

COMMENT ON TABLE public.avisos_whatsapp IS
  'Registro de avisos de tareas por WhatsApp. Guarda el teléfono del destinatario: se borra a los 180 días (cron limpiar-avisos-tareas).';

-- ─── Triggers de tareas ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tareas_antes_de_guardar()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;
  IF NEW.estado = 'completada' AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM 'completada') THEN
    NEW.completada_at := coalesce(NEW.completada_at, now());
  ELSIF NEW.estado <> 'completada' THEN
    NEW.completada_at := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tareas_antes_de_guardar ON public.tareas;
CREATE TRIGGER tareas_antes_de_guardar
  BEFORE INSERT OR UPDATE ON public.tareas
  FOR EACH ROW EXECUTE FUNCTION public.tareas_antes_de_guardar();

CREATE OR REPLACE FUNCTION public.tareas_registrar_historial()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := public.mi_equipo_id();
  campo text;
  antes text;
  despues text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.tarea_historial (tarea_id, actor_id, accion)
    VALUES (NEW.id, coalesce(actor, NEW.creado_por), 'creada');
    RETURN NEW;
  END IF;

  FOREACH campo IN ARRAY ARRAY['titulo', 'estado', 'prioridad', 'responsable_id', 'fecha_limite', 'proyecto_id'] LOOP
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', campo, campo) INTO antes, despues USING OLD, NEW;
    IF antes IS DISTINCT FROM despues THEN
      INSERT INTO public.tarea_historial (tarea_id, actor_id, accion, campo, antes, despues)
      VALUES (NEW.id, actor, 'cambio', campo, antes, despues);
    END IF;
  END LOOP;
  IF OLD.descripcion IS DISTINCT FROM NEW.descripcion THEN
    INSERT INTO public.tarea_historial (tarea_id, actor_id, accion, campo)
    VALUES (NEW.id, actor, 'cambio', 'descripcion');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tareas_registrar_historial ON public.tareas;
CREATE TRIGGER tareas_registrar_historial
  AFTER INSERT OR UPDATE ON public.tareas
  FOR EACH ROW EXECUTE FUNCTION public.tareas_registrar_historial();

-- ─── Avisos por WhatsApp ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.encolar_aviso_tarea(p_tarea uuid, p_tipo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t           record;
  url         text;
  secreto     text;
  req_id      bigint;
  aviso_id    uuid;
  detalle     text;
BEGIN
  SELECT ta.id, ta.numero, ta.titulo, ta.prioridad, ta.fecha_limite,
         p.nombre AS proyecto, e.id AS equipo_id, e.nombre, e.whatsapp
    INTO t
    FROM public.tareas ta
    JOIN public.proyectos p ON p.id = ta.proyecto_id
    LEFT JOIN public.equipo e ON e.id = ta.responsable_id AND e.activo
   WHERE ta.id = p_tarea;

  IF t.equipo_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF t.whatsapp IS NULL THEN
    INSERT INTO public.avisos_whatsapp (tarea_id, equipo_id, tipo, estado, detalle, procesado_at)
    VALUES (p_tarea, t.equipo_id, p_tipo, 'omitido', 'El responsable no tiene WhatsApp registrado en Equipo.', now())
    RETURNING id INTO aviso_id;
    RETURN aviso_id;
  END IF;

  SELECT decrypted_secret INTO url     FROM vault.decrypted_secrets WHERE name = 'avisos_tareas_url';
  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'avisos_tareas_secret';
  IF url IS NULL OR secreto IS NULL THEN
    INSERT INTO public.avisos_whatsapp (tarea_id, equipo_id, telefono, tipo, estado, detalle, procesado_at)
    VALUES (p_tarea, t.equipo_id, t.whatsapp, p_tipo, 'error',
            'Faltan los secretos avisos_tareas_url / avisos_tareas_secret en Vault.', now())
    RETURNING id INTO aviso_id;
    RETURN aviso_id;
  END IF;

  detalle := 'Prioridad ' || t.prioridad
          || CASE WHEN t.fecha_limite IS NOT NULL
                  THEN ' · vence el ' || to_char(t.fecha_limite, 'DD-MM-YYYY')
                  ELSE ' · sin fecha límite' END;

  SELECT net.http_post(
    url     := url,
    body    := jsonb_build_object(
                 'to', t.whatsapp,
                 'nombre', split_part(t.nombre, ' ', 1),
                 'titulo', '#' || t.numero || ' ' || t.titulo,
                 'proyecto', t.proyecto,
                 'detalle', detalle,
                 'enlace', 'https://www.nexcommit.com/admin?tab=tareas&tarea=' || t.numero,
                 'tipo', p_tipo),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secreto),
    timeout_milliseconds := 15000
  ) INTO req_id;

  INSERT INTO public.avisos_whatsapp (tarea_id, equipo_id, telefono, tipo, estado, request_id)
  VALUES (p_tarea, t.equipo_id, t.whatsapp, p_tipo, 'pendiente', req_id)
  RETURNING id INTO aviso_id;
  RETURN aviso_id;
END $$;

-- Al crear o reasignar: aviso solo al responsable, y no si se lo asignó uno
-- mismo. Las importaciones masivas hacen `SET LOCAL app.sin_avisos = 'on'`.
CREATE OR REPLACE FUNCTION public.tareas_avisar_responsable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := coalesce(public.mi_equipo_id(), NEW.creado_por);
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
    PERFORM public.encolar_aviso_tarea(NEW.id, 'asignada');
  ELSIF OLD.responsable_id IS DISTINCT FROM NEW.responsable_id THEN
    PERFORM public.encolar_aviso_tarea(NEW.id, 'reasignada');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tareas_avisar_responsable ON public.tareas;
CREATE TRIGGER tareas_avisar_responsable
  AFTER INSERT OR UPDATE OF responsable_id ON public.tareas
  FOR EACH ROW EXECUTE FUNCTION public.tareas_avisar_responsable();

-- Lee las respuestas de pg_net y deja cada aviso en enviado / error.
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
    SELECT av.id, av.created_at, r.status_code, r.content, r.error_msg, r.timed_out
      FROM public.avisos_whatsapp av
      LEFT JOIN net._http_response r ON r.id = av.request_id
     WHERE av.estado = 'pendiente'
  LOOP
    IF a.status_code BETWEEN 200 AND 299 THEN
      UPDATE public.avisos_whatsapp
         SET estado = 'enviado',
             detalle = CASE WHEN a.content ~ '"via"\s*:\s*"texto"'
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

-- Botón "Reenviar aviso" del panel.
CREATE OR REPLACE FUNCTION public.reenviar_aviso_tarea(p_tarea uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_equipo() THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;
  RETURN public.encolar_aviso_tarea(p_tarea, 'asignada');
END $$;

REVOKE ALL ON FUNCTION public.encolar_aviso_tarea(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.procesar_avisos_whatsapp() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reenviar_aviso_tarea(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.procesar_avisos_whatsapp() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reenviar_aviso_tarea(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_equipo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mi_equipo_id() TO authenticated;

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.equipo            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarea_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarea_historial   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_whatsapp   ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.equipo, public.proyectos, public.tareas, public.tarea_comentarios,
              public.tarea_historial, public.avisos_whatsapp FROM anon;

DROP POLICY IF EXISTS equipo_leer      ON public.equipo;
DROP POLICY IF EXISTS equipo_gestionar ON public.equipo;
CREATE POLICY equipo_leer      ON public.equipo FOR SELECT TO authenticated USING (public.es_equipo());
CREATE POLICY equipo_gestionar ON public.equipo FOR ALL    TO authenticated USING (public.es_dueno()) WITH CHECK (public.es_dueno());

DROP POLICY IF EXISTS proyectos_equipo ON public.proyectos;
CREATE POLICY proyectos_equipo ON public.proyectos FOR ALL TO authenticated
  USING (public.es_equipo()) WITH CHECK (public.es_equipo());

DROP POLICY IF EXISTS tareas_equipo ON public.tareas;
CREATE POLICY tareas_equipo ON public.tareas FOR ALL TO authenticated
  USING (public.es_equipo()) WITH CHECK (public.es_equipo());

DROP POLICY IF EXISTS comentarios_leer    ON public.tarea_comentarios;
DROP POLICY IF EXISTS comentarios_crear   ON public.tarea_comentarios;
DROP POLICY IF EXISTS comentarios_borrar  ON public.tarea_comentarios;
CREATE POLICY comentarios_leer   ON public.tarea_comentarios FOR SELECT TO authenticated USING (public.es_equipo());
CREATE POLICY comentarios_crear  ON public.tarea_comentarios FOR INSERT TO authenticated
  WITH CHECK (public.es_equipo() AND autor_id = public.mi_equipo_id());
CREATE POLICY comentarios_borrar ON public.tarea_comentarios FOR DELETE TO authenticated
  USING (autor_id = public.mi_equipo_id());

DROP POLICY IF EXISTS historial_leer ON public.tarea_historial;
CREATE POLICY historial_leer ON public.tarea_historial FOR SELECT TO authenticated USING (public.es_equipo());

DROP POLICY IF EXISTS avisos_leer ON public.avisos_whatsapp;
CREATE POLICY avisos_leer ON public.avisos_whatsapp FOR SELECT TO authenticated USING (public.es_equipo());

-- ─── Realtime (el tablero se actualiza solo) ───────────────────────────────
DO $$
DECLARE tabla text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tabla IN ARRAY ARRAY['tareas', 'tarea_comentarios', 'avisos_whatsapp'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tabla) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tabla);
      END IF;
    END LOOP;
  END IF;
END $$;

-- ─── Crons ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job
   WHERE jobname IN ('procesar-avisos-tareas', 'limpiar-avisos-tareas');
  PERFORM cron.schedule('procesar-avisos-tareas', '* * * * *', 'SELECT public.procesar_avisos_whatsapp()');
  PERFORM cron.schedule('limpiar-avisos-tareas', '17 4 * * *',
    $q$DELETE FROM public.avisos_whatsapp WHERE created_at < now() - interval '180 days'$q$);
END $$;

-- ─── Datos iniciales ───────────────────────────────────────────────────────
INSERT INTO public.equipo (nombre, email, rol) VALUES
  ('Fabián Tobar',        'fabianignacio.tm@gmail.com', 'dueno'),
  ('Juan Pablo Pizarro',  'jpa.pizarro@gmail.com',      'dueno'),
  ('Stephania Bilbao',    'stephaniabilbao@gmail.com',  'dueno')
ON CONFLICT ((lower(email))) DO NOTHING;

INSERT INTO public.proyectos (nombre, descripcion, color, es_interno) VALUES
  ('NexCommit', 'Tareas internas de NexCommit (web, marketing, administración).', '#67c8f3', true)
ON CONFLICT ((lower(nombre))) DO NOTHING;

-- ─── Registro de la migración ──────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261007120000', 'sistema_tareas')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
