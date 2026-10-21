-- ============================================================================
-- Reseñas de clientes (parte 1/5): tablas.
--
-- Flujo: el equipo manda desde el panel (pestaña Reseñas) una solicitud a una
-- persona de un cliente (email de la ficha o un contacto del portal) → correo
-- con enlace personal a nexcommit.com/resena?s=<id>&t=<token> (vence a los 30
-- días, 1 recordatorio a los 5) → la persona escribe su reseña → queda
-- 'pendiente' hasta que alguien del equipo la aprueba → se muestra en la home,
-- las landings de Ads y /servicios/<servicio>. El texto NO se edita.
--
--   resena_solicitudes  cada correo pedido (quién, servicio, vencimiento, envío)
--   resenas             lo que escribió el cliente + revisión del equipo
--   resena_bloqueos     quien pidió no recibir más solicitudes (solo hash del
--                       correo: oposición, Ley 21.719 art. 8 bis)
--   resenas_config      enlace del perfil de Google (botón apagado por defecto)
--
-- Base de licitud: pedir la reseña = relación contractual vigente; publicar el
-- nombre = consentimiento (casilla sin marcar en el formulario). Sin ese
-- consentimiento se publica solo con la empresa.
--
-- Idempotente. Correr las 5 partes en orden.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resena_solicitudes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  contacto_id     uuid REFERENCES public.cliente_contactos(id) ON DELETE SET NULL,
  nombre          text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 120),
  email           text NOT NULL CHECK (email ~* '^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$'),
  cargo           text CHECK (cargo IS NULL OR length(cargo) <= 80),
  servicio        text NOT NULL CHECK (servicio ~ '^[a-z0-9-]{2,40}$'),
  servicio_frase  text NOT NULL CHECK (length(servicio_frase) BETWEEN 2 AND 80),
  estado          text NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'respondida', 'vencida', 'cancelada')),
  expira_at       timestamptz NOT NULL DEFAULT now() + interval '30 days',
  enviada_at      timestamptz,
  recordatorio_at timestamptz,
  respondida_at   timestamptz,
  envio_tipo      text CHECK (envio_tipo IN ('solicitud', 'recordatorio')),
  envio_request   bigint,
  envio_estado    text CHECK (envio_estado IN ('pendiente', 'enviado', 'error')),
  envio_detalle   text,
  enviada_por     uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resena_solicitudes_cliente_idx ON public.resena_solicitudes (cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS resena_solicitudes_pendiente_idx ON public.resena_solicitudes (enviada_at) WHERE estado = 'pendiente';
CREATE INDEX IF NOT EXISTS resena_solicitudes_envio_idx ON public.resena_solicitudes (created_at) WHERE envio_estado = 'pendiente';
COMMENT ON TABLE public.resena_solicitudes IS
  'Solicitudes de reseña enviadas a clientes. Datos personales (Ley 21.719): base = relación contractual; se borran 90 días después de cerradas.';

CREATE TABLE IF NOT EXISTS public.resenas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id    uuid UNIQUE REFERENCES public.resena_solicitudes(id) ON DELETE SET NULL,
  cliente_id      uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  servicio        text NOT NULL CHECK (servicio ~ '^[a-z0-9-]{2,40}$'),
  texto           text NOT NULL CHECK (length(trim(texto)) BETWEEN 30 AND 1200),
  nombre          text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 120),
  cargo           text CHECK (cargo IS NULL OR length(cargo) <= 80),
  empresa         text CHECK (empresa IS NULL OR length(empresa) <= 120),
  publicar_nombre boolean NOT NULL DEFAULT false,
  estado          text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  motivo          text CHECK (motivo IS NULL OR length(motivo) <= 300),
  revisada_por    uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  revisada_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resenas_publicas_idx ON public.resenas (created_at DESC) WHERE estado = 'aprobada';
COMMENT ON TABLE public.resenas IS
  'Reseñas escritas por clientes. Se publican solo aprobadas; el nombre solo con publicar_nombre (consentimiento). Retiro a pedido = borrar la fila.';

CREATE TABLE IF NOT EXISTS public.resena_bloqueos (
  email_hash  text PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.resena_bloqueos IS
  'Personas que pidieron no recibir solicitudes de reseña. Solo sha256(lower(email)).';

CREATE TABLE IF NOT EXISTS public.resenas_config (
  id            boolean PRIMARY KEY DEFAULT true CHECK (id),
  google_url    text CHECK (google_url IS NULL OR google_url ~ '^https://[a-z0-9.-]*(google\.[a-z.]+|g\.page)/'),
  google_activo boolean NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.resenas_config (id) VALUES (true) ON CONFLICT DO NOTHING;

-- El equipo LEE; todo cambio pasa por las funciones resena_* (partes 2 a 5).
ALTER TABLE public.resena_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resenas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resena_bloqueos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resenas_config     ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.resena_solicitudes, public.resenas, public.resena_bloqueos, public.resenas_config FROM anon, authenticated;
GRANT SELECT ON public.resena_solicitudes, public.resenas, public.resenas_config TO authenticated;

DROP POLICY IF EXISTS resena_solicitudes_equipo ON public.resena_solicitudes;
CREATE POLICY resena_solicitudes_equipo ON public.resena_solicitudes FOR SELECT TO authenticated USING (public.es_equipo());
DROP POLICY IF EXISTS resenas_equipo ON public.resenas;
CREATE POLICY resenas_equipo ON public.resenas FOR SELECT TO authenticated USING (public.es_equipo());
DROP POLICY IF EXISTS resenas_config_equipo ON public.resenas_config;
CREATE POLICY resenas_config_equipo ON public.resenas_config FOR SELECT TO authenticated USING (public.es_equipo());

-- Firma de los enlaces de /resena (no se copia a ningún otro lado).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'resenas_token_secret') THEN
    PERFORM vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
                                'resenas_token_secret', 'Firma de los enlaces de nexcommit.com/resena');
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261021130100', 'resenas_1_tablas')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
