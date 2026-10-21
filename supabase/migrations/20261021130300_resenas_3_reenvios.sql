-- Reseñas de clientes (parte 3/5): reenviar y cancelar desde el panel.

-- Reenviar a mano (máx. 1 cada 24 h). Si ya venció, la reabre por 30 días más.
CREATE OR REPLACE FUNCTION public.resena_reenviar(p_solicitud uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.resena_solicitudes;
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM public.resena_solicitudes WHERE id = p_solicitud;
  IF s.id IS NULL OR s.estado NOT IN ('pendiente', 'vencida') THEN
    RAISE EXCEPTION 'Solo se reenvían solicitudes sin respuesta.';
  END IF;
  IF greatest(s.enviada_at, s.recordatorio_at) > now() - interval '24 hours' THEN
    RAISE EXCEPTION 'Ya se le escribió en las últimas 24 horas.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.resena_bloqueos WHERE email_hash = public.resena_email_hash(s.email)) THEN
    RAISE EXCEPTION 'Esta persona pidió no recibir solicitudes de reseña.';
  END IF;
  UPDATE public.resena_solicitudes
     SET estado = 'pendiente', expira_at = greatest(expira_at, now() + interval '30 days')
   WHERE id = s.id;
  PERFORM public.resena_encolar(s.id, 'recordatorio');
END $$;

CREATE OR REPLACE FUNCTION public.resena_cancelar(p_solicitud uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  UPDATE public.resena_solicitudes SET estado = 'cancelada' WHERE id = p_solicitud AND estado IN ('pendiente', 'vencida');
END $$;

REVOKE ALL ON FUNCTION public.resena_reenviar(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resena_cancelar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resena_reenviar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resena_cancelar(uuid) TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261021130300', 'resenas_3_reenvios')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
