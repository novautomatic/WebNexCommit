-- ============================================================================
-- Creador de páginas con IA (nexcommit.com/crea-tu-web → nexcommit.com/<slug>)
--
-- Un lead se registra (nombre, empresa, correo, celular), verifica su correo
-- con un código y genera UNA página simple que vive N días (creador_config).
-- Todo lo escribe el backend de Agente-Next con service_role; el panel solo lee
-- y ajusta config/estado de leads (RLS por es_equipo()).
--
--   creador_config     fila única: duración, topes, responsable de ventas
--   creador_leads      quién se registró (datos personales, Ley 21.719)
--   creador_codigos    códigos de verificación por correo (hash, 10 min)
--   creador_sesiones   sesiones del creador (hash del token, 24 h)
--   creador_paginas    la página: slug, contenido JSON, vencimiento
--   creador_mensajes   chat de edición + tokens consumidos
--   creador_contactos  mensajes que dejan las visitas en la página del cliente
--
-- "Una sola página por correo/celular": email_hash y telefono_hash únicos. Al
-- anonimizar un lead se borran el correo y el teléfono, pero el hash queda para
-- que no pueda repetir la promoción (finalidad declarada en la política).
--
-- Al publicarse una página se crea una tarea en el área "Ventas – Creador web",
-- asignada al responsable de creador_config; eso dispara el aviso de WhatsApp
-- que ya existe en el sistema de tareas.
--
-- Retención (pg_cron, diario):
--   - códigos y sesiones vencidos: se borran
--   - mensajes de contacto: 30 días
--   - páginas: se borran 30 días después de vencer (libera el slug)
--   - leads sin verificar y sin página: 7 días
--   - leads: se anonimizan a los 12 meses, salvo estado 'convertido'
--
-- Idempotente.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── Config ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.creador_config (
  id                 int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  activo             boolean NOT NULL DEFAULT true,
  duracion_dias      int NOT NULL DEFAULT 5 CHECK (duracion_dias BETWEEN 1 AND 60),
  tope_diario        int NOT NULL DEFAULT 30 CHECK (tope_diario BETWEEN 0 AND 1000),
  ediciones          int NOT NULL DEFAULT 5 CHECK (ediciones BETWEEN 0 AND 50),
  max_caracteres     int NOT NULL DEFAULT 300 CHECK (max_caracteres BETWEEN 50 AND 2000),
  responsable_id     uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  aviso_tope_fecha   date,
  updated_at         timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.creador_config IS
  'Configuración del Creador de páginas. activo=false cierra el registro de páginas nuevas.';

INSERT INTO public.creador_config (id, responsable_id)
SELECT 1, (SELECT id FROM public.equipo WHERE lower(email) = 'fabianignacio.tm@gmail.com' LIMIT 1)
ON CONFLICT (id) DO NOTHING;

-- ─── Leads ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.creador_leads (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre             text,
  empresa            text NOT NULL,
  email              text,
  telefono           text CHECK (telefono IS NULL OR telefono ~ '^[0-9]{8,15}$'),
  email_hash         text NOT NULL UNIQUE,
  telefono_hash      text NOT NULL UNIQUE,
  acepta_terminos_at timestamptz NOT NULL DEFAULT now(),
  acepta_marketing   boolean NOT NULL DEFAULT false,
  verificado_at      timestamptz,
  estado             text NOT NULL DEFAULT 'registrado'
                     CHECK (estado IN ('registrado', 'verificado', 'con_pagina', 'contactado', 'convertido', 'descartado')),
  notas              text,
  ip_hash            text,
  anonimizado_at     timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creador_leads_email_idx ON public.creador_leads (lower(email));
COMMENT ON TABLE public.creador_leads IS
  'Leads del Creador de páginas. Datos personales (Ley 21.719). Base: ejecución del servicio (página de prueba); marketing solo con acepta_marketing. Se anonimizan a los 12 meses salvo convertidos.';

-- ─── Códigos y sesiones ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.creador_codigos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid NOT NULL REFERENCES public.creador_leads(id) ON DELETE CASCADE,
  codigo_hash  text NOT NULL,
  intentos     int NOT NULL DEFAULT 0,
  usado_at     timestamptz,
  expira_at    timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creador_codigos_lead_idx ON public.creador_codigos (lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.creador_sesiones (
  token_hash  text PRIMARY KEY,
  lead_id     uuid NOT NULL REFERENCES public.creador_leads(id) ON DELETE CASCADE,
  expira_at   timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Páginas ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.creador_paginas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          uuid NOT NULL UNIQUE REFERENCES public.creador_leads(id) ON DELETE CASCADE,
  slug             text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  contenido        jsonb NOT NULL,
  logo_url         text,
  ediciones_usadas int NOT NULL DEFAULT 0,
  ediciones_max    int NOT NULL DEFAULT 5,
  estado           text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'suspendida')),
  visitas          int NOT NULL DEFAULT 0,
  publicada_at     timestamptz NOT NULL DEFAULT now(),
  expira_at        timestamptz NOT NULL,
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creador_paginas_expira_idx ON public.creador_paginas (expira_at);
COMMENT ON TABLE public.creador_paginas IS
  'Páginas del Creador. Vencida = expira_at < now() (se sirve una página de "venció"). Se borran 30 días después de vencer y el slug queda libre.';

CREATE TABLE IF NOT EXISTS public.creador_mensajes (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pagina_id   uuid REFERENCES public.creador_paginas(id) ON DELETE CASCADE,
  lead_id     uuid NOT NULL REFERENCES public.creador_leads(id) ON DELETE CASCADE,
  rol         text NOT NULL CHECK (rol IN ('usuario', 'asistente')),
  tipo        text NOT NULL DEFAULT 'edicion' CHECK (tipo IN ('generacion', 'edicion')),
  texto       text NOT NULL,
  tokens_in   int,
  tokens_out  int,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creador_mensajes_lead_idx ON public.creador_mensajes (lead_id, created_at);

CREATE TABLE IF NOT EXISTS public.creador_contactos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pagina_id   uuid NOT NULL REFERENCES public.creador_paginas(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  email       text,
  telefono    text,
  mensaje     text NOT NULL,
  ip_hash     text,
  enviado     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creador_contactos_pagina_idx ON public.creador_contactos (pagina_id, created_at DESC);
COMMENT ON TABLE public.creador_contactos IS
  'Mensajes de visitas a páginas del Creador. NexCommit es encargado del tratamiento por cuenta del cliente: se reenvían por correo y se borran a los 30 días.';

-- ─── updated_at ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.creador_tocar_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS creador_leads_updated ON public.creador_leads;
CREATE TRIGGER creador_leads_updated BEFORE UPDATE ON public.creador_leads
  FOR EACH ROW EXECUTE FUNCTION public.creador_tocar_updated_at();
DROP TRIGGER IF EXISTS creador_paginas_updated ON public.creador_paginas;
CREATE TRIGGER creador_paginas_updated BEFORE UPDATE ON public.creador_paginas
  FOR EACH ROW EXECUTE FUNCTION public.creador_tocar_updated_at();
DROP TRIGGER IF EXISTS creador_config_updated ON public.creador_config;
CREATE TRIGGER creador_config_updated BEFORE UPDATE ON public.creador_config
  FOR EACH ROW EXECUTE FUNCTION public.creador_tocar_updated_at();

-- ─── Área de ventas + tarea por cada página publicada ──────────────────────
INSERT INTO public.proyectos (nombre, descripcion, color, tipo, area_responsable_id)
SELECT 'Ventas – Creador web',
       'Leads que crearon su página de prueba en nexcommit.com/crea-tu-web. Contactar antes de que venza.',
       '#22d3ee', 'area', c.responsable_id
  FROM public.creador_config c WHERE c.id = 1
ON CONFLICT ((lower(nombre))) DO NOTHING;

CREATE OR REPLACE FUNCTION public.creador_tarea_por_pagina()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l      public.creador_leads;
  area   public.proyectos;
  resp   uuid;
BEGIN
  SELECT * INTO l FROM public.creador_leads WHERE id = NEW.lead_id;
  SELECT * INTO area FROM public.proyectos WHERE lower(nombre) = lower('Ventas – Creador web') AND tipo = 'area';
  IF area.id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT coalesce(c.responsable_id, area.area_responsable_id) INTO resp FROM public.creador_config c WHERE c.id = 1;

  INSERT INTO public.tareas (proyecto_id, titulo, descripcion, estado, prioridad, responsable_id, creado_por,
                             fecha_limite, etiquetas, sync_estado)
  VALUES (
    area.id,
    left('Lead Creador: ' || l.empresa, 200),
    concat_ws(E'\n',
      'Creó su página de prueba con el Creador.',
      '',
      'Empresa: ' || l.empresa,
      'Nombre: ' || coalesce(l.nombre, '—'),
      'Correo: ' || coalesce(l.email, '—'),
      'WhatsApp: ' || coalesce('+' || l.telefono, '—'),
      'Acepta ofertas: ' || CASE WHEN l.acepta_marketing THEN 'sí' ELSE 'no (solo contactar por su página)' END,
      '',
      'Página: https://www.nexcommit.com/' || NEW.slug,
      'Vence: ' || to_char(NEW.expira_at AT TIME ZONE 'America/Santiago', 'DD-MM-YYYY HH24:MI'),
      '',
      'Objetivo: ofrecerle dejarla permanente antes de que venza.'),
    'pendiente', 'alta', resp, NULL,
    (NEW.publicada_at AT TIME ZONE 'America/Santiago')::date + 1,
    ARRAY['creador', 'lead'], 'ok');

  UPDATE public.creador_leads SET estado = 'con_pagina' WHERE id = NEW.lead_id AND estado IN ('registrado', 'verificado');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS creador_tarea_por_pagina ON public.creador_paginas;
CREATE TRIGGER creador_tarea_por_pagina AFTER INSERT ON public.creador_paginas
  FOR EACH ROW EXECUTE FUNCTION public.creador_tarea_por_pagina();

-- ─── Cupo diario (lo consulta el backend antes de generar) ─────────────────
CREATE OR REPLACE FUNCTION public.creador_paginas_hoy()
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.creador_paginas
   WHERE publicada_at >= (date_trunc('day', now() AT TIME ZONE 'America/Santiago') AT TIME ZONE 'America/Santiago')
$$;

-- Suma una visita sin pasar por el panel (lo llama el backend al servir la página).
CREATE OR REPLACE FUNCTION public.creador_sumar_visita(p_pagina uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.creador_paginas SET visitas = visitas + 1 WHERE id = p_pagina
$$;

REVOKE ALL ON FUNCTION public.creador_paginas_hoy() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.creador_sumar_visita(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creador_paginas_hoy() TO service_role;
GRANT EXECUTE ON FUNCTION public.creador_sumar_visita(uuid) TO service_role;

-- ─── Retención ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.creador_retencion()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.creador_codigos  WHERE expira_at < now() - interval '1 day';
  DELETE FROM public.creador_sesiones WHERE expira_at < now();
  DELETE FROM public.creador_contactos WHERE created_at < now() - interval '30 days';
  DELETE FROM public.creador_paginas  WHERE expira_at < now() - interval '30 days';
  DELETE FROM public.creador_leads
   WHERE verificado_at IS NULL AND created_at < now() - interval '7 days'
     AND NOT EXISTS (SELECT 1 FROM public.creador_paginas p WHERE p.lead_id = creador_leads.id);
  UPDATE public.creador_leads
     SET nombre = NULL, email = NULL, telefono = NULL, ip_hash = NULL, notas = NULL,
         acepta_marketing = false, anonimizado_at = now()
   WHERE anonimizado_at IS NULL AND estado <> 'convertido'
     AND created_at < now() - interval '12 months';
END $$;
REVOKE ALL ON FUNCTION public.creador_retencion() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('creador-retencion') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'creador-retencion');
  PERFORM cron.schedule('creador-retencion', '23 4 * * *', 'SELECT public.creador_retencion()');
END $$;

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.creador_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creador_leads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creador_codigos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creador_sesiones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creador_paginas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creador_mensajes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creador_contactos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.creador_config, public.creador_leads, public.creador_codigos, public.creador_sesiones,
              public.creador_paginas, public.creador_mensajes, public.creador_contactos FROM anon;
-- Códigos, sesiones y mensajes de contacto (datos de terceros) no los ve nadie del panel.
REVOKE ALL ON public.creador_codigos, public.creador_sesiones, public.creador_contactos FROM authenticated;

DROP POLICY IF EXISTS creador_config_leer ON public.creador_config;
CREATE POLICY creador_config_leer ON public.creador_config FOR SELECT TO authenticated USING (public.es_equipo());
DROP POLICY IF EXISTS creador_config_editar ON public.creador_config;
CREATE POLICY creador_config_editar ON public.creador_config FOR UPDATE TO authenticated
  USING (public.es_equipo()) WITH CHECK (public.es_equipo());

DROP POLICY IF EXISTS creador_leads_leer ON public.creador_leads;
CREATE POLICY creador_leads_leer ON public.creador_leads FOR SELECT TO authenticated USING (public.es_equipo());
DROP POLICY IF EXISTS creador_leads_editar ON public.creador_leads;
CREATE POLICY creador_leads_editar ON public.creador_leads FOR UPDATE TO authenticated
  USING (public.es_equipo()) WITH CHECK (public.es_equipo());

DROP POLICY IF EXISTS creador_paginas_leer ON public.creador_paginas;
CREATE POLICY creador_paginas_leer ON public.creador_paginas FOR SELECT TO authenticated USING (public.es_equipo());
DROP POLICY IF EXISTS creador_paginas_editar ON public.creador_paginas;
CREATE POLICY creador_paginas_editar ON public.creador_paginas FOR UPDATE TO authenticated
  USING (public.es_equipo()) WITH CHECK (public.es_equipo());

DROP POLICY IF EXISTS creador_mensajes_leer ON public.creador_mensajes;
CREATE POLICY creador_mensajes_leer ON public.creador_mensajes FOR SELECT TO authenticated USING (public.es_equipo());

-- El panel solo cambia estos campos (el resto lo escribe el backend).
REVOKE UPDATE ON public.creador_leads FROM authenticated;
GRANT UPDATE (estado, notas) ON public.creador_leads TO authenticated;
REVOKE UPDATE ON public.creador_paginas FROM authenticated;
GRANT UPDATE (estado, expira_at) ON public.creador_paginas TO authenticated;
REVOKE UPDATE ON public.creador_config FROM authenticated;
GRANT UPDATE (activo, duracion_dias, tope_diario, ediciones, max_caracteres, responsable_id) ON public.creador_config TO authenticated;

-- ─── Storage: logos (públicos, máx. 500 KB, sin SVG) ───────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('creador-logos', 'creador-logos', true, 512000, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = true, file_size_limit = 512000, allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261009120000', 'creador_paginas')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
