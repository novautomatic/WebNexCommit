-- boveda_reiniciar fallaba con «DELETE requires a WHERE clause» (pg_safeupdate).
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
  -- WHERE true: pg_safeupdate rechaza DELETE sin WHERE.
  DELETE FROM public.boveda_entradas WHERE true;
  GET DIAGNOSTICS borradas = ROW_COUNT;
  DELETE FROM public.boveda_config WHERE true;
  RETURN borradas;
END $$;

REVOKE ALL ON FUNCTION public.boveda_reiniciar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.boveda_reiniciar() TO authenticated;
