-- ─── Service role (Edge Function portal-clientes) ───────────────────────────
-- Guarda la contraseña inicial cifrada (se ve una vez, 72 h) y manda la bienvenida.
CREATE OR REPLACE FUNCTION public.portal_acceso_preparar(p_contacto uuid, p_user uuid, p_clave text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  c       public.cliente_contactos;
  secreto text;
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_empresa text;
BEGIN
  SELECT * INTO c FROM public.cliente_contactos WHERE id = p_contacto AND activo AND anonimizado_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contacto inactivo o inexistente.'; END IF;
  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'portal_claves_secreto';
  IF secreto IS NULL THEN RAISE EXCEPTION 'Falta el secreto portal_claves_secreto (corre la parte 2).'; END IF;
  UPDATE public.cliente_contactos SET user_id = p_user, acceso_enviado_at = now() WHERE id = c.id;
  INSERT INTO public.portal_claves (contacto_id, token_hash, clave, expira_at)
  VALUES (c.id, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), encode(pgp_sym_encrypt(p_clave, secreto), 'base64'),
          now() + interval '72 hours')
  ON CONFLICT (contacto_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, clave = EXCLUDED.clave,
                                          expira_at = EXCLUDED.expira_at, created_at = now();
  SELECT coalesce(nullif(trim(cl.empresa), ''), cl.nombre) INTO v_empresa FROM public.clientes cl WHERE cl.id = c.cliente_id;
  PERFORM public.tcliente_enviar('cliente_bienvenida', ARRAY[c.email], jsonb_build_object(
    'nombre', split_part(trim(c.nombre), ' ', 1), 'empresa', v_empresa, 'usuario', c.email,
    'enlace_clave', 'https://www.nexcommit.com/mi-espacio?clave=' || v_token,
    'enlace', public.tcliente_enlace(c.id)), c.id);
END $$;

-- Canjea un enlace de correo (1 día) por el correo del contacto; la Edge
-- Function con eso emite la sesión de Supabase.
CREATE OR REPLACE FUNCTION public.portal_canjear_enlace(p_token text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  UPDATE public.portal_enlaces e SET usos = usos + 1
    FROM public.cliente_contactos c
   WHERE e.token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
     AND e.expira_at > now() AND c.id = e.contacto_id AND c.activo AND c.anonimizado_at IS NULL AND c.user_id IS NOT NULL
  RETURNING c.email INTO v_email;
  RETURN v_email;
END $$;

-- ─── Público (anon): ver la contraseña inicial UNA vez ──────────────────────
CREATE OR REPLACE FUNCTION public.portal_ver_clave(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  k       public.portal_claves;
  secreto text;
  v_email text;
BEGIN
  DELETE FROM public.portal_claves
   WHERE token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
  RETURNING * INTO k;
  IF NOT FOUND OR k.expira_at < now() THEN
    RAISE EXCEPTION 'Este enlace ya se usó o venció. Escríbenos y te mandamos uno nuevo.';
  END IF;
  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'portal_claves_secreto';
  SELECT email INTO v_email FROM public.cliente_contactos WHERE id = k.contacto_id;
  RETURN jsonb_build_object('usuario', v_email, 'clave', pgp_sym_decrypt(decode(k.clave, 'base64'), secreto));
END $$;

REVOKE ALL ON FUNCTION public.tcliente_contacto_guardar(jsonb), public.tcliente_contacto_bloqueo(uuid, boolean),
  public.tcliente_contacto_anonimizar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tcliente_contacto_guardar(jsonb), public.tcliente_contacto_bloqueo(uuid, boolean),
  public.tcliente_contacto_anonimizar(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.portal_acceso_preparar(uuid, uuid, text), public.portal_canjear_enlace(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_acceso_preparar(uuid, uuid, text), public.portal_canjear_enlace(text),
  public.tcliente_contacto_anonimizar(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.portal_ver_clave(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_ver_clave(text) TO anon, authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019121000', 'tareas_clientes_10_acceso')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
