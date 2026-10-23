-- ============================================================================
-- Carpetas del cliente · parte 3 de 3: funciones del equipo y aviso diario.
--
-- cliente_docs_avisar(): a las 18:00 (Santiago) UN correo por cliente que haya
-- subido archivos ese día, a los encargados de sus tareas abiertas o, si no
-- tiene, a los dueños. Tipo 'cliente_documentos' en POST /avisos/tareas-cliente.
-- Prueba: SELECT public.cliente_docs_avisar(true);
--
-- Requiere las partes 1-2. Idempotente.
-- ============================================================================

-- El registro del equipo ahora acepta carpeta (reemplaza la versión de 6 parámetros).
DROP FUNCTION IF EXISTS public.cliente_doc_registrar(uuid, text, text, bigint, text, boolean);
CREATE OR REPLACE FUNCTION public.cliente_doc_registrar(p_cliente uuid, p_ruta text, p_nombre text,
  p_tamano bigint, p_tipo text, p_visible boolean DEFAULT false, p_carpeta uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nuevo uuid;
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF split_part(p_ruta, '/', 1) <> p_cliente::text THEN RAISE EXCEPTION 'Ruta inválida.'; END IF;
  IF NOT public.carpeta_de_cliente(p_carpeta, p_cliente) THEN RAISE EXCEPTION 'Esa carpeta no existe.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'clientes-documentos' AND name = p_ruta) THEN
    RAISE EXCEPTION 'El archivo no terminó de subir. Intenta de nuevo.';
  END IF;
  INSERT INTO public.cliente_documentos (cliente_id, carpeta_id, ruta, nombre, tamano, tipo, visible_cliente, subido_por, subido_por_nombre)
  VALUES (p_cliente, p_carpeta, p_ruta, left(trim(p_nombre), 200), p_tamano, left(p_tipo, 120),
          coalesce(p_visible, false), public.mi_equipo_id(), public.tcliente_actor())
  RETURNING id INTO nuevo;
  RETURN nuevo;
END $$;

CREATE OR REPLACE FUNCTION public.cliente_carpeta_crear(p_cliente uuid, p_padre uuid, p_nombre text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nueva uuid;
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF NOT public.carpeta_de_cliente(p_padre, p_cliente) THEN RAISE EXCEPTION 'Esa carpeta no existe.'; END IF;
  INSERT INTO public.cliente_carpetas (cliente_id, padre_id, nombre, origen, creada_por)
  VALUES (p_cliente, p_padre, trim(p_nombre), 'equipo', public.tcliente_actor())
  RETURNING id INTO nueva;
  RETURN nueva;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Ya hay una carpeta con ese nombre aquí.';
          WHEN check_violation  THEN RAISE EXCEPTION 'Usa un nombre de 1 a 80 caracteres, sin «/».';
END $$;

CREATE OR REPLACE FUNCTION public.cliente_carpeta_renombrar(p_carpeta uuid, p_nombre text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  UPDATE public.cliente_carpetas SET nombre = trim(p_nombre) WHERE id = p_carpeta;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Ya hay una carpeta con ese nombre aquí.';
          WHEN check_violation  THEN RAISE EXCEPTION 'Usa un nombre de 1 a 80 caracteres, sin «/».';
END $$;

CREATE OR REPLACE FUNCTION public.cliente_carpeta_borrar(p_carpeta uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF EXISTS (SELECT 1 FROM public.cliente_carpetas WHERE padre_id = p_carpeta)
     OR EXISTS (SELECT 1 FROM public.cliente_documentos WHERE carpeta_id = p_carpeta) THEN
    RAISE EXCEPTION 'La carpeta no está vacía: mueve o borra primero lo que tiene dentro.';
  END IF;
  DELETE FROM public.cliente_carpetas WHERE id = p_carpeta;
END $$;

CREATE OR REPLACE FUNCTION public.cliente_doc_mover(p_doc uuid, p_carpeta uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  UPDATE public.cliente_documentos d SET carpeta_id = p_carpeta
   WHERE d.id = p_doc AND public.carpeta_de_cliente(p_carpeta, d.cliente_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Esa carpeta no es de este cliente.'; END IF;
END $$;

-- ─── Aviso diario de lo que subieron los clientes ──────────────────────────
CREATE OR REPLACE FUNCTION public.cliente_docs_avisar(p_forzar boolean DEFAULT false)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  x record;  para uuid[];  n integer := 0;
BEGIN
  IF NOT p_forzar AND extract(hour FROM now() AT TIME ZONE 'America/Santiago') <> 18 THEN RETURN 0; END IF;
  FOR x IN
    SELECT d.cliente_id, c.nombre AS cliente, array_agg(d.id) AS ids,
           jsonb_agg(jsonb_build_object('nombre', d.nombre, 'carpeta', coalesce(k.nombre, 'Inicio'),
                                        'quien', d.subido_por_nombre) ORDER BY d.created_at) AS archivos
      FROM public.cliente_documentos d
      JOIN public.clientes c ON c.id = d.cliente_id
      LEFT JOIN public.cliente_carpetas k ON k.id = d.carpeta_id
     WHERE d.origen = 'cliente' AND d.avisado_at IS NULL
     GROUP BY d.cliente_id, c.nombre
  LOOP
    SELECT coalesce(array_agg(DISTINCT t.encargado_id), '{}') INTO para FROM public.tareas_cliente t
     WHERE t.cliente_id = x.cliente_id AND t.cerrada_at IS NULL AND t.cancelada_at IS NULL;
    IF cardinality(para) = 0 THEN para := public.tcliente_duenos(); END IF;
    PERFORM public.tcliente_correo_equipo(para, 'cliente_documentos', jsonb_build_object(
      'cliente', x.cliente, 'archivos', x.archivos,
      'enlace_equipo', 'https://www.nexcommit.com/admin?tab=clientes&cliente=' || x.cliente_id));
    UPDATE public.cliente_documentos SET avisado_at = now() WHERE id = ANY(x.ids);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.cliente_doc_registrar(uuid, text, text, bigint, text, boolean, uuid),
  public.cliente_carpeta_crear(uuid, uuid, text), public.cliente_carpeta_renombrar(uuid, text),
  public.cliente_carpeta_borrar(uuid), public.cliente_doc_mover(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_doc_registrar(uuid, text, text, bigint, text, boolean, uuid),
  public.cliente_carpeta_crear(uuid, uuid, text), public.cliente_carpeta_renombrar(uuid, text),
  public.cliente_carpeta_borrar(uuid), public.cliente_doc_mover(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.cliente_docs_avisar(boolean) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('cliente-docs-avisar') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cliente-docs-avisar');
  -- 21 y 22 UTC cubren las 18:00 de Santiago con y sin horario de verano.
  PERFORM cron.schedule('cliente-docs-avisar', '0 21,22 * * *', 'SELECT public.cliente_docs_avisar()');
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261023120300', 'carpetas_cliente_3_equipo') ON CONFLICT DO NOTHING;
  END IF;
END $$;
