-- ============================================================================
-- Creador: consumo de IA (tokens y costo) por página.
--
--   creador_consumo   una fila por llamada al modelo: generación, edición por
--                     chat o «descartada» (el modelo respondió pero no se pudo
--                     guardar: igual se pagó). Sin textos ni datos personales,
--                     así que NO entra en la retención: el historial de gasto
--                     sobrevive aunque la página o el lead se borren.
--   creador_config    + usd_clp: tipo de cambio para mostrar el costo en pesos.
--
-- El costo lo calcula el backend de Agente-Next con la tarifa vigente de su
-- tabla precios_modelo (tokens reales × tarifa); si el modelo no tiene tarifa
-- cargada, costo_usd queda NULL (nunca 0).
--
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.creador_consumo (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pagina_id     uuid REFERENCES public.creador_paginas(id) ON DELETE SET NULL,
  lead_id       uuid REFERENCES public.creador_leads(id) ON DELETE SET NULL,
  slug          text,
  tipo          text NOT NULL CHECK (tipo IN ('generacion', 'edicion', 'descartada')),
  modelo        text,
  tokens_in     int NOT NULL DEFAULT 0,
  tokens_out    int NOT NULL DEFAULT 0,
  tokens_cache  int NOT NULL DEFAULT 0,
  costo_usd     numeric(12,6),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creador_consumo_pagina_idx ON public.creador_consumo (pagina_id);
CREATE INDEX IF NOT EXISTS creador_consumo_fecha_idx ON public.creador_consumo (created_at DESC);
COMMENT ON TABLE public.creador_consumo IS
  'Tokens y costo (USD) de cada llamada a la IA del Creador. Sin datos personales; no se borra con la retención.';

ALTER TABLE public.creador_config ADD COLUMN IF NOT EXISTS usd_clp numeric(8,2) NOT NULL DEFAULT 950;

-- Historial previo: tokens que ya estaban en creador_mensajes. Hasta hoy el
-- Creador solo usó gpt-4o-mini, así que se valoriza con su tarifa
-- (0,15 entrada / 0,60 salida por millón; esos registros no traían caché).
INSERT INTO public.creador_consumo (pagina_id, lead_id, slug, tipo, modelo, tokens_in, tokens_out, costo_usd, created_at)
SELECT m.pagina_id, m.lead_id, p.slug, m.tipo, 'gpt-4o-mini',
       coalesce(m.tokens_in, 0), coalesce(m.tokens_out, 0),
       round((coalesce(m.tokens_in, 0) * 0.15 + coalesce(m.tokens_out, 0) * 0.60) / 1000000.0, 6),
       m.created_at
  FROM public.creador_mensajes m
  LEFT JOIN public.creador_paginas p ON p.id = m.pagina_id
 WHERE m.rol = 'asistente'
   AND (m.tokens_in IS NOT NULL OR m.tokens_out IS NOT NULL)
   AND NOT EXISTS (SELECT 1 FROM public.creador_consumo c
                    WHERE c.pagina_id IS NOT DISTINCT FROM m.pagina_id AND c.created_at = m.created_at);

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.creador_consumo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creador_consumo FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.creador_consumo FROM authenticated;

DROP POLICY IF EXISTS creador_consumo_leer ON public.creador_consumo;
CREATE POLICY creador_consumo_leer ON public.creador_consumo FOR SELECT TO authenticated USING (public.es_equipo());

-- Columnas editables del panel (ediciones_manuales y productos_max llegan con
-- migraciones anteriores: se otorgan solo si existen).
DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'creador_config'
     AND column_name IN ('activo', 'duracion_dias', 'tope_diario', 'ediciones', 'ediciones_manuales',
                         'productos_max', 'max_caracteres', 'responsable_id', 'usd_clp');
  EXECUTE 'REVOKE UPDATE ON public.creador_config FROM authenticated';
  EXECUTE format('GRANT UPDATE (%s) ON public.creador_config TO authenticated', cols);
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261010160000', 'creador_consumo_ia')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
