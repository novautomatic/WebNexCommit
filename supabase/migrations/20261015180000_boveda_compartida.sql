-- Bóveda compartida: pasa de una bóveda por persona a UNA bóveda del equipo, con una
-- sola contraseña maestra común. Las claves siguen cifradas en el navegador.
--
-- Qué conserva: la bóveda que ya tiene claves guardadas (con su contraseña maestra).
-- Qué borra: solo las bóvedas VACÍAS que otros miembros crearon sin guardar nada.
-- Si hubiera más de una bóveda con claves, se detiene sin cambiar nada (transacción).

DO $$
DECLARE con_claves integer;
BEGIN
  SELECT count(*) INTO con_claves FROM public.boveda_config c
  WHERE EXISTS (SELECT 1 FROM public.boveda_entradas e WHERE e.equipo_id = c.equipo_id);
  IF con_claves > 1 THEN
    RAISE EXCEPTION 'Hay % bovedas con claves guardadas; unificarlas requiere revision manual.', con_claves;
  END IF;

  DELETE FROM public.boveda_config c
  WHERE NOT EXISTS (SELECT 1 FROM public.boveda_entradas e WHERE e.equipo_id = c.equipo_id);
END $$;

-- Una sola fila de configuración para todo el equipo.
CREATE UNIQUE INDEX IF NOT EXISTS boveda_config_unica ON public.boveda_config ((true));

-- Que borrar a una persona del equipo no borre la bóveda ni sus claves.
ALTER TABLE public.boveda_config DROP CONSTRAINT IF EXISTS boveda_config_equipo_id_fkey;
ALTER TABLE public.boveda_entradas ALTER COLUMN equipo_id DROP NOT NULL;
ALTER TABLE public.boveda_entradas DROP CONSTRAINT IF EXISTS boveda_entradas_equipo_id_fkey;
ALTER TABLE public.boveda_entradas ADD CONSTRAINT boveda_entradas_equipo_id_fkey
  FOREIGN KEY (equipo_id) REFERENCES public.equipo(id) ON DELETE SET NULL;

-- Permisos: todo el equipo lee y administra las claves (siguen cifradas); solo un
-- dueño puede cambiar la contraseña maestra. Nadie puede borrar la configuración
-- desde el panel (sin política DELETE), para no perder la bóveda por error.
DROP POLICY IF EXISTS boveda_config_propia ON public.boveda_config;
DROP POLICY IF EXISTS boveda_config_leer ON public.boveda_config;
DROP POLICY IF EXISTS boveda_config_crear ON public.boveda_config;
DROP POLICY IF EXISTS boveda_config_cambiar ON public.boveda_config;
CREATE POLICY boveda_config_leer ON public.boveda_config FOR SELECT TO authenticated
  USING (public.es_equipo());
CREATE POLICY boveda_config_crear ON public.boveda_config FOR INSERT TO authenticated
  WITH CHECK (public.es_equipo());
CREATE POLICY boveda_config_cambiar ON public.boveda_config FOR UPDATE TO authenticated
  USING (public.es_dueno()) WITH CHECK (public.es_dueno());

DROP POLICY IF EXISTS boveda_entradas_propias ON public.boveda_entradas;
DROP POLICY IF EXISTS boveda_entradas_equipo ON public.boveda_entradas;
CREATE POLICY boveda_entradas_equipo ON public.boveda_entradas FOR ALL TO authenticated
  USING (public.es_equipo()) WITH CHECK (public.es_equipo());

REVOKE DELETE ON public.boveda_config FROM authenticated;
