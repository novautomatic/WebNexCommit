-- ============================================================================
-- Carpetas del cliente · parte 2 de 3: lo que hace el cliente desde su portal.
-- Filtrado por mi_cliente_portal(); toca solo lo de origen 'cliente'.
-- Requiere la parte 1. Idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.portal_cliente_o_error()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.mi_cliente_portal();
BEGIN
  IF c IS NULL THEN RAISE EXCEPTION 'Tu sesión expiró. Vuelve a entrar.'; END IF;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.carpeta_de_cliente(p_carpeta uuid, p_cliente uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_carpeta IS NULL OR EXISTS (SELECT 1 FROM public.cliente_carpetas WHERE id = p_carpeta AND cliente_id = p_cliente)
$$;

CREATE OR REPLACE FUNCTION public.portal_archivos()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.portal_cliente_o_error();
BEGIN
  RETURN jsonb_build_object('cliente_id', c,
    'carpetas', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'padre_id', padre_id, 'nombre', nombre,
                 'origen', origen, 'created_at', created_at) ORDER BY lower(nombre))
                 FROM public.cliente_carpetas WHERE cliente_id = c), '[]'),
    'documentos', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'carpeta_id', carpeta_id, 'nombre', nombre,
                 'ruta', ruta, 'tamano', tamano, 'origen', origen, 'subido_por_nombre', subido_por_nombre,
                 'created_at', created_at) ORDER BY created_at DESC)
                 FROM public.cliente_documentos WHERE cliente_id = c AND (visible_cliente OR origen = 'cliente')), '[]'),
    'usado', public.cliente_espacio_usado(c),
    'cupo', public.cliente_cupo_bytes());
END $$;

CREATE OR REPLACE FUNCTION public.portal_carpeta_crear(p_padre uuid, p_nombre text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.portal_cliente_o_error();  nueva uuid;
BEGIN
  IF NOT public.carpeta_de_cliente(p_padre, c) THEN RAISE EXCEPTION 'Esa carpeta no existe.'; END IF;
  IF (SELECT count(*) FROM public.cliente_carpetas WHERE cliente_id = c) >= 300 THEN
    RAISE EXCEPTION 'Llegaste al máximo de 300 carpetas.';
  END IF;
  INSERT INTO public.cliente_carpetas (cliente_id, padre_id, nombre, origen, creada_por)
  VALUES (c, p_padre, trim(p_nombre), 'cliente', public.tcliente_actor())
  RETURNING id INTO nueva;
  RETURN nueva;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Ya hay una carpeta con ese nombre aquí.';
          WHEN check_violation  THEN RAISE EXCEPTION 'Usa un nombre de 1 a 80 caracteres, sin «/».';
END $$;

CREATE OR REPLACE FUNCTION public.portal_carpeta_renombrar(p_carpeta uuid, p_nombre text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.portal_cliente_o_error();
BEGIN
  UPDATE public.cliente_carpetas SET nombre = trim(p_nombre)
   WHERE id = p_carpeta AND cliente_id = c AND origen = 'cliente';
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo puedes renombrar carpetas que creaste tú.'; END IF;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Ya hay una carpeta con ese nombre aquí.';
          WHEN check_violation  THEN RAISE EXCEPTION 'Usa un nombre de 1 a 80 caracteres, sin «/».';
END $$;

CREATE OR REPLACE FUNCTION public.portal_carpeta_borrar(p_carpeta uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.portal_cliente_o_error();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.cliente_carpetas WHERE id = p_carpeta AND cliente_id = c AND origen = 'cliente') THEN
    RAISE EXCEPTION 'Solo puedes borrar carpetas que creaste tú.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cliente_carpetas WHERE padre_id = p_carpeta)
     OR EXISTS (SELECT 1 FROM public.cliente_documentos WHERE carpeta_id = p_carpeta) THEN
    RAISE EXCEPTION 'La carpeta no está vacía: mueve o borra primero lo que tiene dentro.';
  END IF;
  DELETE FROM public.cliente_carpetas WHERE id = p_carpeta;
END $$;

-- El tamaño sale de Storage, no del navegador.
CREATE OR REPLACE FUNCTION public.portal_doc_registrar(p_ruta text, p_nombre text, p_carpeta uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.portal_cliente_o_error();  o record;  nuevo uuid;
BEGIN
  IF split_part(p_ruta, '/', 1) <> c::text OR split_part(p_ruta, '/', 2) <> 'c' THEN RAISE EXCEPTION 'Ruta inválida.'; END IF;
  IF NOT public.carpeta_de_cliente(p_carpeta, c) THEN RAISE EXCEPTION 'Esa carpeta no existe.'; END IF;
  SELECT (metadata ->> 'size')::bigint AS tamano, metadata ->> 'mimetype' AS tipo INTO o
    FROM storage.objects WHERE bucket_id = 'clientes-documentos' AND name = p_ruta;
  IF NOT FOUND THEN RAISE EXCEPTION 'El archivo no terminó de subir. Intenta de nuevo.'; END IF;
  INSERT INTO public.cliente_documentos (cliente_id, carpeta_id, ruta, nombre, tamano, tipo, visible_cliente, origen, subido_por_nombre)
  VALUES (c, p_carpeta, p_ruta, left(trim(p_nombre), 200), o.tamano, left(o.tipo, 120), true, 'cliente', public.tcliente_actor())
  ON CONFLICT (ruta) DO NOTHING
  RETURNING id INTO nuevo;
  RETURN nuevo;
END $$;

CREATE OR REPLACE FUNCTION public.portal_doc_mover(p_doc uuid, p_carpeta uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.portal_cliente_o_error();
BEGIN
  IF NOT public.carpeta_de_cliente(p_carpeta, c) THEN RAISE EXCEPTION 'Esa carpeta no existe.'; END IF;
  UPDATE public.cliente_documentos SET carpeta_id = p_carpeta
   WHERE id = p_doc AND cliente_id = c AND origen = 'cliente';
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo puedes mover archivos que subiste tú.'; END IF;
END $$;

-- El navegador ya borró el archivo (política DELETE del cliente).
CREATE OR REPLACE FUNCTION public.portal_doc_borrar(p_doc uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid := public.portal_cliente_o_error();
BEGIN
  DELETE FROM public.cliente_documentos WHERE id = p_doc AND cliente_id = c AND origen = 'cliente';
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo puedes borrar archivos que subiste tú.'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.portal_cliente_o_error(), public.carpeta_de_cliente(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_archivos(), public.portal_carpeta_crear(uuid, text),
  public.portal_carpeta_renombrar(uuid, text), public.portal_carpeta_borrar(uuid),
  public.portal_doc_registrar(text, text, uuid), public.portal_doc_mover(uuid, uuid),
  public.portal_doc_borrar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_archivos(), public.portal_carpeta_crear(uuid, text),
  public.portal_carpeta_renombrar(uuid, text), public.portal_carpeta_borrar(uuid),
  public.portal_doc_registrar(text, text, uuid), public.portal_doc_mover(uuid, uuid),
  public.portal_doc_borrar(uuid) TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261023120200', 'carpetas_cliente_2_portal') ON CONFLICT DO NOTHING;
  END IF;
END $$;
