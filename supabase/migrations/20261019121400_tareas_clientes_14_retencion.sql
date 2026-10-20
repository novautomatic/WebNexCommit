-- ─── Retención (Ley 21.719: plazos con algo que los aplique) ────────────────
--   archivos: 180 días después de cerrada/cancelada la tarea
--   tareas, notas e historial: 24 meses después de cerradas
--   contactos desactivados: se anonimizan a los 12 meses (sin tareas abiertas)
--   registro de correos: 180 días (los de derechos, 6 años) · enlaces: 7 días después de vencer
--   derechos_solicitudes: NO se borra (es la prueba de cumplimiento)
CREATE OR REPLACE FUNCTION public.tcliente_retencion()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c        record;
  n_arch   integer;
  n_tareas integer;
  n_cont   integer := 0;
  secreto  text;
BEGIN
  DELETE FROM public.portal_enlaces WHERE expira_at < now() - interval '7 days';
  DELETE FROM public.portal_claves WHERE expira_at < now();
  -- Los correos de derechos (acuse y respuesta) son el respaldo que pide el
  -- art. 11: se guardan 6 años, igual que lo tributario.
  DELETE FROM public.tareas_cliente_avisos
   WHERE created_at < now() - CASE WHEN tipo LIKE 'derecho_%' THEN interval '6 years' ELSE interval '180 days' END;

  UPDATE public.tareas_cliente_archivos a SET eliminado_at = now()
    FROM public.tareas_cliente t
   WHERE t.id = a.tarea_id AND a.eliminado_at IS NULL
     AND coalesce(t.cerrada_at, t.cancelada_at) < now() - interval '180 days';
  GET DIAGNOSTICS n_arch = ROW_COUNT;

  DELETE FROM public.tareas_cliente t
   WHERE coalesce(t.cerrada_at, t.cancelada_at) < now() - interval '24 months'
     AND NOT EXISTS (SELECT 1 FROM public.tareas_cliente_archivos a WHERE a.tarea_id = t.id AND a.borrado_at IS NULL);
  GET DIAGNOSTICS n_tareas = ROW_COUNT;

  FOR c IN
    SELECT id FROM public.cliente_contactos co
     WHERE NOT activo AND anonimizado_at IS NULL AND desactivado_at < now() - interval '12 months'
       AND NOT EXISTS (SELECT 1 FROM public.tareas_cliente t WHERE t.contacto_id = co.id AND t.cerrada_at IS NULL AND t.cancelada_at IS NULL)
  LOOP
    PERFORM public.tcliente_contacto_anonimizar(c.id);
    n_cont := n_cont + 1;
  END LOOP;

  -- Lo que hay que sacar de Storage lo borra la Edge Function (service role).
  IF EXISTS (SELECT 1 FROM public.tareas_cliente_archivos WHERE eliminado_at IS NOT NULL AND borrado_at IS NULL) THEN
    SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'portal_cron_secreto';
    PERFORM net.http_post(
      url := 'https://rhifvtrzetamrfhflfzw.supabase.co/functions/v1/portal-clientes',
      body := jsonb_build_object('accion', 'purgar', 'secreto', secreto),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      timeout_milliseconds := 60000);
  END IF;
  RETURN jsonb_build_object('archivos', n_arch, 'tareas', n_tareas, 'contactos', n_cont);
END $$;

-- Para la Edge Function: qué borrar de Storage y confirmar lo borrado.
CREATE OR REPLACE FUNCTION public.portal_purga_pendiente(p_secreto text)
RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_secreto IS NULL OR p_secreto IS DISTINCT FROM (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'portal_cron_secreto') THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;
  RETURN ARRAY(SELECT ruta FROM public.tareas_cliente_archivos WHERE eliminado_at IS NOT NULL AND borrado_at IS NULL LIMIT 500);
END $$;

CREATE OR REPLACE FUNCTION public.portal_purga_hecha(p_rutas text[])
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.tareas_cliente_archivos SET borrado_at = now() WHERE ruta = ANY(p_rutas)
$$;

REVOKE ALL ON FUNCTION public.tcliente_avisos(boolean), public.tcliente_crear_recurrentes(boolean), public.tcliente_retencion(),
  public.portal_purga_pendiente(text), public.portal_purga_hecha(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_purga_pendiente(text), public.portal_purga_hecha(text[]) TO service_role;

-- pg_cron corre en UTC y Chile cambia de horario: se agenda en las dos horas
-- posibles y la función solo actúa a la hora local correcta.
DO $$
DECLARE j text;
BEGIN
  FOREACH j IN ARRAY ARRAY['tareas-cliente-avisos', 'tareas-cliente-recurrentes', 'tareas-cliente-retencion',
                           'procesar-avisos-tareas-cliente'] LOOP
    PERFORM cron.unschedule(j) WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = j);
  END LOOP;
  PERFORM cron.schedule('tareas-cliente-avisos', '0 13,14 * * *', 'SELECT public.tcliente_avisos()');
  PERFORM cron.schedule('tareas-cliente-recurrentes', '0 10,11 * * *', 'SELECT public.tcliente_crear_recurrentes()');
  PERFORM cron.schedule('tareas-cliente-retencion', '45 4 * * *', 'SELECT public.tcliente_retencion()');
  PERFORM cron.schedule('procesar-avisos-tareas-cliente', '* * * * *', 'SELECT public.procesar_avisos_tareas_cliente()');
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019121400', 'tareas_clientes_14_retencion')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
