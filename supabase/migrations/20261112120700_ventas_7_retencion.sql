-- CRM de vendedores (7/7): conservación de datos (Ley 19.628 arts. 4, 9 y 11).
-- Un prospecto que no compró y lleva 12 meses sin movimiento se borra (con sus notas).
-- Los que tienen una venta se conservan: son respaldo del contrato y del pago de comisiones.

CREATE OR REPLACE FUNCTION public.ventas_retencion() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  DELETE FROM ventas_prospectos p
   WHERE p.ultimo_movimiento < now() - interval '12 months'
     AND NOT EXISTS (SELECT 1 FROM ventas_ventas v WHERE v.prospecto_id = p.id)
     AND NOT EXISTS (SELECT 1 FROM ventas_pagos g WHERE g.referencia = p.id AND g.pagado_at IS NULL);
  GET DIAGNOSTICS n = ROW_COUNT;
  -- Pagos de inscritos ya transferidos quedan como registro; su referencia apunta a un prospecto borrado.
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.ventas_retencion() FROM anon, authenticated, public;

COMMENT ON TABLE public.ventas_prospectos IS
  'CRM de vendedores. Datos personales (Ley 19.628): se piden solo para contactar y proponer, con autorización (acepta_contacto_at). Los ve la jefatura y el vendedor asignado. Sin venta y 12 meses sin movimiento → se borran (cron ventas-retencion).';

-- 1.º de cada mes, 08:00 UTC.
DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN
    PERFORM cron.unschedule('ventas-retencion') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ventas-retencion');
    PERFORM cron.schedule('ventas-retencion', '0 8 1 * *', 'SELECT public.ventas_retencion()');
  END IF;
END $$;
