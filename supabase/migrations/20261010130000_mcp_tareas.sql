-- ============================================================================
-- Servidor MCP del tablero de tareas (Edge Function `mcp-tareas`)
--
-- Permite consultar y mover tareas desde Claude. La Edge Function se conecta
-- con la service role (sin sesión de usuario), así que aquí se resuelve:
--   * Autenticación: cada socio tiene un token secreto (en la URL del conector).
--     Solo se guarda su hash SHA-256 en `mcp_tokens`.
--   * Identidad: `mcp_como(equipo_id)` fija los claims JWT de la transacción al
--     email del socio, de modo que las RPC del panel (tarea_actualizar,
--     tarea_crear…) funcionan tal cual: es_equipo() pasa, el historial registra
--     al socio como actor y el aviso de WhatsApp no se manda al autoasignarse.
--     Se reutiliza así TODA la lógica del panel, incluida la traducción de
--     columnas a etiquetas/cierre de issues en GitHub.
--   * Auditoría: `mcp_registro` guarda quién movió/creó qué y cuándo.
--
-- Todas las funciones mcp_* son solo para service_role. Idempotente.
--
-- Crear el token de un socio (el valor se muestra UNA vez; no se guarda):
--   SELECT public.mcp_crear_token('jpa.pizarro@gmail.com', 'Claude · Juan Pablo');
-- Revocar:
--   UPDATE public.mcp_tokens SET activo = false WHERE nombre = '...';
-- ============================================================================

-- ─── Tablas ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mcp_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id     uuid NOT NULL REFERENCES public.equipo(id) ON DELETE CASCADE,
  nombre        text NOT NULL,
  token_hash    text NOT NULL UNIQUE,
  activo        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz
);

CREATE TABLE IF NOT EXISTS public.mcp_registro (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  equipo_id   uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  herramienta text NOT NULL,
  tarea_id    uuid REFERENCES public.tareas(id) ON DELETE SET NULL,
  antes       jsonb,
  despues     jsonb,
  ok          boolean NOT NULL DEFAULT true,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mcp_registro_fecha_idx ON public.mcp_registro (created_at DESC);

ALTER TABLE public.mcp_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_registro ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mcp_tokens, public.mcp_registro FROM anon, authenticated;

-- Los hashes de token no se exponen a nadie; el registro lo lee solo un dueño.
GRANT SELECT ON public.mcp_registro TO authenticated;
DROP POLICY IF EXISTS mcp_registro_dueno ON public.mcp_registro;
CREATE POLICY mcp_registro_dueno ON public.mcp_registro FOR SELECT TO authenticated USING (public.es_dueno());

-- ─── Tokens ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mcp_crear_token(p_email text, p_nombre text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_equipo uuid;
  v_token  text := 'nxc_' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
BEGIN
  v_equipo := (SELECT id FROM public.equipo WHERE lower(email) = lower(p_email) AND activo);
  IF v_equipo IS NULL THEN RAISE EXCEPTION 'No hay un integrante activo con el email %.', p_email; END IF;
  INSERT INTO public.mcp_tokens (equipo_id, nombre, token_hash)
  VALUES (v_equipo, p_nombre, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'));
  RETURN v_token;
END $$;

-- Devuelve el socio dueño del token (o nada) y marca el uso.
CREATE OR REPLACE FUNCTION public.mcp_resolver_token(p_hash text)
RETURNS TABLE (equipo_id uuid, nombre text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH t AS (
    UPDATE public.mcp_tokens k SET last_used_at = now()
     WHERE k.token_hash = p_hash AND k.activo
       AND EXISTS (SELECT 1 FROM public.equipo e WHERE e.id = k.equipo_id AND e.activo)
    RETURNING k.equipo_id
  )
  SELECT e.id, e.nombre FROM t JOIN public.equipo e ON e.id = t.equipo_id;
END $$;

-- ─── Identidad y utilidades ────────────────────────────────────────────────
-- Hace que las RPC del panel vean al socio como usuario de la sesión actual.
CREATE OR REPLACE FUNCTION public.mcp_como(p_equipo uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  v_email := (SELECT email FROM public.equipo WHERE id = p_equipo AND activo);
  IF v_email IS NULL THEN RAISE EXCEPTION 'no autorizado'; END IF;
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('email', v_email, 'role', 'authenticated')::text, true);
END $$;

CREATE OR REPLACE FUNCTION public.mcp_label_estado(p_estado text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_estado WHEN 'pendiente' THEN 'Pendiente' WHEN 'en_progreso' THEN 'En progreso'
                       WHEN 'en_revision' THEN 'En revisión' WHEN 'bloqueada' THEN 'Bloqueada'
                       WHEN 'completada' THEN 'Completada' WHEN 'cancelada' THEN 'Cancelada' END
$$;

CREATE OR REPLACE FUNCTION public.mcp_tarea_json(p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'numero', t.numero,
    'ref', CASE WHEN p.tipo = 'area' THEN p.nombre || ' #' || t.numero
                ELSE coalesce(split_part(p.github_repo, '/', 2), p.nombre) || '#' || coalesce(t.github_numero::text, '?') END,
    'titulo', t.titulo,
    'columna', public.mcp_label_estado(t.estado),
    'estado', t.estado,
    'prioridad', t.prioridad,
    'responsable', e.nombre,
    'fecha_limite', t.fecha_limite,
    'vencida', t.estado NOT IN ('completada', 'cancelada') AND t.fecha_limite IS NOT NULL AND t.fecha_limite < current_date,
    'proyecto', p.nombre,
    'tipo', CASE WHEN p.tipo = 'area' THEN 'area' ELSE 'proyecto' END,
    'github_url', t.github_issue_url,
    'sync', t.sync_estado)
  FROM public.tareas t
  JOIN public.proyectos p ON p.id = t.proyecto_id
  LEFT JOIN public.equipo e ON e.id = t.responsable_id
  WHERE t.id = p_id
$$;

CREATE OR REPLACE FUNCTION public.mcp_log(
  p_equipo uuid, p_herramienta text, p_tarea uuid, p_antes jsonb, p_despues jsonb, p_ok boolean, p_error text DEFAULT NULL
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.mcp_registro (equipo_id, herramienta, tarea_id, antes, despues, ok, error)
  VALUES (p_equipo, p_herramienta, p_tarea, p_antes, p_despues, p_ok, p_error)
$$;

-- Columna del tablero (texto libre o id) → estado. NULL si no es una columna.
CREATE OR REPLACE FUNCTION public.mcp_estado_de(p_columna text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE translate(lower(trim(coalesce(p_columna, ''))), ' áéíóú', '_aeiou')
    WHEN 'pendiente' THEN 'pendiente' WHEN 'en_progreso' THEN 'en_progreso'
    WHEN 'en_revision' THEN 'en_revision' WHEN 'bloqueada' THEN 'bloqueada'
    WHEN 'completada' THEN 'completada' END
$$;

-- ─── Consultas ─────────────────────────────────────────────────────────────
-- Tareas del socio: asignadas a él, más las sin responsable de las áreas que lidera.
CREATE OR REPLACE FUNCTION public.mcp_mis_tareas(
  p_equipo uuid, p_columna text DEFAULT NULL, p_prioridad text DEFAULT NULL, p_solo_vencidas boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_estado text := public.mcp_estado_de(p_columna);
BEGIN
  IF p_columna IS NOT NULL AND v_estado IS NULL THEN
    RAISE EXCEPTION 'Columna desconocida: %. Usa listar_columnas.', p_columna;
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(public.mcp_tarea_json(t.id) ORDER BY pr.peso, t.fecha_limite NULLS LAST, t.numero)
      FROM (
        SELECT t.id, t.numero, t.prioridad, t.fecha_limite, t.completada_at
          FROM public.tareas t JOIN public.proyectos p ON p.id = t.proyecto_id
         WHERE (t.responsable_id = p_equipo
                OR (t.responsable_id IS NULL AND p.tipo = 'area' AND p.area_responsable_id = p_equipo))
           AND CASE WHEN v_estado IS NOT NULL THEN t.estado = v_estado
                    ELSE t.estado NOT IN ('completada', 'cancelada') END
           AND (p_prioridad IS NULL OR t.prioridad = lower(p_prioridad))
           AND (NOT p_solo_vencidas OR (t.fecha_limite IS NOT NULL AND t.fecha_limite < current_date))
         ORDER BY t.completada_at DESC NULLS LAST, t.numero
         LIMIT 100
      ) t
      JOIN (VALUES ('urgente', 0), ('alta', 1), ('media', 2), ('baja', 3)) pr(id, peso) ON pr.id = t.prioridad
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.mcp_ver_tarea(p_equipo uuid, p_numero bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tareas;
BEGIN
  t := (SELECT x FROM public.tareas x WHERE x.numero = p_numero);
  IF t.id IS NULL THEN RAISE EXCEPTION 'No existe la tarea #%.', p_numero; END IF;
  RETURN public.mcp_tarea_json(t.id) || jsonb_build_object(
    'descripcion', t.descripcion,
    'etiquetas', t.etiquetas,
    'sync_error', t.sync_error,
    'creada', t.created_at,
    'actualizada', t.updated_at,
    'comentarios', coalesce((
      SELECT jsonb_agg(jsonb_build_object('autor', coalesce(e.nombre, c.autor_github), 'fecha', c.created_at, 'texto', c.texto)
                       ORDER BY c.created_at)
        FROM (SELECT * FROM public.tarea_comentarios WHERE tarea_id = t.id ORDER BY created_at DESC LIMIT 20) c
        LEFT JOIN public.equipo e ON e.id = c.autor_id), '[]'::jsonb),
    'historial', coalesce((
      SELECT jsonb_agg(jsonb_build_object('quien', e.nombre, 'fecha', h.created_at, 'accion', h.accion,
                                          'campo', h.campo, 'antes', h.antes, 'despues', h.despues)
                       ORDER BY h.created_at DESC)
        FROM (SELECT * FROM public.tarea_historial WHERE tarea_id = t.id ORDER BY created_at DESC LIMIT 10) h
        LEFT JOIN public.equipo e ON e.id = h.actor_id), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.mcp_buscar(
  p_equipo uuid, p_texto text DEFAULT NULL, p_proyecto text DEFAULT NULL, p_responsable text DEFAULT NULL,
  p_columna text DEFAULT NULL, p_incluir_cerradas boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_estado text := public.mcp_estado_de(p_columna);
BEGIN
  IF p_columna IS NOT NULL AND v_estado IS NULL THEN
    RAISE EXCEPTION 'Columna desconocida: %. Usa listar_columnas.', p_columna;
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(public.mcp_tarea_json(t.id) ORDER BY t.numero DESC)
      FROM (
        SELECT t.id, t.numero FROM public.tareas t
          JOIN public.proyectos p ON p.id = t.proyecto_id
          LEFT JOIN public.equipo e ON e.id = t.responsable_id
         WHERE (coalesce(trim(p_texto), '') = ''
                OR position(lower(trim(p_texto)) IN lower(t.titulo || ' ' || coalesce(t.descripcion, ''))) > 0
                OR (trim(p_texto) ~ '^#?\d+$' AND t.numero = replace(trim(p_texto), '#', '')::bigint))
           AND (p_proyecto IS NULL OR position(lower(trim(p_proyecto)) IN lower(p.nombre)) > 0)
           AND (p_responsable IS NULL OR position(lower(trim(p_responsable)) IN lower(coalesce(e.nombre, ''))) > 0)
           AND CASE WHEN v_estado IS NOT NULL THEN t.estado = v_estado
                    WHEN p_incluir_cerradas THEN true
                    ELSE t.estado NOT IN ('completada', 'cancelada') END
         ORDER BY t.numero DESC
         LIMIT 25
      ) t
  ), '[]'::jsonb);
END $$;

-- ─── Escrituras (con auditoría) ────────────────────────────────────────────
-- Mueve una tarjeta con la misma RPC del panel. Áreas: cambio local inmediato.
-- Proyectos: se manda a GitHub (etiqueta / cierre / reapertura) y se confirma
-- en el siguiente ciclo de sincronización (≤ 1 min).
CREATE OR REPLACE FUNCTION public.mcp_mover(p_equipo uuid, p_numero bigint, p_columna text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t       public.tareas;
  v_nuevo text := public.mcp_estado_de(p_columna);
  v_tipo  text;
  v_antes jsonb;
BEGIN
  IF v_nuevo IS NULL THEN
    RAISE EXCEPTION 'Columna desconocida: %. Usa listar_columnas.', p_columna;
  END IF;
  t := (SELECT x FROM public.tareas x WHERE x.numero = p_numero);
  IF t.id IS NULL THEN RAISE EXCEPTION 'No existe la tarea #%.', p_numero; END IF;
  v_tipo := (SELECT tipo FROM public.proyectos WHERE id = t.proyecto_id);
  v_antes := public.mcp_tarea_json(t.id);

  IF t.estado = v_nuevo THEN
    RETURN jsonb_build_object('ok', true, 'cambio', false, 'mensaje', 'La tarea ya estaba en ' || public.mcp_label_estado(v_nuevo) || '.',
                              'tarea', v_antes);
  END IF;

  BEGIN
    PERFORM public.mcp_como(p_equipo);
    PERFORM public.tarea_actualizar(t.id, jsonb_build_object('estado', v_nuevo));
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.mcp_log(p_equipo, 'mover_tarea', t.id, v_antes, NULL, false, SQLERRM);
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
  END;

  t := (SELECT x FROM public.tareas x WHERE x.id = t.id);
  PERFORM public.mcp_log(p_equipo, 'mover_tarea', t.id, v_antes, public.mcp_tarea_json(t.id), true);
  RETURN jsonb_build_object('ok', true, 'cambio', true,
    'mensaje', CASE WHEN v_tipo = 'area' THEN 'Movida a ' || public.mcp_label_estado(v_nuevo) || '.'
                    ELSE 'Movida a ' || public.mcp_label_estado(v_nuevo) || ' en el panel. El cambio se envió a GitHub y se confirma en ~1 minuto.' END,
    'tarea', public.mcp_tarea_json(t.id));
END $$;

-- Solo tareas de área (las de proyecto nacen en GitHub).
CREATE OR REPLACE FUNCTION public.mcp_crear_tarea_area(
  p_equipo uuid, p_area text, p_titulo text, p_descripcion text DEFAULT NULL, p_prioridad text DEFAULT 'media',
  p_columna text DEFAULT 'pendiente', p_fecha date DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_area    public.proyectos;
  v_estado  text := public.mcp_estado_de(coalesce(p_columna, 'pendiente'));
  v_lista   text;
  v_id      uuid;
  t         public.tareas;
BEGIN
  IF v_estado IS NULL THEN RAISE EXCEPTION 'Columna desconocida: %. Usa listar_columnas.', p_columna; END IF;
  IF v_estado = 'completada' THEN RAISE EXCEPTION 'Una tarea nueva no puede nacer completada.'; END IF;
  IF lower(coalesce(p_prioridad, 'media')) NOT IN ('urgente', 'alta', 'media', 'baja') THEN
    RAISE EXCEPTION 'Prioridad inválida: %. Usa urgente, alta, media o baja.', p_prioridad;
  END IF;
  IF length(trim(coalesce(p_titulo, ''))) = 0 THEN RAISE EXCEPTION 'Falta el título.'; END IF;

  v_lista := (SELECT string_agg(nombre, ', ' ORDER BY nombre) FROM public.proyectos WHERE tipo = 'area' AND NOT archivado);

  IF coalesce(trim(p_area), '') = '' THEN
    v_area := (SELECT x FROM public.proyectos x
                WHERE x.tipo = 'area' AND NOT x.archivado AND x.area_responsable_id = p_equipo
                  AND (SELECT count(*) FROM public.proyectos y
                        WHERE y.tipo = 'area' AND NOT y.archivado AND y.area_responsable_id = p_equipo) = 1);
  ELSE
    v_area := (SELECT x FROM public.proyectos x
                WHERE x.tipo = 'area' AND NOT x.archivado AND lower(x.nombre) = lower(trim(p_area)));
    IF v_area.id IS NULL THEN
      v_area := (SELECT x FROM public.proyectos x
                  WHERE x.tipo = 'area' AND NOT x.archivado AND position(lower(trim(p_area)) IN lower(x.nombre)) > 0
                    AND (SELECT count(*) FROM public.proyectos y
                          WHERE y.tipo = 'area' AND NOT y.archivado
                            AND position(lower(trim(p_area)) IN lower(y.nombre)) > 0) = 1);
    END IF;
  END IF;
  IF v_area.id IS NULL THEN
    RAISE EXCEPTION 'Indica el área. Solo se crean tareas en áreas: %.', coalesce(v_lista, '(ninguna)');
  END IF;

  BEGIN
    PERFORM public.mcp_como(p_equipo);
    v_id := public.tarea_crear(v_area.id, p_titulo, p_descripcion, NULL, lower(coalesce(p_prioridad, 'media')), v_estado, p_fecha, '{}');
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.mcp_log(p_equipo, 'crear_tarea', NULL, NULL, NULL, false, SQLERRM);
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
  END;

  t := (SELECT x FROM public.tareas x WHERE x.id = v_id);
  PERFORM public.mcp_log(p_equipo, 'crear_tarea', v_id, NULL, public.mcp_tarea_json(t.id), true);
  RETURN jsonb_build_object('ok', true, 'mensaje', 'Tarea creada en ' || v_area.nombre || '.', 'tarea', public.mcp_tarea_json(t.id));
END $$;

-- ─── Permisos: solo la service role (la Edge Function) ─────────────────────
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'mcp_crear_token(text,text)', 'mcp_resolver_token(text)', 'mcp_como(uuid)', 'mcp_tarea_json(uuid)',
    'mcp_log(uuid,text,uuid,jsonb,jsonb,boolean,text)', 'mcp_mis_tareas(uuid,text,text,boolean)',
    'mcp_ver_tarea(uuid,bigint)', 'mcp_buscar(uuid,text,text,text,text,boolean)', 'mcp_mover(uuid,bigint,text)',
    'mcp_crear_tarea_area(uuid,text,text,text,text,text,date)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261010130000', 'mcp_tareas')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
