-- Bóveda de claves del panel: web, usuario y clave, protegidas con una contraseña maestra.
--
-- Todo se cifra en el navegador (AES-GCM 256). La contraseña maestra nunca sale del
-- navegador: Supabase solo guarda texto cifrado. Si se pierde la contraseña maestra,
-- los datos NO se pueden recuperar (ni nosotros ni Supabase podemos abrirlos).
-- Cada persona del equipo tiene su propia bóveda; nadie más puede leer sus filas.

-- Una fila por persona: la llave de datos (DEK) cifrada con una llave derivada
-- de la contraseña maestra (PBKDF2). Cambiar la contraseña solo reenvuelve la DEK.
CREATE TABLE IF NOT EXISTS public.boveda_config (
  equipo_id      uuid PRIMARY KEY REFERENCES public.equipo(id) ON DELETE CASCADE DEFAULT public.mi_equipo_id(),
  sal            text NOT NULL CHECK (char_length(sal) BETWEEN 16 AND 64),
  iteraciones    integer NOT NULL CHECK (iteraciones BETWEEN 100000 AND 5000000),
  clave_envuelta text NOT NULL CHECK (char_length(clave_envuelta) BETWEEN 20 AND 400),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Una fila por clave guardada. `datos` = JSON {sitio, usuario, clave, notas} cifrado.
CREATE TABLE IF NOT EXISTS public.boveda_entradas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id  uuid NOT NULL REFERENCES public.equipo(id) ON DELETE CASCADE DEFAULT public.mi_equipo_id(),
  datos      text NOT NULL CHECK (char_length(datos) BETWEEN 20 AND 20000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS boveda_entradas_equipo_idx ON public.boveda_entradas (equipo_id);

ALTER TABLE public.boveda_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boveda_entradas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS boveda_config_propia ON public.boveda_config;
CREATE POLICY boveda_config_propia ON public.boveda_config FOR ALL TO authenticated
  USING (equipo_id = public.mi_equipo_id()) WITH CHECK (equipo_id = public.mi_equipo_id());

DROP POLICY IF EXISTS boveda_entradas_propias ON public.boveda_entradas;
CREATE POLICY boveda_entradas_propias ON public.boveda_entradas FOR ALL TO authenticated
  USING (equipo_id = public.mi_equipo_id()) WITH CHECK (equipo_id = public.mi_equipo_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boveda_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boveda_entradas TO authenticated;
