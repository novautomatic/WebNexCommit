-- ─── Consultas ─────────────────────────────────────────────────────────────
-- Tareas del socio: asignadas a él, más las sin responsable de las áreas que lidera.
CREATE OR REPLACE FUNCTION public.mcp_mis_tareas(
  p_equipo uuid, p_columna text DEFAULT NULL, p_prioridad text DEFAULT NULL, p_solo_vencidas boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_estado text;
BEGIN
  v_estado := public.mcp_estado_de(p_columna);
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
END $fn$;

CREATE OR REPLACE FUNCTION public.mcp_ver_tarea(p_equipo uuid, p_numero bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  t public.tareas;
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
END $fn$;

CREATE OR REPLACE FUNCTION public.mcp_buscar(
  p_equipo uuid, p_texto text DEFAULT NULL, p_proyecto text DEFAULT NULL, p_responsable text DEFAULT NULL,
  p_columna text DEFAULT NULL, p_incluir_cerradas boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_estado text;
BEGIN
  v_estado := public.mcp_estado_de(p_columna);
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
END $fn$;

DO $do$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261010132000', 'mcp_tareas_3_consultas')
    ON CONFLICT DO NOTHING;
  END IF;
END $do$;
