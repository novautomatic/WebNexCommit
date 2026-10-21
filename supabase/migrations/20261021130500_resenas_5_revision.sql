-- Reseñas de clientes (parte 5/5): revisión en el panel, envíos, recordatorio y retención.

-- Aprobar / rechazar / volver a pendiente (= despublicar). El texto no se edita;
-- solo se puede corregir el servicio al que pertenece.
CREATE OR REPLACE FUNCTION public.resena_revisar(p_resena uuid, p_estado text, p_servicio text DEFAULT NULL, p_motivo text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF p_estado NOT IN ('pendiente', 'aprobada', 'rechazada') THEN RAISE EXCEPTION 'Estado inválido.'; END IF;
  IF p_servicio IS NOT NULL AND p_servicio !~ '^[a-z0-9-]{2,40}$' THEN RAISE EXCEPTION 'Servicio inválido.'; END IF;
  UPDATE public.resenas
     SET estado = p_estado,
         servicio = coalesce(p_servicio, servicio),
         motivo = CASE WHEN p_estado = 'rechazada' THEN nullif(left(trim(coalesce(p_motivo, '')), 300), '') END,
         revisada_por = CASE WHEN p_estado = 'pendiente' THEN NULL ELSE public.mi_equipo_id() END,
         revisada_at  = CASE WHEN p_estado = 'pendiente' THEN NULL ELSE now() END
   WHERE id = p_resena;
  IF NOT FOUND THEN RAISE EXCEPTION 'No existe esa reseña.'; END IF;
END $$;

-- Retiro a pedido del autor (supresión): se borra entera.
CREATE OR REPLACE FUNCTION public.resena_borrar(p_resena uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.resenas WHERE id = p_resena;
END $$;

CREATE OR REPLACE FUNCTION public.resenas_config_guardar(p_google_url text, p_google_activo boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_url text := nullif(trim(coalesce(p_google_url, '')), '');
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  IF coalesce(p_google_activo, false) AND v_url IS NULL THEN
    RAISE EXCEPTION 'Para encender el botón primero pega el enlace de Google.';
  END IF;
  UPDATE public.resenas_config
     SET google_url = v_url, google_activo = coalesce(p_google_activo, false), updated_at = now()
   WHERE id;
END $$;

-- Resultado de cada correo (cron cada minuto + panel).
CREATE OR REPLACE FUNCTION public.procesar_envios_resenas()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n integer := 0;
  a record;
BEGIN
  IF auth.role() = 'authenticated' AND NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'no autorizado'; END IF;
  FOR a IN
    SELECT s.id, coalesce(s.recordatorio_at, s.enviada_at) AS enviada, r.status_code, r.content, r.error_msg, r.timed_out
      FROM public.resena_solicitudes s
      LEFT JOIN net._http_response r ON r.id = s.envio_request
     WHERE s.envio_estado = 'pendiente'
  LOOP
    IF a.status_code BETWEEN 200 AND 299 THEN
      UPDATE public.resena_solicitudes SET envio_estado = 'enviado', envio_detalle = NULL WHERE id = a.id;
    ELSIF a.status_code IS NOT NULL OR a.error_msg IS NOT NULL OR a.timed_out THEN
      UPDATE public.resena_solicitudes
         SET envio_estado = 'error',
             envio_detalle = left(coalesce(
               CASE WHEN a.content ~ '^\s*\{' THEN a.content::jsonb ->> 'error' END,
               a.error_msg,
               CASE WHEN a.timed_out THEN 'El back no respondió a tiempo.' END,
               'HTTP ' || a.status_code), 500)
       WHERE id = a.id;
    ELSIF a.enviada < now() - interval '15 minutes' THEN
      UPDATE public.resena_solicitudes SET envio_estado = 'error', envio_detalle = 'Sin respuesta del back en 15 minutos.' WHERE id = a.id;
    ELSE
      CONTINUE;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- Diario: 1 recordatorio a los 5 días, vencer a los 30 y borrar lo cerrado hace 90.
CREATE OR REPLACE FUNCTION public.resenas_diario()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s           record;
  recordados  integer := 0;
BEGIN
  FOR s IN
    SELECT x.id FROM public.resena_solicitudes x
     WHERE x.estado = 'pendiente' AND x.recordatorio_at IS NULL
       AND x.enviada_at < now() - interval '5 days' AND x.expira_at > now() + interval '1 day'
       AND x.envio_estado = 'enviado'
       AND NOT EXISTS (SELECT 1 FROM public.resena_bloqueos b WHERE b.email_hash = public.resena_email_hash(x.email))
     LIMIT 50
  LOOP
    PERFORM public.resena_encolar(s.id, 'recordatorio');
    recordados := recordados + 1;
  END LOOP;

  UPDATE public.resena_solicitudes SET estado = 'vencida' WHERE estado = 'pendiente' AND expira_at < now();
  DELETE FROM public.resena_solicitudes
   WHERE estado <> 'pendiente' AND coalesce(respondida_at, expira_at) < now() - interval '90 days';
  DELETE FROM public.resenas WHERE estado = 'rechazada' AND revisada_at < now() - interval '90 days';

  RETURN jsonb_build_object('recordatorios', recordados);
END $$;

REVOKE ALL ON FUNCTION public.resena_revisar(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resena_borrar(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resenas_config_guardar(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.procesar_envios_resenas() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resenas_diario() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resena_revisar(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resena_borrar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resenas_config_guardar(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.procesar_envios_resenas() TO authenticated;

-- 13:00 UTC = 10:00 en Santiago (horario de verano) / 09:00 (invierno).
DO $$
BEGIN
  PERFORM cron.unschedule('procesar-envios-resenas') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'procesar-envios-resenas');
  PERFORM cron.schedule('procesar-envios-resenas', '* * * * *', 'SELECT public.procesar_envios_resenas()');
  PERFORM cron.unschedule('resenas-diario') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'resenas-diario');
  PERFORM cron.schedule('resenas-diario', '0 13 * * *', 'SELECT public.resenas_diario()');
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261021130500', 'resenas_5_revision')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
