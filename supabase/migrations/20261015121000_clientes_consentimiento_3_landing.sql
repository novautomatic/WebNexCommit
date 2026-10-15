-- ============================================================================
-- Consentimiento de clientes (parte 3/6): la landing /confirmar-datos.
-- Requiere las partes 1 y 2.
-- ============================================================================

-- Valida el enlace (?c=<id>&t=<token>) y devuelve el cliente, o nada.
CREATE OR REPLACE FUNCTION public.cliente_por_enlace(p_cliente uuid, p_token text)
RETURNS public.clientes LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.clientes;
BEGIN
  SELECT * INTO c FROM public.clientes WHERE id = p_cliente AND activo;
  IF c.id IS NULL OR p_token IS NULL OR public.cliente_token(c.id) IS DISTINCT FROM p_token THEN
    RAISE EXCEPTION 'Este enlace no es válido o ya no está vigente. Escríbenos y te mandamos uno nuevo.';
  END IF;
  RETURN c;
END $$;

-- Datos precargados de la landing (solo para quien tiene el enlace).
CREATE OR REPLACE FUNCTION public.consentimiento_ver(p_cliente uuid, p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.clientes := public.cliente_por_enlace(p_cliente, p_token);
BEGIN
  RETURN jsonb_build_object(
    'nombre', c.nombre, 'empresa', c.empresa, 'email', c.email, 'telefono', c.telefono,
    'acepta_politicas', c.acepta_politicas_at IS NOT NULL,
    'acepta_politicas_at', c.acepta_politicas_at,
    'acepta_marketing', c.acepta_marketing);
END $$;

-- Guarda lo que el cliente confirma en la landing.
CREATE OR REPLACE FUNCTION public.consentimiento_guardar(
  p_cliente uuid, p_token text, p_datos jsonb, p_acepta_politicas boolean, p_acepta_marketing boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c        public.clientes := public.cliente_por_enlace(p_cliente, p_token);
  ip       text := nullif(trim(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1)), '');
  ip_h     text := CASE WHEN ip IS NULL THEN NULL ELSE encode(sha256(convert_to(ip, 'UTF8')), 'hex') END;
  v_nombre text := left(trim(coalesce(p_datos ->> 'nombre', c.nombre)), 120);
  v_emp    text := nullif(left(trim(coalesce(p_datos ->> 'empresa', c.empresa, '')), 120), '');
  v_email  text := nullif(lower(trim(coalesce(p_datos ->> 'email', c.email, ''))), '');
  v_tel    text := nullif(left(trim(coalesce(p_datos ->> 'telefono', c.telefono, '')), 30), '');
  cambios  text[] := '{}';
BEGIN
  IF c.acepta_politicas_at IS NULL AND NOT coalesce(p_acepta_politicas, false) THEN
    RAISE EXCEPTION 'Para continuar debes aceptar los términos y la política de privacidad.';
  END IF;
  IF length(v_nombre) = 0 THEN RAISE EXCEPTION 'Escribe tu nombre.'; END IF;
  IF v_email IS NULL OR v_email !~ '^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$' THEN
    RAISE EXCEPTION 'Revisa tu correo: no parece válido.';
  END IF;

  IF v_nombre IS DISTINCT FROM c.nombre THEN cambios := cambios || 'nombre'::text; END IF;
  IF v_emp    IS DISTINCT FROM c.empresa THEN cambios := cambios || 'empresa'::text; END IF;
  IF v_email  IS DISTINCT FROM lower(c.email) THEN cambios := cambios || 'correo'::text; END IF;
  IF v_tel    IS DISTINCT FROM c.telefono THEN cambios := cambios || 'teléfono'::text; END IF;

  PERFORM set_config('app.consentimiento', 'on', true);
  UPDATE public.clientes SET
    nombre                = v_nombre,
    empresa               = v_emp,
    email                 = v_email,
    telefono              = v_tel,
    acepta_politicas_at   = coalesce(acepta_politicas_at, now()),
    consentimiento_origen = coalesce(consentimiento_origen, 'correo'),
    acepta_marketing      = coalesce(p_acepta_marketing, false),
    acepta_marketing_at   = CASE WHEN acepta_marketing IS DISTINCT FROM coalesce(p_acepta_marketing, false)
                                 THEN now() ELSE acepta_marketing_at END
  WHERE id = c.id;
  PERFORM set_config('app.consentimiento', '', true);

  IF array_length(cambios, 1) > 0 THEN
    INSERT INTO public.cliente_consentimientos (cliente_id, accion, origen, detalle, ip_hash)
    VALUES (c.id, 'rectifica_datos', 'correo', 'Corrigió: ' || array_to_string(cambios, ', '), ip_h);
  END IF;
  IF c.acepta_politicas_at IS NULL THEN
    INSERT INTO public.cliente_consentimientos (cliente_id, accion, origen, detalle, ip_hash)
    VALUES (c.id, 'acepta_politicas', 'correo', 'Términos y política de privacidad en nexcommit.com/confirmar-datos', ip_h);
  END IF;
  IF c.acepta_marketing IS DISTINCT FROM coalesce(p_acepta_marketing, false) THEN
    INSERT INTO public.cliente_consentimientos (cliente_id, accion, origen, detalle, ip_hash)
    VALUES (c.id, CASE WHEN p_acepta_marketing THEN 'acepta_marketing' ELSE 'retira_marketing' END, 'correo',
            'Novedades y promociones de NexCommit por correo', ip_h);
  END IF;

  RETURN jsonb_build_object('ok', true, 'acepta_marketing', coalesce(p_acepta_marketing, false));
END $$;

REVOKE ALL ON FUNCTION public.cliente_por_enlace(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consentimiento_ver(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consentimiento_guardar(uuid, text, jsonb, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consentimiento_ver(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consentimiento_guardar(uuid, text, jsonb, boolean, boolean) TO anon, authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261015121000', 'clientes_consentimiento_3_landing')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
