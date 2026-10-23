-- ============================================================================
-- Dashboard por cliente · parte 1 de 4: webs y documentos.
--
--   clientes.sitios      direcciones de sus webs (solo el dato, para entrar).
--   clientes.sin_web     «Aún no tiene web»: el panel exige una web o esta marca.
--   cliente_documentos   archivos del cliente (contratos, cotizaciones, accesos…)
--                        en el bucket privado `clientes-documentos`, ruta
--                        <cliente_id>/<archivo>. Internos por defecto; con
--                        `visible_cliente` aparecen en su portal /mi-espacio.
--
-- El equipo lee la tabla (RLS es_equipo) y escribe solo por cliente_doc_*.
-- Idempotente. Correr las 4 partes en orden.
-- ============================================================================

-- ─── Webs ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sitios_validos(p text[])
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(array_length(p, 1), 0) <= 20
     AND NOT EXISTS (SELECT 1 FROM unnest(p) s WHERE s !~* '^https?://[^\s/$.?#][^\s]*$' OR length(s) > 300)
$$;

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS sitios  text[]  NOT NULL DEFAULT '{}';
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS sin_web boolean NOT NULL DEFAULT false;
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_sitios_check;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_sitios_check CHECK (public.sitios_validos(sitios));

-- ─── Documentos ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cliente_documentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  ruta            text NOT NULL UNIQUE,
  nombre          text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 200),
  tamano          bigint,
  tipo            text,
  visible_cliente boolean NOT NULL DEFAULT false,
  subido_por      uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cliente_documentos_cliente_idx ON public.cliente_documentos (cliente_id, created_at DESC);
COMMENT ON TABLE public.cliente_documentos IS
  'Documentos de cada cliente (bucket privado clientes-documentos). Se borran con el cliente.';

ALTER TABLE public.cliente_documentos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cliente_documentos FROM anon, authenticated;
GRANT SELECT ON public.cliente_documentos TO authenticated;
DROP POLICY IF EXISTS cliente_documentos_equipo ON public.cliente_documentos;
CREATE POLICY cliente_documentos_equipo ON public.cliente_documentos FOR SELECT TO authenticated
  USING (public.es_equipo());

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('clientes-documentos', 'clientes-documentos', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800;

-- El cliente solo puede bajar los documentos marcados como visibles de SU empresa.
CREATE OR REPLACE FUNCTION public.cliente_doc_puede_leer(p_ruta text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.es_equipo(), false)
      OR EXISTS (SELECT 1 FROM public.cliente_documentos d
                  WHERE d.ruta = p_ruta AND d.visible_cliente
                    AND d.cliente_id = public.mi_cliente_portal())
$$;

DROP POLICY IF EXISTS clientes_documentos_leer ON storage.objects;
CREATE POLICY clientes_documentos_leer ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'clientes-documentos' AND public.cliente_doc_puede_leer(name));
DROP POLICY IF EXISTS clientes_documentos_subir ON storage.objects;
CREATE POLICY clientes_documentos_subir ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clientes-documentos' AND coalesce(public.es_equipo(), false));
DROP POLICY IF EXISTS clientes_documentos_borrar ON storage.objects;
CREATE POLICY clientes_documentos_borrar ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'clientes-documentos' AND coalesce(public.es_equipo(), false));


DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261022170100', 'dashboard_cliente_1_webs_documentos') ON CONFLICT DO NOTHING;
  END IF;
END $$;
