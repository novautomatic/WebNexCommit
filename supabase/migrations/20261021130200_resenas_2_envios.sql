-- Reseñas de clientes (parte 2/5): enlace firmado y envíos desde el panel.
-- Los correos salen por el back de Agente-Next (POST /avisos/resena, Gmail de
-- NexCommit) con los secretos de Vault avisos_tareas_url / avisos_tareas_secret.

CREATE OR REPLACE FUNCTION public.resena_token(p_solicitud uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT left(encode(sha256(convert_to(s.decrypted_secret || ':resena:' || p_solicitud, 'UTF8')), 'hex'), 40)
    FROM vault.decrypted_secrets s WHERE s.name = 'resenas_token_secret'
$$;

CREATE OR REPLACE FUNCTION public.resena_email_hash(p_email text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT encode(sha256(convert_to(lower(trim(p_email)), 'UTF8')), 'hex')
$$;

-- Manda (o vuelve a mandar) el correo de una solicitud. p_tipo: solicitud | recordatorio.
CREATE OR REPLACE FUNCTION public.resena_encolar(p_solicitud uuid, p_tipo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s       public.resena_solicitudes;
  url     text := public.avisos_url('resena');
  secreto text;
  enlace  text;
  req_id  bigint;
BEGIN
  SELECT * INTO s FROM public.resena_solicitudes WHERE id = p_solicitud;
  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'avisos_tareas_secret';
  IF url IS NULL OR secreto IS NULL THEN
    RAISE EXCEPTION 'Faltan los secretos avisos_tareas_url / avisos_tareas_secret en Vault.';
  END IF;
  enlace := 'https://www.nexcommit.com/resena?s=' || s.id || '&t=' || public.resena_token(s.id);

  SELECT net.http_post(
    url     := url,
    body    := jsonb_build_object(
                 'tipo', p_tipo, 'to', s.email,
                 'nombre', split_part(trim(s.nombre), ' ', 1),
                 'empresa', (SELECT empresa FROM public.clientes WHERE id = s.cliente_id),
                 'servicio', s.servicio_frase,
                 'enlace', enlace, 'enlace_baja', enlace || '&baja=1',
                 'vence', to_char(s.expira_at AT TIME ZONE 'America/Santiago', 'DD-MM-YYYY')),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secreto),
    timeout_milliseconds := 20000
  ) INTO req_id;

  UPDATE public.resena_solicitudes
     SET envio_tipo = p_tipo, envio_request = req_id, envio_estado = 'pendiente', envio_detalle = NULL,
         enviada_at = CASE WHEN p_tipo = 'solicitud' THEN now() ELSE enviada_at END,
         recordatorio_at = CASE WHEN p_tipo = 'recordatorio' THEN now() ELSE recordatorio_at END
   WHERE id = s.id;
END $$;

-- p_principal = el email de la ficha del cliente; p_contactos = contactos del portal.
-- Se omite (con motivo) quien no tiene correo válido, está bloqueado, pidió no
-- recibir o ya tiene una solicitud vigente.
CREATE OR REPLACE FUNCTION public.resena_enviar(p_cliente uuid, p_servicio text, p_servicio_frase text,
                                                p_principal boolean, p_contactos uuid[] DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c        public.clientes;
  d        record;
  v_id     uuid;
  enviados integer := 0;
  omitidos jsonb := '[]';
  motivo   text;
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'no autorizado' USING ERRCODE = '42501'; END IF;
  SELECT * INTO c FROM public.clientes WHERE id = p_cliente;
  IF c.id IS NULL THEN RAISE EXCEPTION 'No existe ese cliente.'; END IF;
  IF NOT c.activo THEN RAISE EXCEPTION 'El cliente está inactivo.'; END IF;
  IF coalesce(p_servicio, '') !~ '^[a-z0-9-]{2,40}$' OR length(trim(coalesce(p_servicio_frase, ''))) < 2 THEN
    RAISE EXCEPTION 'Elige el servicio.';
  END IF;
  IF NOT coalesce(p_principal, false) AND coalesce(cardinality(p_contactos), 0) = 0 THEN
    RAISE EXCEPTION 'Elige al menos una persona.';
  END IF;

  FOR d IN
    SELECT NULL::uuid AS contacto_id, c.nombre, c.email, NULL::text AS cargo, false AS bloqueado
     WHERE coalesce(p_principal, false)
    UNION ALL
    SELECT k.id, k.nombre, k.email, k.cargo,
           (k.bloqueado_at IS NOT NULL OR NOT k.activo OR k.anonimizado_at IS NOT NULL)
      FROM public.cliente_contactos k
     WHERE k.cliente_id = c.id AND k.id = ANY(coalesce(p_contactos, '{}'))
  LOOP
    motivo := CASE
      WHEN coalesce(d.email, '') !~* '^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$' THEN 'sin correo válido'
      WHEN d.bloqueado THEN 'contacto bloqueado o inactivo'
      WHEN EXISTS (SELECT 1 FROM public.resena_bloqueos b WHERE b.email_hash = public.resena_email_hash(d.email))
        THEN 'pidió no recibir solicitudes de reseña'
      WHEN EXISTS (SELECT 1 FROM public.resena_solicitudes x
                    WHERE lower(x.email) = lower(trim(d.email)) AND x.estado = 'pendiente' AND x.expira_at > now())
        THEN 'ya tiene una solicitud vigente'
      WHEN (SELECT count(*) FROM public.resena_solicitudes WHERE enviada_at > now() - interval '1 day') >= 50
        THEN 'tope de 50 solicitudes por día'
    END;
    IF motivo IS NOT NULL THEN
      omitidos := omitidos || jsonb_build_object('email', d.email, 'motivo', motivo);
      CONTINUE;
    END IF;

    INSERT INTO public.resena_solicitudes (cliente_id, contacto_id, nombre, email, cargo, servicio, servicio_frase, enviada_por)
    VALUES (c.id, d.contacto_id, trim(d.nombre), lower(trim(d.email)), d.cargo, p_servicio,
            left(trim(p_servicio_frase), 80), public.mi_equipo_id())
    RETURNING id INTO v_id;
    PERFORM public.resena_encolar(v_id, 'solicitud');
    enviados := enviados + 1;
  END LOOP;

  RETURN jsonb_build_object('enviados', enviados, 'omitidos', omitidos);
END $$;

REVOKE ALL ON FUNCTION public.resena_token(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resena_email_hash(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resena_encolar(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resena_enviar(uuid, text, text, boolean, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resena_enviar(uuid, text, text, boolean, uuid[]) TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261021130200', 'resenas_2_envios')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
