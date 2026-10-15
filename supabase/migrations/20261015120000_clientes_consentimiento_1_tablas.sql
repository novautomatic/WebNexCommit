-- ============================================================================
-- Consentimiento de clientes (parte 1/6): columnas y registros.
--
-- Regla: a un cliente solo se le mandan correos de contacto y promociones si
-- él mismo lo aceptó (Ley 21.719). Hay dos formas de aceptar:
--   web     entró por nexcommit.com (Creador) aceptando términos; al pasar el
--           lead a 'convertido' se crea el cliente con esa aceptación (parte 4)
--   correo  se agregó a mano y se le mandó el "primer correo": abre
--           /confirmar-datos con sus datos precargados, acepta las políticas
--           (obligatorio) y, si quiere, las promociones (opcional)
-- El panel NO puede marcar consentimiento a mano: solo puede retirarlo (por
-- ejemplo si el cliente lo pide por teléfono). Todo queda en
-- cliente_consentimientos como prueba.
--
-- Partes (correr en orden; cada una < 8.000 caracteres para el editor SQL):
--   1 tablas · 2 enlace firmado y candado · 3 landing pública ·
--   4 clientes desde la web · 5 envíos · 6 resultado de envíos y crons.
-- Idempotente. Requiere 20261007170000 y 20261009120000.
-- ============================================================================

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS acepta_politicas_at   timestamptz;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS acepta_marketing      boolean NOT NULL DEFAULT false;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS acepta_marketing_at   timestamptz;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS consentimiento_origen text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS lead_id               uuid REFERENCES public.creador_leads(id) ON DELETE SET NULL;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS token_version         integer NOT NULL DEFAULT 1;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS invitacion_enviada_at timestamptz;

ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_consentimiento_origen_check;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_consentimiento_origen_check
  CHECK (consentimiento_origen IN ('web', 'correo'));
CREATE UNIQUE INDEX IF NOT EXISTS clientes_lead_unico ON public.clientes (lead_id) WHERE lead_id IS NOT NULL;

-- ─── Prueba del consentimiento ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cliente_consentimientos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  accion     text NOT NULL CHECK (accion IN ('acepta_politicas', 'acepta_marketing', 'retira_marketing', 'rectifica_datos')),
  origen     text NOT NULL CHECK (origen IN ('web', 'correo', 'panel')),
  detalle    text,
  ip_hash    text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cliente_consentimientos_cliente_idx ON public.cliente_consentimientos (cliente_id, created_at DESC);
COMMENT ON TABLE public.cliente_consentimientos IS
  'Prueba de cada aceptación/retiro de un cliente (quién, qué, cuándo, desde dónde). IP solo como hash. Se borra con el cliente.';

-- ─── Correos enviados a clientes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campanas_correo (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asunto        text NOT NULL,
  cuerpo        text NOT NULL,
  enviado_por   uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  destinatarios integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cliente_correos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  campana_id   uuid REFERENCES public.campanas_correo(id) ON DELETE SET NULL,
  tipo         text NOT NULL CHECK (tipo IN ('invitacion', 'campana')),
  email        text,
  estado       text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'error')),
  detalle      text,
  request_id   bigint,
  enviado_por  uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  procesado_at timestamptz
);
CREATE INDEX IF NOT EXISTS cliente_correos_cliente_idx ON public.cliente_correos (cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cliente_correos_pendiente_idx ON public.cliente_correos (created_at) WHERE estado = 'pendiente';
COMMENT ON TABLE public.cliente_correos IS
  'Registro de correos a clientes (primer correo y campañas). Guarda el correo del destinatario: se borra a los 180 días (cron limpiar-correos-clientes).';

ALTER TABLE public.cliente_consentimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanas_correo         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_correos         ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cliente_consentimientos, public.campanas_correo, public.cliente_correos FROM anon, authenticated;
GRANT SELECT ON public.cliente_consentimientos, public.campanas_correo, public.cliente_correos TO authenticated;

DROP POLICY IF EXISTS cliente_consentimientos_equipo ON public.cliente_consentimientos;
CREATE POLICY cliente_consentimientos_equipo ON public.cliente_consentimientos FOR SELECT TO authenticated USING (public.es_equipo());
DROP POLICY IF EXISTS campanas_correo_equipo ON public.campanas_correo;
CREATE POLICY campanas_correo_equipo ON public.campanas_correo FOR SELECT TO authenticated USING (public.es_equipo());
DROP POLICY IF EXISTS cliente_correos_equipo ON public.cliente_correos;
CREATE POLICY cliente_correos_equipo ON public.cliente_correos FOR SELECT TO authenticated USING (public.es_equipo());

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261015120000', 'clientes_consentimiento_1_tablas')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
