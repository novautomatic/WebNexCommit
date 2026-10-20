-- Tareas de clientes (parte 3/14): quién es quién, RLS y Storage.
--
-- Los CLIENTES no leen ninguna tabla directo: todo lo del portal pasa por
-- funciones portal_* (parte 7) que filtran por su cliente. El EQUIPO lee las
-- tablas con RLS (es_equipo()) y escribe solo por funciones tcliente_*.

CREATE OR REPLACE FUNCTION public.hoy_cl()
RETURNS date LANGUAGE sql STABLE AS $$ SELECT (now() AT TIME ZONE 'America/Santiago')::date $$;

-- Contacto de cliente de la sesión actual (atado al user_id, no solo al correo).
CREATE OR REPLACE FUNCTION public.mi_contacto_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.cliente_contactos
   WHERE user_id = auth.uid() AND user_id IS NOT NULL AND activo AND anonimizado_at IS NULL
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.mi_cliente_portal()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cliente_id FROM public.cliente_contactos WHERE id = public.mi_contacto_id()
$$;

CREATE OR REPLACE FUNCTION public.tcliente_actor()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT nombre FROM public.equipo WHERE id = public.mi_equipo_id()),
    (SELECT nombre FROM public.cliente_contactos WHERE id = public.mi_contacto_id()),
    'Sistema')
$$;

CREATE OR REPLACE FUNCTION public.tcliente_log(p_tarea uuid, p_accion text, p_detalle text DEFAULT NULL, p_visible boolean DEFAULT true)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.tareas_cliente_historial (tarea_id, actor, accion, detalle, visible_cliente)
  VALUES (p_tarea, public.tcliente_actor(), p_accion, left(p_detalle, 1000), p_visible)
$$;

-- Storage: ruta "<tarea_id>/<archivo>". El equipo todo; el cliente solo las
-- tareas de su empresa, y para subir, mientras le toque entregar.
CREATE OR REPLACE FUNCTION public.tcliente_puede_archivo(p_ruta text, p_subir boolean)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t public.tareas_cliente;
  v_id text := split_part(p_ruta, '/', 1);
BEGIN
  IF public.es_equipo() THEN RETURN true; END IF;
  IF v_id !~ '^[0-9a-f-]{36}$' THEN RETURN false; END IF;
  SELECT * INTO t FROM public.tareas_cliente WHERE id = v_id::uuid;
  IF NOT FOUND OR t.cliente_id IS DISTINCT FROM public.mi_cliente_portal() THEN RETURN false; END IF;
  IF NOT p_subir THEN RETURN true; END IF;
  RETURN t.cerrada_at IS NULL AND t.cancelada_at IS NULL AND t.estado_cliente IN ('pendiente', 'devuelta');
END $$;

-- ─── RLS ────────────────────────────────────────────────────────────────────
DO $$
DECLARE tb text;
BEGIN
  FOREACH tb IN ARRAY ARRAY['cliente_contactos', 'tareas_cliente', 'tareas_cliente_entregables',
    'tareas_cliente_notas', 'tareas_cliente_archivos', 'tareas_cliente_historial',
    'tareas_cliente_plantillas', 'cliente_solicitudes', 'derechos_solicitudes',
    'tareas_cliente_avisos', 'portal_enlaces', 'portal_claves', 'tareas_cliente_corridas'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tb);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tb);
  END LOOP;
  -- Solo lectura para el equipo (las escrituras van por funciones).
  FOREACH tb IN ARRAY ARRAY['cliente_contactos', 'tareas_cliente', 'tareas_cliente_entregables',
    'tareas_cliente_notas', 'tareas_cliente_archivos', 'tareas_cliente_historial',
    'tareas_cliente_plantillas', 'cliente_solicitudes', 'derechos_solicitudes', 'tareas_cliente_avisos'] LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', tb);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tb || '_equipo', tb);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.es_equipo())', tb || '_equipo', tb);
  END LOOP;
END $$;

-- ─── Storage: bucket privado, 50 MB por archivo ─────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('tareas-clientes', 'tareas-clientes', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800;

DROP POLICY IF EXISTS tareas_clientes_leer ON storage.objects;
CREATE POLICY tareas_clientes_leer ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tareas-clientes' AND public.tcliente_puede_archivo(name, false));
DROP POLICY IF EXISTS tareas_clientes_subir ON storage.objects;
CREATE POLICY tareas_clientes_subir ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tareas-clientes' AND public.tcliente_puede_archivo(name, true));
-- Sin UPDATE ni DELETE para nadie con sesión: quitar un archivo marca la fila y
-- la Edge Function (service role) lo borra de Storage.

-- ─── Blog: con clientes logueados, "authenticated" ya no significa "equipo" ─
-- fix-rls-policy.sql (raíz del repo) dejaba crear posts a cualquier sesión.
DO $$
BEGIN
  IF to_regclass('public.posts') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Only authenticated users can create posts" ON public.posts;
    DROP POLICY IF EXISTS posts_crear_equipo ON public.posts;
    CREATE POLICY posts_crear_equipo ON public.posts FOR INSERT TO authenticated
      WITH CHECK (public.es_equipo() OR lower(coalesce(auth.jwt() ->> 'email', '')) IN
        ('stephaniabilbao@gmail.com', 'jpa.pizarro@gmail.com', 'fabianignacio.tm@gmail.com'));
  END IF;
END $$;

-- ─── Permisos de funciones ──────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.mi_contacto_id(), public.mi_cliente_portal(), public.tcliente_actor(),
  public.tcliente_log(uuid, text, text, boolean), public.tcliente_puede_archivo(text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tcliente_puede_archivo(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mi_contacto_id() TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019120300', 'tareas_clientes_03_permisos')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
