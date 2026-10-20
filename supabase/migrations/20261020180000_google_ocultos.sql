-- Herramientas Google: avisos del diagnóstico que un dueño marcó "Ya lo hice".
-- { "<clave del aviso>": "<ISO hasta>" } — el aviso vuelve solo al vencer si el problema sigue.
-- Idempotente.
ALTER TABLE public.google_config ADD COLUMN IF NOT EXISTS ocultos jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261020180000', 'google_ocultos')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Verificación:
-- SELECT id, ocultos FROM public.google_config;   -- ocultos = {}
