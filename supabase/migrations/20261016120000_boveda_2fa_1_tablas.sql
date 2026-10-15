-- Bóveda, parte 1/3: código por correo (2.º paso) y llave de respaldo.
--
--  * Para leer la bóveda hay que pasar un código de 6 dígitos que llega al correo
--    de quien entra. Lo aplica la base (RLS), no solo la pantalla.
--  * Al crear una bóveda nueva se guarda además la llave de datos cifrada con un
--    secreto del Vault (boveda_respaldo_secreto, se genera sola aquí). Así un
--    dueño puede restaurar la contraseña maestra con un código al correo.
--    A cambio, quien controle la base Y ese secreto podría abrir la bóveda.
--  * Las bóvedas anteriores (sin respaldo) no se pueden restaurar: ver parte 3.
--
-- Orden: 1, 2, 3. Requiere desplegar antes /avisos/codigo-boveda en el back de
-- Agente-Next (si no, no llegan los códigos). Idempotente.

ALTER TABLE public.boveda_config ADD COLUMN IF NOT EXISTS clave_respaldo text;

-- Secreto que cifra la llave de respaldo. Nadie lo ve: solo lo leen las funciones.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'boveda_respaldo_secreto') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'), 'boveda_respaldo_secreto',
      'Cifra la llave de respaldo de la Bóveda (restaurar contraseña maestra por correo).');
  END IF;
END $$;

-- Códigos enviados: solo se guarda el hash; sin políticas (solo funciones definer).
CREATE TABLE IF NOT EXISTS public.boveda_codigos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id   uuid NOT NULL REFERENCES public.equipo(id) ON DELETE CASCADE,
  proposito   text NOT NULL CHECK (proposito IN ('acceso', 'recuperacion')),
  codigo_hash text NOT NULL,
  intentos    integer NOT NULL DEFAULT 0,
  expira_at   timestamptz NOT NULL,
  usado_at    timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS boveda_codigos_equipo_idx ON public.boveda_codigos (equipo_id, created_at DESC);

-- Quién pasó el código y hasta cuándo (30 min).
CREATE TABLE IF NOT EXISTS public.boveda_sesiones (
  equipo_id uuid PRIMARY KEY REFERENCES public.equipo(id) ON DELETE CASCADE,
  hasta     timestamptz NOT NULL
);

ALTER TABLE public.boveda_codigos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boveda_sesiones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.boveda_codigos, public.boveda_sesiones FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.boveda_verificada()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.boveda_sesiones s
                  WHERE s.equipo_id = public.mi_equipo_id() AND s.hasta > now())
$$;

-- Quien administra la bóveda: un dueño o quien la creó.
CREATE OR REPLACE FUNCTION public.boveda_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.es_dueno()
      OR EXISTS (SELECT 1 FROM public.boveda_config c WHERE c.equipo_id = public.mi_equipo_id())
$$;

-- Lectura solo con el código pasado. El cliente nunca recibe clave_respaldo.
DROP POLICY IF EXISTS boveda_config_leer ON public.boveda_config;
CREATE POLICY boveda_config_leer ON public.boveda_config FOR SELECT TO authenticated
  USING (public.es_equipo() AND public.boveda_verificada());
DROP POLICY IF EXISTS boveda_config_crear ON public.boveda_config;
DROP POLICY IF EXISTS boveda_config_cambiar ON public.boveda_config;
REVOKE ALL ON public.boveda_config FROM authenticated;
GRANT SELECT (equipo_id, sal, iteraciones, clave_envuelta, created_at, updated_at)
  ON public.boveda_config TO authenticated;

DROP POLICY IF EXISTS boveda_entradas_equipo ON public.boveda_entradas;
CREATE POLICY boveda_entradas_equipo ON public.boveda_entradas FOR ALL TO authenticated
  USING (public.es_equipo() AND public.boveda_verificada())
  WITH CHECK (public.es_equipo() AND public.boveda_verificada());

REVOKE ALL ON FUNCTION public.boveda_verificada(), public.boveda_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.boveda_verificada(), public.boveda_admin() TO authenticated;
