-- Cotizaciones conversadas con Claude (parte 1 de 3: tablas, RLS y bucket).
--
-- Una cotización nace conversando con Claude, por el conector MCP de NexCommit
-- (claude.ai) o por el panel (/admin?tab=cotizaciones). Claude guarda la propuesta
-- como JSON estructurado (`datos`) y el back de Agente-Next (novautomatic/back_chat_next,
-- src/cotizaciones/) arma el PDF y lo sube al bucket privado `cotizaciones`.
--
-- El equipo LEE las tablas (RLS es_equipo()) y ESCRIBE solo por las funciones
-- cotizacion_* de las partes 2 y 3. Este repo es público: el contenido real (clientes,
-- precios acordados, notas internas) vive en estas tablas, nunca en git.
-- Idempotente: se puede correr de nuevo sin romper nada.

CREATE TABLE IF NOT EXISTS public.cotizaciones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero            text NOT NULL UNIQUE,                 -- NC-AAAA-MMDD (+ -2, -3… si hay más ese día)
  titulo            text NOT NULL,
  cliente_nombre    text NOT NULL,
  cliente_id        uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  estado            text NOT NULL DEFAULT 'borrador'
                    CHECK (estado IN ('borrador', 'enviada', 'aceptada', 'rechazada', 'vencida')),
  datos             jsonb NOT NULL,                       -- la propuesta completa (esquema en el back)
  total_unico       numeric,                              -- neto, para listar y comparar
  total_mensual     numeric,
  conversacion      jsonb NOT NULL DEFAULT '[]'::jsonb,   -- chat del panel (mensajes de la API de Claude)
  version           integer NOT NULL DEFAULT 1,
  pdf_path          text,                                 -- último PDF generado (bucket cotizaciones)
  pdf_generado_at   timestamptz,
  origen            text NOT NULL DEFAULT 'panel' CHECK (origen IN ('mcp', 'panel', 'historica')),
  creado_por        uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  actualizado_por   uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cotizaciones_fecha_idx ON public.cotizaciones (created_at DESC);
CREATE INDEX IF NOT EXISTS cotizaciones_cliente_idx ON public.cotizaciones (cliente_id) WHERE cliente_id IS NOT NULL;

COMMENT ON TABLE public.cotizaciones IS
  'Propuestas comerciales de NexCommit armadas conversando con Claude (MCP o panel). El PDF lo genera el back de Agente-Next.';

-- Configuración única: lo que Claude debe saber y no está en el código del back
-- (reglas de precio internas, descuentos, aprendizajes). Lo editan los dueños.
CREATE TABLE IF NOT EXISTS public.cotizaciones_config (
  id            boolean PRIMARY KEY DEFAULT true CHECK (id),
  notas         text NOT NULL DEFAULT '',
  actualizado_por uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.cotizaciones_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- ─── RLS: el equipo lee; nadie escribe directo ─────────────────────────────
ALTER TABLE public.cotizaciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cotizaciones, public.cotizaciones_config FROM anon, authenticated;
GRANT SELECT ON public.cotizaciones, public.cotizaciones_config TO authenticated;

DROP POLICY IF EXISTS cotizaciones_equipo ON public.cotizaciones;
CREATE POLICY cotizaciones_equipo ON public.cotizaciones FOR SELECT TO authenticated
  USING (coalesce(public.es_equipo(), false));
DROP POLICY IF EXISTS cotizaciones_config_equipo ON public.cotizaciones_config;
CREATE POLICY cotizaciones_config_equipo ON public.cotizaciones_config FOR SELECT TO authenticated
  USING (coalesce(public.es_equipo(), false));

-- ─── Bucket privado de los PDF: <cotizacion_id>/<numero>-v<version>-<hora>.pdf ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cotizaciones', 'cotizaciones', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760, allowed_mime_types = ARRAY['application/pdf'];

DROP POLICY IF EXISTS cotizaciones_pdf_leer ON storage.objects;
CREATE POLICY cotizaciones_pdf_leer ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cotizaciones' AND coalesce(public.es_equipo(), false));
DROP POLICY IF EXISTS cotizaciones_pdf_subir ON storage.objects;
CREATE POLICY cotizaciones_pdf_subir ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cotizaciones' AND coalesce(public.es_equipo(), false));
DROP POLICY IF EXISTS cotizaciones_pdf_borrar ON storage.objects;
CREATE POLICY cotizaciones_pdf_borrar ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cotizaciones' AND coalesce(public.es_dueno(), false));

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261113150100', 'cotizaciones_1_tablas') ON CONFLICT DO NOTHING;
  END IF;
END $$;
