-- ============================================================================
-- Dashboard por cliente · parte 2 de 4: funciones de documentos y portal.
-- Requiere la parte 1. Idempotente.
-- ============================================================================

-- ─── Funciones del panel ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cliente_doc_registrar(p_cliente uuid, p_ruta text, p_nombre text,
  p_tamano bigint, p_tipo text, p_visible boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nuevo uuid;
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF split_part(p_ruta, '/', 1) <> p_cliente::text THEN RAISE EXCEPTION 'Ruta inválida.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'clientes-documentos' AND name = p_ruta) THEN
    RAISE EXCEPTION 'El archivo no terminó de subir. Intenta de nuevo.';
  END IF;
  INSERT INTO public.cliente_documentos (cliente_id, ruta, nombre, tamano, tipo, visible_cliente, subido_por)
  VALUES (p_cliente, p_ruta, left(trim(p_nombre), 200), p_tamano, left(p_tipo, 120),
          coalesce(p_visible, false), public.mi_equipo_id())
  RETURNING id INTO nuevo;
  RETURN nuevo;
END $$;

CREATE OR REPLACE FUNCTION public.cliente_doc_visible(p_doc uuid, p_visible boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  UPDATE public.cliente_documentos SET visible_cliente = coalesce(p_visible, false) WHERE id = p_doc;
END $$;

-- Borra la fila; el archivo lo borra el navegador antes (política DELETE del equipo).
CREATE OR REPLACE FUNCTION public.cliente_doc_borrar(p_doc uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  DELETE FROM public.cliente_documentos WHERE id = p_doc;
END $$;

-- ─── Portal: documentos compartidos con el cliente ─────────────────────────
CREATE OR REPLACE FUNCTION public.portal_documentos()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'nombre', nombre, 'ruta', ruta,
                                               'tamano', tamano, 'created_at', created_at)
                            ORDER BY created_at DESC), '[]'::jsonb)
    FROM public.cliente_documentos
   WHERE visible_cliente AND public.mi_cliente_portal() IS NOT NULL
     AND cliente_id = public.mi_cliente_portal()
$$;

REVOKE ALL ON FUNCTION public.cliente_doc_puede_leer(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cliente_doc_registrar(uuid, text, text, bigint, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cliente_doc_visible(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cliente_doc_borrar(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.portal_documentos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_doc_puede_leer(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cliente_doc_registrar(uuid, text, text, bigint, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cliente_doc_visible(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cliente_doc_borrar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_documentos() TO authenticated;


DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261022170200', 'dashboard_cliente_2_documentos_funciones') ON CONFLICT DO NOTHING;
  END IF;
END $$;
