-- 16-11-2026: la base se colgó (admin sin login, 504 en /auth/v1/token).
-- Causa: net._http_response llegó a 863 MB en las ~6 h de TTL de pg_net y no
-- tiene índice por id. github_sync_tick, procesar_avisos_* y compañía buscan
-- `WHERE id = request_id`, así que cada búsqueda recorría la tabla entera y,
-- con varios cron por minuto, la CPU quedó tomada.
--
-- Arreglo: las respuestas se procesan en segundos (y las funciones se rinden a
-- los 10–15 min), así que guardar más de 30 min no sirve para nada. Se borran
-- cada 5 min usando el índice por `created` que sí existe.

CREATE OR REPLACE FUNCTION public.limpiar_http_response()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  DELETE FROM net._http_response WHERE created < now() - interval '30 minutes';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.limpiar_http_response() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'limpiar-http-response';
  PERFORM cron.schedule('limpiar-http-response', '*/5 * * * *', 'SELECT public.limpiar_http_response()');
  -- El historial de pg_cron también crece sin límite (~10 cron por minuto):
  -- se guardan 3 días.
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'limpiar-historial-cron';
  PERFORM cron.schedule('limpiar-historial-cron', '10 4 * * *',
    $q$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '3 days'$q$);
  -- Se pausó a mano durante la emergencia; vuelve a correr.
  PERFORM cron.alter_job(jobid, active := true) FROM cron.job WHERE jobname = 'sync-github-tareas';
END $$;
