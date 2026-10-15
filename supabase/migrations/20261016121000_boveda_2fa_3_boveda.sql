-- Bóveda, parte 3/3: crear, cambiar contraseña, restaurar y reiniciar.
-- Requiere las partes 1 y 2. La app ya no escribe boveda_config directamente.

-- Crea la bóveda. p_dek = llave de datos en base64 (32 bytes): se guarda cifrada con
-- el secreto del Vault, solo para poder restaurar la contraseña maestra por correo.
CREATE OR REPLACE FUNCTION public.boveda_crear(p_sal text, p_iter integer, p_envuelta text, p_dek text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE secreto text;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF EXISTS (SELECT 1 FROM public.boveda_config) THEN RAISE EXCEPTION 'Ya existe una bóveda del equipo.'; END IF;
  IF length(decode(coalesce(p_dek, ''), 'base64')) <> 32 THEN RAISE EXCEPTION 'Llave de respaldo inválida.'; END IF;
  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'boveda_respaldo_secreto';
  IF secreto IS NULL THEN RAISE EXCEPTION 'Falta el secreto boveda_respaldo_secreto (corre la parte 1).'; END IF;

  INSERT INTO public.boveda_config (sal, iteraciones, clave_envuelta, clave_respaldo)
  VALUES (p_sal, p_iter, p_envuelta, encode(pgp_sym_encrypt(p_dek, secreto), 'base64'));
  INSERT INTO public.boveda_sesiones (equipo_id, hasta) VALUES (public.mi_equipo_id(), now() + interval '30 minutes')
  ON CONFLICT (equipo_id) DO UPDATE SET hasta = EXCLUDED.hasta;
END $$;

-- Nueva contraseña maestra (la app ya reenvolvió la llave de datos en el navegador).
CREATE OR REPLACE FUNCTION public.boveda_cambiar_password(p_sal text, p_iter integer, p_envuelta text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.es_equipo() AND public.boveda_admin() AND public.boveda_verificada()) THEN
    RAISE EXCEPTION 'Solo un dueño o quien creó la bóveda puede cambiar la contraseña maestra (y debe haber pasado el código).';
  END IF;
  UPDATE public.boveda_config SET sal = p_sal, iteraciones = p_iter, clave_envuelta = p_envuelta, updated_at = now();
  IF NOT FOUND THEN RAISE EXCEPTION 'No hay bóveda.'; END IF;
END $$;

-- Restaurar: con el código de recuperación devuelve la llave de datos (base64) para
-- que la app la reenvuelva con la contraseña nueva y llame boveda_cambiar_password.
CREATE OR REPLACE FUNCTION public.boveda_recuperar(p_codigo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v       jsonb;
  secreto text;
  resp    text;
  dek     text;
BEGIN
  IF NOT (public.es_equipo() AND public.boveda_admin()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo un dueño o quien creó la bóveda puede restaurarla.');
  END IF;
  SELECT clave_respaldo INTO resp FROM public.boveda_config;
  IF resp IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esta bóveda se creó sin respaldo y no se puede restaurar.');
  END IF;
  v := public.boveda_validar_codigo('recuperacion', p_codigo);
  IF NOT (v ->> 'ok')::boolean THEN RETURN v; END IF;
  BEGIN
    SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'boveda_respaldo_secreto';
    dek := pgp_sym_decrypt(decode(resp, 'base64'), secreto);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No se pudo abrir el respaldo (¿cambió el secreto del Vault?).');
  END;
  RETURN jsonb_build_object('ok', true, 'dek', dek);
END $$;

-- Borra la bóveda y TODAS sus claves. Solo para bóvedas creadas sin respaldo
-- (las de la primera versión) cuando se perdió la contraseña maestra.
CREATE OR REPLACE FUNCTION public.boveda_reiniciar()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE borradas integer;
BEGIN
  IF NOT (public.es_equipo() AND public.boveda_admin() AND public.boveda_verificada()) THEN
    RAISE EXCEPTION 'Solo un dueño o quien creó la bóveda puede reiniciarla (y debe haber pasado el código).';
  END IF;
  IF EXISTS (SELECT 1 FROM public.boveda_config WHERE clave_respaldo IS NOT NULL) THEN
    RAISE EXCEPTION 'Esta bóveda tiene respaldo: usa «Olvidé mi contraseña» en vez de borrarla.';
  END IF;
  DELETE FROM public.boveda_entradas;
  GET DIAGNOSTICS borradas = ROW_COUNT;
  DELETE FROM public.boveda_config;
  RETURN borradas;
END $$;

REVOKE ALL ON FUNCTION public.boveda_crear(text, integer, text, text), public.boveda_cambiar_password(text, integer, text),
  public.boveda_recuperar(text), public.boveda_reiniciar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.boveda_crear(text, integer, text, text), public.boveda_cambiar_password(text, integer, text),
  public.boveda_recuperar(text), public.boveda_reiniciar() TO authenticated;
