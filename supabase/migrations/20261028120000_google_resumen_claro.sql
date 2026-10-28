-- «Resumen claro» del panel Herramientas Google (nexcommit.com/admin?tab=google):
-- historia diaria de Google Ads para comparar cualquier rango de fechas, metas del
-- dueño y el historial del analista de resultados (con su conversación).
-- Igual que las otras tablas google_*: las lee y escribe SOLO el back de Agente-Next
-- (service role). RLS activo, sin políticas, sin permisos para anon/authenticated.
-- Idempotente: se puede volver a correr.

-- ── Historia diaria de Google Ads ────────────────────────────────────────────
-- Una fila por cliente + nivel + día + clave. Nivel: campana (clave = nombre),
-- palabra (grupo|texto|concordancia), termino (grupo|búsqueda), dispositivo
-- (campaña|dispositivo). Montos en CLP. Solo métricas agregadas de la cuenta de Ads.
CREATE TABLE IF NOT EXISTS public.google_ads_diario (
  cliente           text NOT NULL,
  nivel             text NOT NULL CHECK (nivel IN ('campana', 'palabra', 'termino', 'dispositivo')),
  fecha             date NOT NULL,
  clave             text NOT NULL,
  campana           text,
  grupo             text,
  texto             text,
  concordancia      text,
  impr              integer NOT NULL DEFAULT 0,
  clics             integer NOT NULL DEFAULT 0,
  costo             integer NOT NULL DEFAULT 0,
  conv              numeric(12,2) NOT NULL DEFAULT 0,
  valor             numeric(14,2) NOT NULL DEFAULT 0,
  cuota             numeric(6,4),
  perd_presupuesto  numeric(6,4),
  perd_ranking      numeric(6,4),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cliente, nivel, fecha, clave)
);
CREATE INDEX IF NOT EXISTS google_ads_diario_rango_idx ON public.google_ads_diario (cliente, fecha);

-- ── Metas mensuales del dueño (contactos, costo por contacto, ventas, ROAS…) ──
ALTER TABLE public.google_config ADD COLUMN IF NOT EXISTS metas jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ── Analista de resultados ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.google_analista (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente          text NOT NULL DEFAULT 'nexcommit',
  created_at       timestamptz NOT NULL DEFAULT now(),
  creado_por       text,
  desde            date NOT NULL,
  hasta            date NOT NULL,
  cdesde           date,
  chasta           date,
  modelo           text,
  tokens_in        integer,
  tokens_out       integer,
  costo_usd        numeric(10,5),
  plan             jsonb NOT NULL,                    -- respuesta del analista (titular, plan, cambios…)
  datos            jsonb,                             -- agregados que vio (para responder preguntas)
  conversacion     jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{rol: dueno|analista, texto, at}]
  cambios_creados  integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS google_analista_cliente_idx ON public.google_analista (cliente, created_at DESC);

-- ── Cambios propuestos por el analista ───────────────────────────────────────
ALTER TABLE public.google_cambios DROP CONSTRAINT IF EXISTS google_cambios_origen_check;
ALTER TABLE public.google_cambios ADD CONSTRAINT google_cambios_origen_check
  CHECK (origen IN ('ia', 'manual', 'regla', 'analista'));

-- ── Seguridad: solo service role ─────────────────────────────────────────────
ALTER TABLE public.google_ads_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_analista   ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_ads_diario, public.google_analista FROM anon, authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261028120000', 'google_resumen_claro')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Verificación:
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('google_ads_diario', 'google_analista');  -- las 2 en true
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'google_config' AND column_name = 'metas';  -- 1 fila
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'google_cambios_origen_check';  -- incluye 'analista'
-- (después de abrir «Resumen claro» o de la pasada del script)
-- SELECT cliente, nivel, min(fecha), max(fecha), count(*) FROM public.google_ads_diario GROUP BY 1, 2 ORDER BY 1, 2;
