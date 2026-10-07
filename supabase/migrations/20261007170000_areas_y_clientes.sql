-- ============================================================================
-- Tareas por área + clientes
--
-- Áreas: "proyectos" con tipo = 'area' y SIN repositorio. Sus tareas viven solo
-- en Supabase (no van a GitHub) pero usan el mismo tablero, comentarios,
-- historial y avisos de WhatsApp. Cada área tiene un responsable por defecto.
--
-- Las RPC tarea_crear / tarea_actualizar / tarea_comentar / tarea_resincronizar
-- se envuelven: si la tarea es de un área se resuelve aquí; si no, se delega a
-- la versión GitHub (renombrada *_github). Si alguna vez se vuelve a correr la
-- migración 20261007150000, correr esta después.
--
-- Clientes: tabla `clientes` y relación muchos-a-muchos con `proyectos`
-- (un cliente puede tener varios proyectos y un proyecto varios clientes).
-- Contiene datos personales de contacto: solo los ve el equipo (RLS).
--
-- Idempotente.
-- ============================================================================

-- ─── Áreas ─────────────────────────────────────────────────────────────────
ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'repo';
ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS area_responsable_id uuid REFERENCES public.equipo(id) ON DELETE SET NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proyectos_tipo_check') THEN
    ALTER TABLE public.proyectos ADD CONSTRAINT proyectos_tipo_check CHECK (tipo IN ('repo', 'area'));
  END IF;
END $$;

INSERT INTO public.proyectos (nombre, descripcion, color, tipo, area_responsable_id)
SELECT a.nombre, a.descripcion, a.color, 'area', e.id
  FROM (VALUES
    ('RRHH y Contabilidad', 'Personas, contratos, sueldos, facturación e impuestos.', '#f59e0b', 'jpa.pizarro@gmail.com'),
    ('Ventas y Campañas Ads', 'Prospección, cotizaciones, cierres y campañas pagadas (Google/Meta Ads).', '#34d399', 'fabianignacio.tm@gmail.com'),
    ('Redes sociales y movimiento digital', 'Contenido, publicaciones, comunidad y presencia digital.', '#f472b6', 'stephaniabilbao@gmail.com')
  ) AS a(nombre, descripcion, color, email)
  LEFT JOIN public.equipo e ON lower(e.email) = a.email
ON CONFLICT ((lower(nombre))) DO NOTHING;

-- ─── Renombrar las versiones GitHub (una sola vez) ─────────────────────────
DO $$
BEGIN
  IF to_regprocedure('public.tarea_crear_github(uuid,text,text,uuid,text,text,date,text[])') IS NULL THEN
    ALTER FUNCTION public.tarea_crear(uuid, text, text, uuid, text, text, date, text[]) RENAME TO tarea_crear_github;
  END IF;
  IF to_regprocedure('public.tarea_actualizar_github(uuid,jsonb)') IS NULL THEN
    ALTER FUNCTION public.tarea_actualizar(uuid, jsonb) RENAME TO tarea_actualizar_github;
  END IF;
  IF to_regprocedure('public.tarea_comentar_github(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.tarea_comentar(uuid, text) RENAME TO tarea_comentar_github;
  END IF;
  IF to_regprocedure('public.tarea_resincronizar_github(uuid)') IS NULL THEN
    ALTER FUNCTION public.tarea_resincronizar(uuid) RENAME TO tarea_resincronizar_github;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.tarea_crear_github(uuid, text, text, uuid, text, text, date, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tarea_actualizar_github(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tarea_comentar_github(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tarea_resincronizar_github(uuid) FROM PUBLIC, anon, authenticated;

-- ─── RPC del panel ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tarea_crear(
  p_proyecto uuid, p_titulo text, p_descripcion text DEFAULT NULL, p_responsable uuid DEFAULT NULL,
  p_prioridad text DEFAULT 'media', p_estado text DEFAULT 'pendiente', p_fecha date DEFAULT NULL,
  p_etiquetas text[] DEFAULT '{}'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pr   public.proyectos;
  v_id uuid;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'no autorizado'; END IF;
  SELECT * INTO pr FROM public.proyectos WHERE id = p_proyecto;
  IF pr.id IS NULL THEN RAISE EXCEPTION 'El proyecto no existe.'; END IF;

  IF pr.tipo = 'area' THEN
    INSERT INTO public.tareas (proyecto_id, titulo, descripcion, estado, prioridad, responsable_id, fecha_limite, etiquetas, sync_estado)
    VALUES (p_proyecto, left(trim(p_titulo), 200), nullif(trim(coalesce(p_descripcion, '')), ''), p_estado, p_prioridad,
            coalesce(p_responsable, pr.area_responsable_id), p_fecha, coalesce(p_etiquetas, '{}'), 'ok')
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  RETURN public.tarea_crear_github(p_proyecto, p_titulo, p_descripcion, p_responsable, p_prioridad, p_estado, p_fecha, p_etiquetas);
END $$;

CREATE OR REPLACE FUNCTION public.tarea_actualizar(p_tarea uuid, p_cambios jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t       public.tareas;
  v_tipo  text;
  destino uuid;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'no autorizado'; END IF;
  SELECT * INTO t FROM public.tareas WHERE id = p_tarea;
  IF t.id IS NULL THEN RAISE EXCEPTION 'La tarea no existe.'; END IF;
  SELECT tipo INTO v_tipo FROM public.proyectos WHERE id = t.proyecto_id;

  IF v_tipo IS DISTINCT FROM 'area' THEN
    PERFORM public.tarea_actualizar_github(p_tarea, p_cambios);
    RETURN;
  END IF;

  destino := coalesce((p_cambios ->> 'proyecto_id')::uuid, t.proyecto_id);
  IF destino <> t.proyecto_id AND NOT EXISTS (SELECT 1 FROM public.proyectos WHERE id = destino AND tipo = 'area') THEN
    RAISE EXCEPTION 'Una tarea de área solo puede moverse a otra área.';
  END IF;

  UPDATE public.tareas SET
    proyecto_id    = destino,
    titulo         = CASE WHEN p_cambios ? 'titulo' THEN left(trim(p_cambios ->> 'titulo'), 200) ELSE titulo END,
    descripcion    = CASE WHEN p_cambios ? 'descripcion' THEN nullif(trim(coalesce(p_cambios ->> 'descripcion', '')), '') ELSE descripcion END,
    fecha_limite   = CASE WHEN p_cambios ? 'fecha_limite' THEN (p_cambios ->> 'fecha_limite')::date ELSE fecha_limite END,
    estado         = CASE WHEN p_cambios ? 'estado' THEN p_cambios ->> 'estado' ELSE estado END,
    prioridad      = CASE WHEN p_cambios ? 'prioridad' THEN p_cambios ->> 'prioridad' ELSE prioridad END,
    responsable_id = CASE WHEN p_cambios ? 'responsable_id' THEN (p_cambios ->> 'responsable_id')::uuid ELSE responsable_id END,
    etiquetas      = CASE WHEN p_cambios ? 'etiquetas'
                          THEN coalesce(ARRAY(SELECT jsonb_array_elements_text(p_cambios -> 'etiquetas')), '{}')
                          ELSE etiquetas END,
    sync_estado    = 'ok',
    sync_error     = NULL
  WHERE id = p_tarea;
END $$;

CREATE OR REPLACE FUNCTION public.tarea_comentar(p_tarea uuid, p_texto text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tipo text;
  v_id   uuid;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'no autorizado'; END IF;
  SELECT pr.tipo INTO v_tipo FROM public.tareas t JOIN public.proyectos pr ON pr.id = t.proyecto_id WHERE t.id = p_tarea;
  IF v_tipo = 'area' THEN
    IF length(trim(coalesce(p_texto, ''))) = 0 THEN RAISE EXCEPTION 'El comentario está vacío.'; END IF;
    INSERT INTO public.tarea_comentarios (tarea_id, autor_id, texto)
    VALUES (p_tarea, public.mi_equipo_id(), left(trim(p_texto), 5000))
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;
  RETURN public.tarea_comentar_github(p_tarea, p_texto);
END $$;

CREATE OR REPLACE FUNCTION public.tarea_resincronizar(p_tarea uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tipo text;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'no autorizado'; END IF;
  SELECT pr.tipo INTO v_tipo FROM public.tareas t JOIN public.proyectos pr ON pr.id = t.proyecto_id WHERE t.id = p_tarea;
  IF v_tipo = 'area' THEN
    RETURN;  -- No hay nada que traer: vive solo aquí.
  END IF;
  PERFORM public.tarea_resincronizar_github(p_tarea);
END $$;

-- Solo las áreas se pueden borrar desde el panel (lo de GitHub se cierra allá).
CREATE OR REPLACE FUNCTION public.tarea_borrar_area(p_tarea uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'no autorizado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tareas t JOIN public.proyectos pr ON pr.id = t.proyecto_id
                  WHERE t.id = p_tarea AND pr.tipo = 'area') THEN
    RAISE EXCEPTION 'Solo se pueden borrar tareas de área.';
  END IF;
  DELETE FROM public.tareas WHERE id = p_tarea;
END $$;

REVOKE ALL ON FUNCTION public.tarea_crear(uuid, text, text, uuid, text, text, date, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tarea_actualizar(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tarea_comentar(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tarea_resincronizar(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tarea_borrar_area(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tarea_crear(uuid, text, text, uuid, text, text, date, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tarea_actualizar(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tarea_comentar(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tarea_resincronizar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tarea_borrar_area(uuid) TO authenticated;

-- ─── Clientes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clientes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL CHECK (length(trim(nombre)) > 0),
  empresa     text,
  email       text,
  telefono    text,
  notas       text,
  color       text NOT NULL DEFAULT '#e0a64b',
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS clientes_nombre_unico ON public.clientes (lower(nombre));
COMMENT ON TABLE public.clientes IS
  'Clientes de NexCommit. Datos de contacto personales (Ley 21.719): solo los ve el equipo; borrar o anonimizar al terminar la relación comercial.';

CREATE TABLE IF NOT EXISTS public.proyecto_clientes (
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  cliente_id  uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (proyecto_id, cliente_id)
);
CREATE INDEX IF NOT EXISTS proyecto_clientes_cliente_idx ON public.proyecto_clientes (cliente_id);

ALTER TABLE public.clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_clientes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clientes, public.proyecto_clientes FROM anon;

DROP POLICY IF EXISTS clientes_equipo ON public.clientes;
CREATE POLICY clientes_equipo ON public.clientes FOR ALL TO authenticated
  USING (public.es_equipo()) WITH CHECK (public.es_equipo());

DROP POLICY IF EXISTS proyecto_clientes_equipo ON public.proyecto_clientes;
CREATE POLICY proyecto_clientes_equipo ON public.proyecto_clientes FOR ALL TO authenticated
  USING (public.es_equipo()) WITH CHECK (public.es_equipo());

-- Un proyecto con al menos un cliente queda marcado como "de cliente".
CREATE OR REPLACE FUNCTION public.proyecto_clientes_marcar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.proyectos p
     SET es_cliente = EXISTS (SELECT 1 FROM public.proyecto_clientes pc WHERE pc.proyecto_id = p.id)
   WHERE p.id = coalesce(NEW.proyecto_id, OLD.proyecto_id);
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS proyecto_clientes_marcar ON public.proyecto_clientes;
CREATE TRIGGER proyecto_clientes_marcar
  AFTER INSERT OR DELETE ON public.proyecto_clientes
  FOR EACH ROW EXECUTE FUNCTION public.proyecto_clientes_marcar();

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261007170000', 'areas_y_clientes')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
