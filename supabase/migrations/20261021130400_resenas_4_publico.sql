-- Reseñas de clientes (parte 4/5): lo que usa la web pública (rol anon).
--   resena_ver / resena_guardar / resena_no_recibir  página /resena (enlace firmado)
--   resenas_publicas()                               reseñas aprobadas para la web

-- Valida el enlace y devuelve la solicitud vigente (o explica por qué no sirve).
CREATE OR REPLACE FUNCTION public.resena_solicitud_valida(p_solicitud uuid, p_token text)
RETURNS public.resena_solicitudes LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.resena_solicitudes;
BEGIN
  SELECT * INTO s FROM public.resena_solicitudes WHERE id = p_solicitud;
  IF s.id IS NULL OR p_token IS NULL OR p_token <> public.resena_token(s.id) THEN
    RAISE EXCEPTION 'Este enlace no es válido. Revisa que esté completo o escríbenos y te mandamos uno nuevo.';
  END IF;
  IF s.estado = 'respondida' THEN
    RAISE EXCEPTION 'Ya recibimos tu reseña. ¡Muchas gracias!';
  END IF;
  IF s.estado = 'cancelada' THEN
    RAISE EXCEPTION 'Este enlace ya no está vigente.';
  END IF;
  IF s.estado = 'vencida' OR s.expira_at < now() THEN
    RAISE EXCEPTION 'Este enlace venció. Escríbenos y te mandamos uno nuevo.';
  END IF;
  RETURN s;
END $$;

CREATE OR REPLACE FUNCTION public.resena_ver(p_solicitud uuid, p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.resena_solicitudes := public.resena_solicitud_valida(p_solicitud, p_token);
BEGIN
  RETURN jsonb_build_object(
    'nombre', s.nombre, 'cargo', s.cargo,
    'empresa', (SELECT empresa FROM public.clientes WHERE id = s.cliente_id),
    'servicio', s.servicio_frase);
END $$;

-- Una sola respuesta por enlace. Devuelve el enlace de Google solo si está encendido.
CREATE OR REPLACE FUNCTION public.resena_guardar(p_solicitud uuid, p_token text, p_texto text, p_nombre text,
                                                 p_cargo text, p_empresa text, p_publicar_nombre boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s       public.resena_solicitudes := public.resena_solicitud_valida(p_solicitud, p_token);
  v_texto text := regexp_replace(trim(coalesce(p_texto, '')), '\n{3,}', E'\n\n', 'g');
  v_nom   text := trim(coalesce(p_nombre, ''));
BEGIN
  IF length(v_texto) < 30 THEN RAISE EXCEPTION 'Cuéntanos un poco más: la reseña necesita al menos 30 caracteres.'; END IF;
  IF length(v_texto) > 1200 THEN RAISE EXCEPTION 'La reseña puede tener hasta 1.200 caracteres.'; END IF;
  IF length(v_nom) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Escribe tu nombre.'; END IF;

  -- Bloquea la fila: dos envíos simultáneos no crean dos reseñas.
  PERFORM 1 FROM public.resena_solicitudes WHERE id = s.id AND estado = 'pendiente' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ya recibimos tu reseña. ¡Muchas gracias!'; END IF;

  INSERT INTO public.resenas (solicitud_id, cliente_id, servicio, texto, nombre, cargo, empresa, publicar_nombre)
  VALUES (s.id, s.cliente_id, s.servicio, v_texto, v_nom,
          nullif(left(trim(coalesce(p_cargo, '')), 80), ''),
          nullif(left(trim(coalesce(p_empresa, '')), 120), ''),
          coalesce(p_publicar_nombre, false));
  UPDATE public.resena_solicitudes SET estado = 'respondida', respondida_at = now() WHERE id = s.id;

  RETURN jsonb_build_object('google_url',
    (SELECT google_url FROM public.resenas_config WHERE google_activo AND google_url IS NOT NULL));
END $$;

-- «No quiero recibir esto»: oposición. Cancela lo pendiente y bloquea futuros envíos.
CREATE OR REPLACE FUNCTION public.resena_no_recibir(p_solicitud uuid, p_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.resena_solicitudes;
BEGIN
  SELECT * INTO s FROM public.resena_solicitudes WHERE id = p_solicitud;
  IF s.id IS NULL OR p_token IS NULL OR p_token <> public.resena_token(s.id) THEN
    RAISE EXCEPTION 'Este enlace no es válido.';
  END IF;
  INSERT INTO public.resena_bloqueos (email_hash) VALUES (public.resena_email_hash(s.email)) ON CONFLICT DO NOTHING;
  UPDATE public.resena_solicitudes SET estado = 'cancelada'
   WHERE lower(email) = lower(s.email) AND estado IN ('pendiente', 'vencida');
END $$;

-- Reseñas aprobadas. Sin consentimiento para el nombre, firma solo la empresa.
CREATE OR REPLACE FUNCTION public.resenas_publicas()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(x ORDER BY x.fecha DESC), '[]')
    FROM (
      SELECT r.id, r.texto, r.servicio,
             CASE WHEN r.publicar_nombre THEN r.nombre END AS nombre,
             CASE WHEN r.publicar_nombre THEN r.cargo END AS cargo,
             coalesce(r.empresa, CASE WHEN NOT r.publicar_nombre THEN 'Cliente de NexCommit' END) AS empresa,
             coalesce(r.revisada_at, r.created_at)::date AS fecha
        FROM public.resenas r
       WHERE r.estado = 'aprobada'
       ORDER BY coalesce(r.revisada_at, r.created_at) DESC
       LIMIT 60
    ) x
$$;

REVOKE ALL ON FUNCTION public.resena_solicitud_valida(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resena_ver(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resena_guardar(uuid, text, text, text, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resena_no_recibir(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resenas_publicas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resena_ver(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resena_guardar(uuid, text, text, text, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resena_no_recibir(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resenas_publicas() TO anon, authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261021130400', 'resenas_4_publico')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
