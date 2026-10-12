-- ─── Permisos: solo la service role (la Edge Function) ─────────────────────
DO $do$
DECLARE
  f text;
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
END $do$;

DO $do$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261010134000', 'mcp_tareas_5_permisos')
    ON CONFLICT DO NOTHING;
  END IF;
END $do$;
