-- Herramientas Google (nexcommit.com/admin?tab=google): configuración del negocio,
-- cambios propuestos/aprobados para Google Ads y el historial de análisis con IA.
-- Las lee y escribe SOLO el back de Agente-Next (service role, ruta /nexcommit/google);
-- el navegador no tiene ningún permiso directo: RLS activo y sin políticas.
-- Idempotente: se puede volver a correr.

CREATE TABLE IF NOT EXISTS public.google_config (
  id                       integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ticket_promedio          integer NOT NULL DEFAULT 450000,   -- CLP por proyecto cerrado
  tasa_cierre              numeric(5,4) NOT NULL DEFAULT 0.2, -- de cada contacto, cuántos contratan
  cpa_objetivo             integer NOT NULL DEFAULT 20000,    -- CLP por contacto
  presupuesto_mensual_max  integer NOT NULL DEFAULT 150000,   -- CLP
  notas                    text NOT NULL DEFAULT '',
  updated_at               timestamptz NOT NULL DEFAULT now(),
  updated_by               text
);
INSERT INTO public.google_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.google_analisis (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  creado_por  text,
  dias        integer NOT NULL DEFAULT 30,
  modelo      text,
  tokens_in   integer,
  tokens_out  integer,
  costo_usd   numeric(10,5),
  resumen     jsonb NOT NULL,   -- respuesta de la IA (resumen, va_bien, mejorar, cambios…)
  metricas    jsonb             -- totales del período, para comparar semana a semana
);
CREATE INDEX IF NOT EXISTS google_analisis_fecha_idx ON public.google_analisis (created_at DESC);

CREATE TABLE IF NOT EXISTS public.google_cambios (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  tipo         text NOT NULL CHECK (tipo IN ('negativa', 'quitar_negativa', 'palabra_nueva', 'pausar_palabra',
                                             'activar_palabra', 'presupuesto_diario', 'cpc_maximo')),
  datos        jsonb NOT NULL,  -- editable antes de aprobar (campaña, texto, concordancia, monto…)
  motivo       text,
  origen       text NOT NULL DEFAULT 'manual' CHECK (origen IN ('ia', 'manual', 'regla')),
  analisis_id  uuid REFERENCES public.google_analisis(id) ON DELETE SET NULL,
  estado       text NOT NULL DEFAULT 'propuesto' CHECK (estado IN ('propuesto', 'aprobado', 'aplicado', 'error', 'rechazado')),
  creado_por   text,
  aprobado_por text,
  aprobado_at  timestamptz,
  aplicado_at  timestamptz,
  resultado    text             -- lo que respondió el script de Google Ads
);
CREATE INDEX IF NOT EXISTS google_cambios_estado_idx ON public.google_cambios (estado, created_at DESC);

ALTER TABLE public.google_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_analisis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_cambios  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_config, public.google_analisis, public.google_cambios FROM anon, authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261020120000', 'herramientas_google')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Verificación:
-- SELECT * FROM public.google_config;                                  -- 1 fila con 450000 / 0.2
-- SELECT relname, relrowsecurity FROM pg_class
--  WHERE relname IN ('google_config','google_analisis','google_cambios'); -- las 3 en true
