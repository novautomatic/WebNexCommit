-- ─── Escrituras (con auditoría) ────────────────────────────────────────────
-- Mueve una tarjeta con la misma RPC del panel. Áreas: cambio local inmediato.
-- Proyectos: se manda a GitHub (etiqueta / cierre / reapertura) y se confirma
-- en el siguiente ciclo de sincronización (≤ 1 min).
CREATE OR REPLACE FUNCTION public.mcp_mover(p_equipo uuid, p_numero bigint, p_columna text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
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
END $fn$;

-- Solo tareas de área (las de proyecto nacen en GitHub).
CREATE OR REPLACE FUNCTION public.mcp_crear_tarea_area(
  p_equipo uuid, p_area text, p_titulo text, p_descripcion text DEFAULT NULL, p_prioridad text DEFAULT 'media',
  p_columna text DEFAULT 'pendiente', p_fecha date DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
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
END $fn$;

DO $do$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261010133000', 'mcp_tareas_4_escrituras')
    ON CONFLICT DO NOTHING;
  END IF;
END $do$;
