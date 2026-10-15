-- Consentimiento de clientes (parte 6/6). Correr después de la parte 5.

-- ─── Resultado de cada envío (cron cada minuto + panel) ────────────────────
CREATE OR REPLACE FUNCTION public.procesar_correos_clientes()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n integer := 0;
  a record;
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.es_equipo() THEN RAISE EXCEPTION 'no autorizado'; END IF;
  FOR a IN
    SELECT cc.id, cc.created_at, r.status_code, r.content, r.error_msg, r.timed_out
      FROM public.cliente_correos cc
      LEFT JOIN net._http_response r ON r.id = cc.request_id
     WHERE cc.estado = 'pendiente'
  LOOP
    IF a.status_code BETWEEN 200 AND 299 THEN
      UPDATE public.cliente_correos SET estado = 'enviado', detalle = NULL, procesado_at = now() WHERE id = a.id;
    ELSIF a.status_code IS NOT NULL OR a.error_msg IS NOT NULL OR a.timed_out THEN
      UPDATE public.cliente_correos
         SET estado = 'error', procesado_at = now(),
             detalle = left(coalesce(
               CASE WHEN a.content ~ '^\s*\{' THEN a.content::jsonb ->> 'error' END,
               a.error_msg,
               CASE WHEN a.timed_out THEN 'El back no respondió a tiempo.' END,
               'HTTP ' || a.status_code), 500)
       WHERE id = a.id;
    ELSIF a.created_at < now() - interval '15 minutes' THEN
      UPDATE public.cliente_correos SET estado = 'error', detalle = 'Sin respuesta del back en 15 minutos.', procesado_at = now() WHERE id = a.id;
    ELSE
      CONTINUE;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.procesar_correos_clientes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.procesar_correos_clientes() TO authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('procesar-correos-clientes') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'procesar-correos-clientes');
  PERFORM cron.schedule('procesar-correos-clientes', '* * * * *', 'SELECT public.procesar_correos_clientes()');
  PERFORM cron.unschedule('limpiar-correos-clientes') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpiar-correos-clientes');
  PERFORM cron.schedule('limpiar-correos-clientes', '30 4 * * *',
    $c$DELETE FROM public.cliente_correos WHERE created_at < now() - interval '180 days'$c$);
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261015122500', 'clientes_consentimiento_6_procesar')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
