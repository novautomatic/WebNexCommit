-- Bóveda, parte 2/3: pedir y validar el código de 6 dígitos.
-- Requiere la parte 1 y los secretos avisos_tareas_url / avisos_tareas_secret del Vault.

CREATE OR REPLACE FUNCTION public.boveda_estado()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'equipo',       public.es_equipo(),
    'existe',       public.es_equipo() AND EXISTS (SELECT 1 FROM public.boveda_config),
    'verificada',   public.boveda_verificada(),
    'admin',        public.es_equipo() AND public.boveda_admin(),
    'con_respaldo', EXISTS (SELECT 1 FROM public.boveda_config WHERE clave_respaldo IS NOT NULL))
$$;

-- Manda un código nuevo al correo de quien lo pide.
CREATE OR REPLACE FUNCTION public.boveda_pedir_codigo(p_proposito text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  yo      uuid := public.mi_equipo_id();
  m       record;
  cid     uuid := gen_random_uuid();
  codigo  text;
  secreto text;
  url     text := public.avisos_url('codigo-boveda');
BEGIN
  IF yo IS NULL THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF p_proposito NOT IN ('acceso', 'recuperacion') THEN RAISE EXCEPTION 'Propósito inválido.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.boveda_config) THEN RAISE EXCEPTION 'Aún no hay bóveda.'; END IF;
  IF p_proposito = 'recuperacion' THEN
    IF NOT public.boveda_admin() THEN
      RAISE EXCEPTION 'Solo un dueño o quien creó la bóveda puede restaurar la contraseña maestra.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.boveda_config WHERE clave_respaldo IS NOT NULL) THEN
      RAISE EXCEPTION 'Esta bóveda se creó sin respaldo y no se puede restaurar.';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.boveda_codigos WHERE equipo_id = yo AND created_at > now() - interval '60 seconds') THEN
    RAISE EXCEPTION 'Espera un minuto antes de pedir otro código.';
  END IF;
  IF (SELECT count(*) FROM public.boveda_codigos WHERE equipo_id = yo AND created_at > now() - interval '1 hour') >= 6 THEN
    RAISE EXCEPTION 'Pediste demasiados códigos. Intenta de nuevo en una hora.';
  END IF;

  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'avisos_tareas_secret';
  IF url IS NULL OR secreto IS NULL THEN
    RAISE EXCEPTION 'Faltan los secretos avisos_tareas_url / avisos_tareas_secret en Vault.';
  END IF;

  DELETE FROM public.boveda_codigos WHERE created_at < now() - interval '1 day';
  UPDATE public.boveda_codigos SET usado_at = now()
   WHERE equipo_id = yo AND proposito = p_proposito AND usado_at IS NULL;

  -- uuid v4 = bytes aleatorios del sistema; 8 hex = 32 bits, módulo 1e6.
  codigo := lpad((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint % 1000000)::text, 6, '0');
  INSERT INTO public.boveda_codigos (id, equipo_id, proposito, codigo_hash, expira_at)
  VALUES (cid, yo, p_proposito, encode(sha256(convert_to(cid::text || ':' || codigo, 'UTF8')), 'hex'),
          now() + interval '10 minutes');

  SELECT nombre, email INTO m FROM public.equipo WHERE id = yo;
  PERFORM net.http_post(
    url     := url,
    body    := jsonb_build_object('to', m.email, 'nombre', split_part(m.nombre, ' ', 1),
                                  'codigo', codigo, 'proposito', p_proposito, 'minutos', 10),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secreto),
    timeout_milliseconds := 15000);
END $$;

-- Interno: comprueba el código (máx. 5 intentos). Devuelve jsonb, no lanza error al
-- fallar para que el contador de intentos no se deshaga con el rollback.
CREATE OR REPLACE FUNCTION public.boveda_validar_codigo(p_proposito text, p_codigo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  yo uuid := public.mi_equipo_id();
  c  record;
BEGIN
  IF yo IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'No autorizado.'); END IF;
  SELECT * INTO c FROM public.boveda_codigos
   WHERE equipo_id = yo AND proposito = p_proposito AND usado_at IS NULL AND expira_at > now()
   ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El código venció o no existe. Pide uno nuevo.');
  END IF;
  IF c.intentos >= 5 THEN
    UPDATE public.boveda_codigos SET usado_at = now() WHERE id = c.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Demasiados intentos. Pide un código nuevo.');
  END IF;
  IF c.codigo_hash <> encode(sha256(convert_to(c.id::text || ':' || btrim(coalesce(p_codigo, '')), 'UTF8')), 'hex') THEN
    UPDATE public.boveda_codigos SET intentos = intentos + 1 WHERE id = c.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Código incorrecto.', 'restantes', 4 - c.intentos);
  END IF;
  UPDATE public.boveda_codigos SET usado_at = now() WHERE id = c.id;
  INSERT INTO public.boveda_sesiones (equipo_id, hasta) VALUES (yo, now() + interval '30 minutes')
  ON CONFLICT (equipo_id) DO UPDATE SET hasta = EXCLUDED.hasta;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.boveda_verificar_codigo(p_codigo text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.boveda_validar_codigo('acceso', p_codigo)
$$;

CREATE OR REPLACE FUNCTION public.boveda_cerrar_sesion()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.boveda_sesiones WHERE equipo_id = public.mi_equipo_id()
$$;

REVOKE ALL ON FUNCTION public.boveda_validar_codigo(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.boveda_estado(), public.boveda_pedir_codigo(text),
  public.boveda_verificar_codigo(text), public.boveda_cerrar_sesion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.boveda_estado(), public.boveda_pedir_codigo(text),
  public.boveda_verificar_codigo(text), public.boveda_cerrar_sesion() TO authenticated;
