-- Plazo de respuesta a solicitudes de derechos según la ley VIGENTE (Ley 19.628, art. 16:
-- 2 días hábiles). Antes estaba en 30 días corridos (Ley 21.719, que aún no rige: su
-- postergación al 1-dic-2027, boletín 18.623-07, sigue en el Congreso al 26-oct-2026).
-- Días hábiles = lunes a viernes; los feriados no se descuentan (el plazo queda más corto, nunca más largo).
-- Idempotente.

CREATE OR REPLACE FUNCTION public.sumar_dias_habiles(p_desde date, p_dias integer)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT d::date
  FROM generate_series(p_desde + 1, p_desde + 31, interval '1 day') AS d
  WHERE extract(isodow FROM d) < 6
  ORDER BY d
  OFFSET greatest(p_dias, 1) - 1
  LIMIT 1
$$;

ALTER TABLE public.derechos_solicitudes
  ALTER COLUMN vence_el SET DEFAULT public.sumar_dias_habiles((now() AT TIME ZONE 'America/Santiago')::date, 2);

-- Las pendientes que ya existen pasan al plazo nuevo (sin alargar ninguna).
UPDATE public.derechos_solicitudes
SET vence_el = least(vence_el, public.sumar_dias_habiles((created_at AT TIME ZONE 'America/Santiago')::date, 2))
WHERE estado = 'pendiente';

COMMENT ON TABLE public.derechos_solicitudes IS
  'Prueba de cumplimiento Ley 19.628 art. 16: respuesta por escrito en 2 días hábiles y respaldo del envío. No la borra la retención.';

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261026120000', 'ley_19628_plazo_derechos')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Verificación:
-- SELECT public.sumar_dias_habiles('2026-10-30', 2);   -- viernes → martes 2026-11-03
-- SELECT column_default FROM information_schema.columns
--  WHERE table_name = 'derechos_solicitudes' AND column_name = 'vence_el';   -- sumar_dias_habiles(..., 2)
-- SELECT estado, count(*), min(vence_el), max(vence_el) FROM public.derechos_solicitudes GROUP BY estado;
