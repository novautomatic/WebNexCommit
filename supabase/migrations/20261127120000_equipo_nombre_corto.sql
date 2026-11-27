-- Nombre corto del equipo para los mensajes (27-nov-2026).
--
-- Los correos y WhatsApp del equipo saludaban con la primera palabra del nombre
-- (split_part(nombre, ' ', 1)): «Juan Pablo Pizarro» recibía «Juan». Ahora cada
-- persona puede tener un «nombre corto» (equipo.nombre_corto, editable en
-- Tareas → Equipo). Si está vacío, todo sigue como antes (primera palabra).
--
-- En vez de copiar el cuerpo de cada función, esta migración las parcha en el
-- lugar: toma la definición viva (pg_get_functiondef) y cambia
--   split_part(<alias>.nombre, ' ', 1)  →  public.nombre_pila(<alias>.nombre)
-- Funciones: aviso de tarea por WhatsApp (encolar_aviso_tarea), correo de tarea
-- (encolar_correo_tarea), resumen diario 08:00 (enviar_resumen_tareas), reunión
-- de entrega 09:00 (reunion_por_persona) y código de la bóveda
-- (boveda_pedir_codigo). Los correos a CLIENTES no se tocan.
-- Si alguien vuelve a correr una migración antigua que redefina una de ellas,
-- hay que volver a correr esta (es idempotente).

ALTER TABLE public.equipo ADD COLUMN IF NOT EXISTS nombre_corto text;
ALTER TABLE public.equipo DROP CONSTRAINT IF EXISTS equipo_nombre_corto_largo;
ALTER TABLE public.equipo ADD CONSTRAINT equipo_nombre_corto_largo
  CHECK (nombre_corto IS NULL OR length(trim(nombre_corto)) BETWEEN 1 AND 30);

-- Nombre con el que se saluda a una persona del equipo.
CREATE OR REPLACE FUNCTION public.nombre_pila(p_nombre text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT nullif(trim(e.nombre_corto), '') FROM public.equipo e
      WHERE e.nombre = p_nombre ORDER BY e.activo DESC LIMIT 1),
    split_part(p_nombre, ' ', 1));
$$;
REVOKE ALL ON FUNCTION public.nombre_pila(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nombre_pila(text) TO authenticated;

-- Parcha las funciones de mensajes (todas las sobrecargas con ese nombre).
DO $$
DECLARE
  nombres  text[] := ARRAY['encolar_aviso_tarea', 'encolar_correo_tarea', 'enviar_resumen_tareas',
                           'reunion_por_persona', 'boveda_pedir_codigo'];
  n        text;
  f        record;
  def      text;
  nuevo    text;
  cambio   boolean;
BEGIN
  FOREACH n IN ARRAY nombres LOOP
    cambio := false;
    FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
              WHERE s.nspname = 'public' AND p.proname = n LOOP
      def := pg_get_functiondef(f.oid);
      nuevo := regexp_replace(
        def,
        'split_part\(\s*((?:[a-z_]+\.)?nombre)\s*,\s*'' ''(?:::text)?\s*,\s*1\s*\)',
        'public.nombre_pila(\1)', 'g');
      IF nuevo <> def THEN
        EXECUTE nuevo;
        cambio := true;
      ELSIF position('nombre_pila' IN def) > 0 THEN
        cambio := true;  -- ya estaba parchada
      END IF;
    END LOOP;
    IF NOT cambio THEN
      RAISE EXCEPTION 'No encontré split_part(nombre, '' '', 1) en %: revisar a mano', n;
    END IF;
  END LOOP;
END $$;

-- Juan Pablo prefiere «JP» en los mensajes.
UPDATE public.equipo SET nombre_corto = 'JP'
 WHERE nombre ILIKE 'Juan Pablo%' AND nombre_corto IS NULL;
