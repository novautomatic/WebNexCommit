-- Recordatorios de pendientes: solo lo que vence dentro de una semana (27-nov-2026).
--
-- Antes, el resumen diario de las 08:00 (correo y WhatsApp) listaba TODAS las
-- tareas abiertas de cada persona, vencieran cuando vencieran. Ahora solo incluye
-- las que vencen en los próximos N días (N = public.dias_aviso_tareas(), 7) y las
-- que ya están atrasadas. Las tareas sin fecha límite no entran en el aviso
-- (siguen en el panel). Si una persona se queda sin tareas en esa ventana, ese día
-- no recibe resumen.
-- La reunión de entrega de las 09:00 usa la misma ventana en su lista de «otras
-- tareas abiertas»; las entregas del día no cambian.
--
-- Para cambiar el plazo, redefinir public.dias_aviso_tareas() (un solo lugar).
-- Parcha las funciones vivas (conserva el nombre corto de 20261127120000); es
-- idempotente. Si una migración antigua redefine alguna, volver a correr esta.

CREATE OR REPLACE FUNCTION public.dias_aviso_tareas()
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT 7 $$;
GRANT EXECUTE ON FUNCTION public.dias_aviso_tareas() TO authenticated;

DO $$
DECLARE
  f      record;
  def    text;
  nuevo  text;
  pat    text;
  rempl  text;
  n      integer;
  tocado integer := 0;
BEGIN
  FOR f IN
    SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
     WHERE s.nspname = 'public' AND p.proname IN ('enviar_resumen_tareas', 'reunion_por_persona')
  LOOP
    def := pg_get_functiondef(f.oid);
    CONTINUE WHEN position('dias_aviso_tareas' IN def) > 0;  -- ya parchada

    IF f.proname = 'enviar_resumen_tareas' THEN
      pat   := '(ta\.estado NOT IN \(''completada'', ''cancelada''\))(\s+ORDER BY ta\.fecha_limite NULLS LAST)';
      rempl := '\1' || E'\n           AND ta.fecha_limite <= hoy + public.dias_aviso_tareas()' || '\2';
    ELSE
      pat   := '(ELSE\s+ta\.estado NOT IN \(''completada'', ''cancelada''\)\s+AND ta\.fecha_limite IS DISTINCT FROM p_excluir)';
      rempl := '\1 AND ta.fecha_limite <= p_hoy + public.dias_aviso_tareas()';
    END IF;

    SELECT count(*) INTO n FROM regexp_matches(def, pat, 'g');
    IF n <> 1 THEN
      RAISE EXCEPTION 'No pude parchar % (coincidencias: %): revisar a mano', f.proname, n;
    END IF;
    nuevo := regexp_replace(def, pat, rempl);
    EXECUTE nuevo;
    tocado := tocado + 1;
  END LOOP;
  RAISE NOTICE 'Funciones parchadas: %', tocado;
END $$;
