-- ============================================================================
--  Sistema de avisos · parte 3 de 3: cron
--  Cada 5 minutos le pide al back de Agente-Next que revise los avisos
--  (POST /avisos/sistema/revisar, mismos secretos de Vault que los avisos de
--  tareas). El back estima el saldo, mira las fechas y envía lo que toque.
--  Idempotente.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.avisos_revisar()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  url     text := public.avisos_url('sistema/revisar');
  secreto text;
BEGIN
  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'avisos_tareas_secret';
  IF url IS NULL OR secreto IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN net.http_post(
    url := url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secreto),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
END $$;
REVOKE ALL ON FUNCTION public.avisos_revisar() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job
   WHERE jobname IN ('avisos-sistema-revisar', 'avisos-sistema-limpiar');
  PERFORM cron.schedule('avisos-sistema-revisar', '*/5 * * * *', 'SELECT public.avisos_revisar()');
  PERFORM cron.schedule('avisos-sistema-limpiar', '41 4 * * *',
    $q$DELETE FROM public.avisos_envios WHERE created_at < now() - interval '180 days'$q$);
END $$;
