-- ============================================================================
-- Carpetas del cliente · parte 1 de 3: tablas y permisos de Storage.
--
-- Cada cliente tiene un «contenedor» de documentos con carpetas. Lo ve en su
-- portal (/mi-espacio → Documentos) y el equipo en su dashboard, con el mismo
-- árbol. Reglas (decididas el 22-10-2026):
--   · El cliente crea carpetas, sube, mueve y borra SOLO lo suyo (origen
--     'cliente'). Lo que comparte NexCommit lo ve y descarga, no lo borra.
--   · El equipo ve y puede todo; sus documentos internos (visible_cliente =
--     false) no los ve el cliente.
--   · Cupo: 500 MB por cliente (lo que sube el cliente); 50 MB por archivo.
--   · Archivos del cliente en <cliente_id>/c/<archivo>; los del equipo en
--     <cliente_id>/<archivo> (bucket privado clientes-documentos).
--
-- Requiere 20261022170100…170400. Idempotente. Correr las 3 partes en orden.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cliente_carpetas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  padre_id    uuid REFERENCES public.cliente_carpetas(id) ON DELETE CASCADE,
  nombre      text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 80 AND nombre !~ '[/\\]'),
  origen      text NOT NULL DEFAULT 'equipo' CHECK (origen IN ('equipo', 'cliente')),
  creada_por  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cliente_carpetas_nombre_unico ON public.cliente_carpetas
  (cliente_id, coalesce(padre_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(trim(nombre)));
CREATE INDEX IF NOT EXISTS cliente_carpetas_cliente_idx ON public.cliente_carpetas (cliente_id);

-- NO ACTION (no RESTRICT): al borrar un cliente, carpetas y documentos caen juntos.
ALTER TABLE public.cliente_documentos ADD COLUMN IF NOT EXISTS carpeta_id uuid
  REFERENCES public.cliente_carpetas(id);
ALTER TABLE public.cliente_documentos ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'equipo';
ALTER TABLE public.cliente_documentos ADD COLUMN IF NOT EXISTS subido_por_nombre text;
ALTER TABLE public.cliente_documentos ADD COLUMN IF NOT EXISTS avisado_at timestamptz;
ALTER TABLE public.cliente_documentos DROP CONSTRAINT IF EXISTS cliente_documentos_origen_check;
ALTER TABLE public.cliente_documentos ADD CONSTRAINT cliente_documentos_origen_check CHECK (origen IN ('equipo', 'cliente'));
CREATE INDEX IF NOT EXISTS cliente_documentos_carpeta_idx ON public.cliente_documentos (carpeta_id);
CREATE INDEX IF NOT EXISTS cliente_documentos_aviso_idx ON public.cliente_documentos (created_at)
  WHERE origen = 'cliente' AND avisado_at IS NULL;

ALTER TABLE public.cliente_carpetas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cliente_carpetas FROM anon, authenticated;
GRANT SELECT ON public.cliente_carpetas TO authenticated;
DROP POLICY IF EXISTS cliente_carpetas_equipo ON public.cliente_carpetas;
CREATE POLICY cliente_carpetas_equipo ON public.cliente_carpetas FOR SELECT TO authenticated USING (public.es_equipo());

-- ─── Cupo ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cliente_cupo_bytes()
RETURNS bigint LANGUAGE sql IMMUTABLE AS $$ SELECT 524288000::bigint $$;  -- 500 MB

CREATE OR REPLACE FUNCTION public.cliente_espacio_usado(p_cliente uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum(tamano), 0)::bigint FROM public.cliente_documentos
   WHERE cliente_id = p_cliente AND origen = 'cliente'
$$;

-- ─── Storage: lo que puede hacer el cliente ────────────────────────────────
-- Sube solo dentro de <su cliente>/c/ y mientras le quede espacio.
CREATE OR REPLACE FUNCTION public.portal_puede_subir(p_ruta text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.mi_cliente_portal() IS NOT NULL
     AND split_part(p_ruta, '/', 1) = public.mi_cliente_portal()::text
     AND split_part(p_ruta, '/', 2) = 'c'
     AND public.cliente_espacio_usado(public.mi_cliente_portal()) < public.cliente_cupo_bytes()
$$;

-- Borra solo archivos que subió su empresa.
CREATE OR REPLACE FUNCTION public.portal_doc_es_suyo(p_ruta text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.cliente_documentos d
                  WHERE d.ruta = p_ruta AND d.origen = 'cliente'
                    AND d.cliente_id = public.mi_cliente_portal())
$$;

DROP POLICY IF EXISTS clientes_documentos_subir_cliente ON storage.objects;
CREATE POLICY clientes_documentos_subir_cliente ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clientes-documentos' AND public.portal_puede_subir(name));
DROP POLICY IF EXISTS clientes_documentos_borrar_cliente ON storage.objects;
CREATE POLICY clientes_documentos_borrar_cliente ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'clientes-documentos' AND public.portal_doc_es_suyo(name));

-- Lectura: el equipo todo; el cliente lo compartido + lo que subió (que nace visible).
CREATE OR REPLACE FUNCTION public.cliente_doc_puede_leer(p_ruta text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.es_equipo(), false)
      OR EXISTS (SELECT 1 FROM public.cliente_documentos d
                  WHERE d.ruta = p_ruta AND (d.visible_cliente OR d.origen = 'cliente')
                    AND d.cliente_id = public.mi_cliente_portal())
      -- Recién subido, antes de registrarlo (la subida lo relee): solo su propia carpeta.
      OR (split_part(p_ruta, '/', 1) = public.mi_cliente_portal()::text AND split_part(p_ruta, '/', 2) = 'c')
$$;

REVOKE ALL ON FUNCTION public.cliente_espacio_usado(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_puede_subir(text), public.portal_doc_es_suyo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_puede_subir(text), public.portal_doc_es_suyo(text) TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261023120100', 'carpetas_cliente_1_tablas') ON CONFLICT DO NOTHING;
  END IF;
END $$;
