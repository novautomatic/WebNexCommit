-- ============================================================================
-- Formulario «Cotiza en 1 minuto» de nexcommit.com (home, /precios, servicios,
-- landings de Ads y blog).
--
-- Lo escribe SOLO el back de Agente-Next (POST /nexcommit/contacto, service
-- role, con captcha). El panel (/admin?tab=contactos) lee y cambia estado/notas.
--
-- Ley 21.719: datos personales. Base = medidas precontractuales pedidas por el
-- titular (cotizar). Sin marketing. Conservación: 12 meses desde la solicitud,
-- salvo las que terminan en venta ('ganado'), que pasan a ser cliente.
--
-- Idempotente.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS public.contactos_web (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  email       text NOT NULL,
  telefono    text CHECK (telefono IS NULL OR telefono ~ '^[0-9]{8,15}$'),
  servicio    text NOT NULL DEFAULT 'otro',
  mensaje     text,
  pagina      text,
  desde_ads   boolean NOT NULL DEFAULT false,
  estado      text NOT NULL DEFAULT 'nuevo'
              CHECK (estado IN ('nuevo', 'contactado', 'cotizado', 'ganado', 'perdido', 'descartado')),
  notas       text,
  ip_hash     text,
  avisado     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contactos_web_fecha_idx ON public.contactos_web (created_at DESC);
COMMENT ON TABLE public.contactos_web IS
  'Solicitudes de cotización del formulario de nexcommit.com. Datos personales (Ley 21.719): base precontractual, sin marketing; se borran a los 12 meses salvo estado ganado.';

CREATE OR REPLACE FUNCTION public.contactos_web_tocar()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS contactos_web_updated ON public.contactos_web;
CREATE TRIGGER contactos_web_updated BEFORE UPDATE ON public.contactos_web
  FOR EACH ROW EXECUTE FUNCTION public.contactos_web_tocar();

-- ─── Permisos: el equipo lee y cambia estado/notas; nadie más ──────────────
ALTER TABLE public.contactos_web ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contactos_web FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.contactos_web TO authenticated;
GRANT UPDATE (estado, notas) ON public.contactos_web TO authenticated;
GRANT ALL ON public.contactos_web TO service_role;

DROP POLICY IF EXISTS contactos_web_leer ON public.contactos_web;
CREATE POLICY contactos_web_leer ON public.contactos_web FOR SELECT TO authenticated
  USING (coalesce(public.es_equipo(), false));
DROP POLICY IF EXISTS contactos_web_editar ON public.contactos_web;
CREATE POLICY contactos_web_editar ON public.contactos_web FOR UPDATE TO authenticated
  USING (coalesce(public.es_equipo(), false)) WITH CHECK (coalesce(public.es_equipo(), false));

-- ─── Retención (Ley 21.719: plazo con algo que lo aplique) ─────────────────
CREATE OR REPLACE FUNCTION public.contactos_web_retencion()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.contactos_web
   WHERE estado <> 'ganado' AND created_at < now() - interval '12 months';
END $$;
REVOKE ALL ON FUNCTION public.contactos_web_retencion() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('contactos-web-retencion')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'contactos-web-retencion');
  PERFORM cron.schedule('contactos-web-retencion', '35 4 * * *', 'SELECT public.contactos_web_retencion()');
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261021120000', 'contactos_web')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Verificación:
--   SELECT relrowsecurity FROM pg_class WHERE oid = 'public.contactos_web'::regclass;  -- true
--   SELECT has_table_privilege('anon', 'public.contactos_web', 'SELECT');               -- false
--   SELECT jobname, schedule FROM cron.job WHERE jobname = 'contactos-web-retencion';
