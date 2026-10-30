-- Herramientas Google multi-cliente: varios clientes en el mismo panel
-- (nexcommit.com/admin?tab=google&cliente=…). Cada tabla google_* gana la columna
-- `cliente`; las filas que ya existen quedan como 'nexcommit'. La lista de clientes y
-- sus valores iniciales viven en el back (repo privado), no aquí: este repo es público.
-- google_config pasa de una fila (id = 1) a una fila por cliente (PK = cliente).
-- Se conserva la columna id para que el back anterior siga funcionando mientras se
-- despliega el nuevo. Idempotente: se puede volver a correr.

-- ── google_config: una fila por cliente ──────────────────────────────────────
ALTER TABLE public.google_config ADD COLUMN IF NOT EXISTS cliente text;
UPDATE public.google_config SET cliente = 'nexcommit' WHERE cliente IS NULL;
ALTER TABLE public.google_config ALTER COLUMN cliente SET DEFAULT 'nexcommit';
ALTER TABLE public.google_config ALTER COLUMN cliente SET NOT NULL;
ALTER TABLE public.google_config DROP CONSTRAINT IF EXISTS google_config_id_check;

DO $$
BEGIN
  -- Si la PK todavía es id, se cambia a cliente.
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.google_config'::regclass AND c.contype = 'p' AND a.attname = 'id'
  ) THEN
    ALTER TABLE public.google_config DROP CONSTRAINT google_config_pkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.google_config'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.google_config ADD CONSTRAINT google_config_pkey PRIMARY KEY (cliente);
  END IF;
END $$;

ALTER TABLE public.google_config ALTER COLUMN id DROP NOT NULL;
ALTER TABLE public.google_config ALTER COLUMN id DROP DEFAULT;

-- ── google_cambios ───────────────────────────────────────────────────────────
ALTER TABLE public.google_cambios ADD COLUMN IF NOT EXISTS cliente text NOT NULL DEFAULT 'nexcommit';
CREATE INDEX IF NOT EXISTS google_cambios_cliente_idx ON public.google_cambios (cliente, estado, created_at DESC);

ALTER TABLE public.google_cambios DROP CONSTRAINT IF EXISTS google_cambios_tipo_check;
ALTER TABLE public.google_cambios ADD CONSTRAINT google_cambios_tipo_check CHECK (tipo IN (
  'negativa', 'quitar_negativa', 'palabra_nueva', 'pausar_palabra', 'activar_palabra',
  'presupuesto_diario', 'cpc_maximo', 'pausar_grupo', 'activar_grupo', 'sufijo_url'
));

-- ── google_analisis ──────────────────────────────────────────────────────────
ALTER TABLE public.google_analisis ADD COLUMN IF NOT EXISTS cliente text NOT NULL DEFAULT 'nexcommit';
CREATE INDEX IF NOT EXISTS google_analisis_cliente_idx ON public.google_analisis (cliente, created_at DESC);

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261022140000', 'google_multicliente')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Verificación:
-- SELECT cliente, ticket_promedio, cpa_objetivo FROM public.google_config ORDER BY cliente;  -- 'nexcommit' (los demás aparecen al guardar su Configuración)
-- SELECT cliente, count(*) FROM public.google_cambios GROUP BY cliente;   -- lo existente en 'nexcommit'
-- SELECT cliente, count(*) FROM public.google_analisis GROUP BY cliente;  -- idem
-- SELECT conname FROM pg_constraint WHERE conrelid = 'public.google_config'::regclass AND contype = 'p';  -- google_config_pkey (cliente)
