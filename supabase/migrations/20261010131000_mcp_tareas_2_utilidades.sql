-- ─── Identidad y utilidades ────────────────────────────────────────────────
-- Hace que las RPC del panel vean al socio como usuario de la sesión actual.
CREATE OR REPLACE FUNCTION public.mcp_como(p_equipo uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_email text;
BEGIN
  v_email := (SELECT email FROM public.equipo WHERE id = p_equipo AND activo);
  IF v_email IS NULL THEN RAISE EXCEPTION 'no autorizado'; END IF;
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('email', v_email, 'role', 'authenticated')::text, true);
END $fn$;

CREATE OR REPLACE FUNCTION public.mcp_label_estado(p_estado text)
RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE p_estado WHEN 'pendiente' THEN 'Pendiente' WHEN 'en_progreso' THEN 'En progreso'
                       WHEN 'en_revision' THEN 'En revisión' WHEN 'bloqueada' THEN 'Bloqueada'
                       WHEN 'completada' THEN 'Completada' WHEN 'cancelada' THEN 'Cancelada' END
$fn$;

CREATE OR REPLACE FUNCTION public.mcp_tarea_json(p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
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
$fn$;

CREATE OR REPLACE FUNCTION public.mcp_log(
  p_equipo uuid, p_herramienta text, p_tarea uuid, p_antes jsonb, p_despues jsonb, p_ok boolean, p_error text DEFAULT NULL
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  INSERT INTO public.mcp_registro (equipo_id, herramienta, tarea_id, antes, despues, ok, error)
  VALUES (p_equipo, p_herramienta, p_tarea, p_antes, p_despues, p_ok, p_error)
$fn$;

-- Columna del tablero (texto libre o id) → estado. NULL si no es una columna.
CREATE OR REPLACE FUNCTION public.mcp_estado_de(p_columna text)
RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE translate(lower(trim(coalesce(p_columna, ''))), ' áéíóú', '_aeiou')
    WHEN 'pendiente' THEN 'pendiente' WHEN 'en_progreso' THEN 'en_progreso'
    WHEN 'en_revision' THEN 'en_revision' WHEN 'bloqueada' THEN 'bloqueada'
    WHEN 'completada' THEN 'completada' END
$fn$;

DO $do$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261010131000', 'mcp_tareas_2_utilidades')
    ON CONFLICT DO NOTHING;
  END IF;
END $do$;
