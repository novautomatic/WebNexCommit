-- ============================================================================
-- Consentimiento de clientes (parte 5/6): envíos desde el panel.
--
--   cliente_enviar_invitacion(ids)   "primer correo" a quien aún no acepta:
--                                    enlace a /confirmar-datos (no promociona)
--   clientes_enviar_campana(...)     correo a clientes que ACEPTARON promociones;
--                                    el filtro está aquí, no en el panel
--
-- Salen por el back de Agente-Next (POST /avisos/cliente-correo, Gmail de
-- NexCommit) con los secretos de Vault avisos_tareas_url / avisos_tareas_secret.
-- Gmail permite ~500 correos al día: tope de 400 por día entre todos los envíos.
-- Requiere 20261011120000 (avisos_url) y las partes 1 a 4.
-- ============================================================================

-- Encola un correo a un cliente. Devuelve el id del registro.
CREATE OR REPLACE FUNCTION public.encolar_correo_cliente(p_cliente uuid, p_tipo text, p_payload jsonb, p_campana uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c       public.clientes;
  url     text := public.avisos_url('cliente-correo');
  secreto text;
  req_id  bigint;
  v_id    uuid;
BEGIN
  SELECT * INTO c FROM public.clientes WHERE id = p_cliente;
  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'avisos_tareas_secret';
  IF url IS NULL OR secreto IS NULL THEN
    RAISE EXCEPTION 'Faltan los secretos avisos_tareas_url / avisos_tareas_secret en Vault.';
  END IF;

  SELECT net.http_post(
    url     := url,
    body    := p_payload || jsonb_build_object(
                 'tipo', p_tipo, 'to', c.email,
                 'nombre', split_part(trim(c.nombre), ' ', 1), 'empresa', c.empresa,
                 'enlace', public.cliente_enlace(c.id)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secreto),
    timeout_milliseconds := 20000
  ) INTO req_id;

  INSERT INTO public.cliente_correos (cliente_id, campana_id, tipo, email, request_id, enviado_por)
  VALUES (c.id, p_campana, p_tipo, c.email, req_id, public.mi_equipo_id())
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.correos_clientes_cupo_hoy()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 400 - count(*)::int FROM public.cliente_correos
   WHERE (created_at AT TIME ZONE 'America/Santiago')::date = (now() AT TIME ZONE 'America/Santiago')::date
$$;

-- ─── Primer correo ─────────────────────────────────────────────────────────
-- Solo a clientes activos, con correo, que aún no aceptan, y máximo uno cada
-- 24 h por cliente (para no insistir).
CREATE OR REPLACE FUNCTION public.cliente_enviar_invitacion(p_clientes uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c        record;
  enviados integer := 0;
  cupo     integer;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'no autorizado'; END IF;
  cupo := public.correos_clientes_cupo_hoy();
  PERFORM set_config('app.consentimiento', 'on', true);
  FOR c IN
    SELECT id FROM public.clientes
     WHERE id = ANY(p_clientes) AND activo AND acepta_politicas_at IS NULL
       AND email ~* '^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$'
       AND (invitacion_enviada_at IS NULL OR invitacion_enviada_at < now() - interval '24 hours')
  LOOP
    EXIT WHEN enviados >= cupo;
    PERFORM public.encolar_correo_cliente(c.id, 'invitacion', '{}'::jsonb);
    UPDATE public.clientes SET invitacion_enviada_at = now() WHERE id = c.id;
    enviados := enviados + 1;
  END LOOP;
  PERFORM set_config('app.consentimiento', '', true);
  RETURN jsonb_build_object('enviados', enviados, 'omitidos', coalesce(array_length(p_clientes, 1), 0) - enviados);
END $$;

-- ─── Campaña: solo a quienes aceptaron promociones ─────────────────────────
-- p_clientes NULL = todos los que aceptaron; si viene, se cruza con ellos.
CREATE OR REPLACE FUNCTION public.clientes_enviar_campana(p_asunto text, p_cuerpo text, p_clientes uuid[] DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_asunto text := left(trim(coalesce(p_asunto, '')), 150);
  v_cuerpo text := left(trim(coalesce(p_cuerpo, '')), 8000);
  ids      uuid[];
  v_camp   uuid;
  cid      uuid;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'no autorizado'; END IF;
  IF length(v_asunto) < 3 THEN RAISE EXCEPTION 'Escribe un asunto.'; END IF;
  IF length(v_cuerpo) < 10 THEN RAISE EXCEPTION 'Escribe el mensaje.'; END IF;

  SELECT coalesce(array_agg(id), '{}') INTO ids FROM public.clientes
   WHERE activo AND acepta_marketing AND acepta_politicas_at IS NOT NULL
     AND email ~* '^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$'
     AND (p_clientes IS NULL OR id = ANY(p_clientes));
  IF cardinality(ids) = 0 THEN RAISE EXCEPTION 'Ninguno de los clientes elegidos aceptó recibir correos.'; END IF;
  IF cardinality(ids) > public.correos_clientes_cupo_hoy() THEN
    RAISE EXCEPTION 'Hoy quedan % correos disponibles (tope de Gmail) y la campaña tiene %.', public.correos_clientes_cupo_hoy(), cardinality(ids);
  END IF;

  INSERT INTO public.campanas_correo (asunto, cuerpo, enviado_por, destinatarios)
  VALUES (v_asunto, v_cuerpo, public.mi_equipo_id(), cardinality(ids))
  RETURNING id INTO v_camp;

  FOREACH cid IN ARRAY ids LOOP
    PERFORM public.encolar_correo_cliente(cid, 'campana', jsonb_build_object('asunto', v_asunto, 'cuerpo', v_cuerpo), v_camp);
  END LOOP;

  RETURN jsonb_build_object('campana', v_camp, 'enviados', cardinality(ids),
                            'excluidos', CASE WHEN p_clientes IS NULL THEN 0 ELSE cardinality(p_clientes) - cardinality(ids) END);
END $$;

REVOKE ALL ON FUNCTION public.encolar_correo_cliente(uuid, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.correos_clientes_cupo_hoy() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cliente_enviar_invitacion(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clientes_enviar_campana(text, text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.correos_clientes_cupo_hoy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cliente_enviar_invitacion(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clientes_enviar_campana(text, text, uuid[]) TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261015122000', 'clientes_consentimiento_5_envios')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
