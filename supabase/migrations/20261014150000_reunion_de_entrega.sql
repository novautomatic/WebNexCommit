-- ============================================================================
-- Reunión de entrega: cada fecha de entrega (fecha_limite de una tarea no
-- cancelada) es un día de reunión a las 16:00 de Santiago.
--
-- Todos los días a las 09:00 de Santiago sale UN solo correo, a todo el
-- equipo activo con avisos_correo (un único envío con todos en "Para"):
--   - si hoy hay entregas: "Hoy reunión de entrega a las 16:00" + qué entrega
--     cada persona hoy;
--   - si no: "La próxima reunión de entrega es el <día>" + qué se entrega ese día.
--   - aparte: las demás tareas abiertas de cada uno, por si hace falta
--     comentarlas en la reunión.
-- → POST /avisos/reunion-entrega (back de Agente-Next). Una vez por día.
--
-- Pruebas: SELECT public.enviar_reunion_entrega(true);  (manda ya, sin mirar
-- la hora ni si hoy ya salió).
--
-- Idempotente. Requiere 20261011140000_correo_al_creador.sql.
-- ============================================================================

ALTER TABLE public.avisos_whatsapp DROP CONSTRAINT IF EXISTS avisos_whatsapp_tipo_check;
ALTER TABLE public.avisos_whatsapp ADD CONSTRAINT avisos_whatsapp_tipo_check
  CHECK (tipo IN ('asignada', 'reasignada', 'creada', 'resumen', 'reunion'));

-- "2026-10-14" → "miércoles 14 de octubre"
CREATE OR REPLACE FUNCTION public.fecha_larga(p date)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT (ARRAY['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'])[extract(dow FROM p)::int + 1]
      || ' ' || extract(day FROM p)::int || ' de '
      || (ARRAY['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                'septiembre', 'octubre', 'noviembre', 'diciembre'])[extract(month FROM p)::int]
$$;

-- Tareas agrupadas por persona del equipo activo (+ "Sin asignar" si hay).
--   p_fecha no nula → las que se entregan ese día (todas las personas, aunque
--                     no tengan nada: el correo dice "nada que entregar").
--   p_fecha nula    → las demás abiertas (sin p_excluir), máx. 8 por persona;
--                     solo personas con alguna.
CREATE OR REPLACE FUNCTION public.reunion_por_persona(p_fecha date, p_hoy date, p_excluir date DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH t AS (
    SELECT e.id AS eid, ta.numero, ta.fecha_limite,
           array_position(ARRAY['urgente', 'alta', 'media', 'baja'], ta.prioridad) AS orden_prio,
           jsonb_build_object(
             'titulo', '#' || ta.numero || ' ' || ta.titulo,
             'proyecto', p.nombre,
             'estado', ta.estado,
             'prioridad', ta.prioridad,
             'fecha_limite', ta.fecha_limite,
             'dias', ta.fecha_limite - p_hoy,
             'enlace', 'https://www.nexcommit.com/admin?tab=tareas&tarea=' || ta.numero) AS fila
      FROM public.tareas ta
      JOIN public.proyectos p ON p.id = ta.proyecto_id
      LEFT JOIN public.equipo e ON e.id = ta.responsable_id AND e.activo
     WHERE CASE WHEN p_fecha IS NOT NULL
                THEN ta.fecha_limite = p_fecha AND ta.estado <> 'cancelada'
                ELSE ta.estado NOT IN ('completada', 'cancelada') AND ta.fecha_limite IS DISTINCT FROM p_excluir END
  ), personas AS (
    SELECT id, split_part(nombre, ' ', 1) AS nombre, 0 AS orden FROM public.equipo WHERE activo
    UNION ALL
    SELECT NULL, 'Sin asignar', 1 WHERE EXISTS (SELECT 1 FROM t WHERE eid IS NULL)
  ), grupos AS (
    SELECT pe.nombre, pe.orden,
           (SELECT count(*) FROM t WHERE t.eid IS NOT DISTINCT FROM pe.id) AS total,
           (SELECT coalesce(jsonb_agg(x.fila ORDER BY x.fecha_limite NULLS LAST, x.orden_prio, x.numero), '[]'::jsonb)
              FROM (SELECT * FROM t WHERE t.eid IS NOT DISTINCT FROM pe.id
                     ORDER BY t.fecha_limite NULLS LAST, t.orden_prio, t.numero
                     LIMIT CASE WHEN p_fecha IS NULL THEN 8 END) x) AS tareas
      FROM personas pe
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'total', total, 'tareas', tareas)
                            ORDER BY orden, nombre), '[]'::jsonb)
    FROM grupos
   WHERE p_fecha IS NOT NULL OR total > 0
$$;

CREATE OR REPLACE FUNCTION public.enviar_reunion_entrega(p_forzar boolean DEFAULT false)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ahora       timestamp := now() AT TIME ZONE 'America/Santiago';
  hoy         date := ahora::date;
  url         text := public.avisos_url('reunion-entrega');
  secreto     text;
  para        text[];
  reunion     date;
  entregas    jsonb := '[]'::jsonb;
  pendientes  jsonb;
  req_id      bigint;
BEGIN
  IF NOT p_forzar AND extract(hour FROM ahora) <> 9 THEN
    RETURN 0;
  END IF;
  IF NOT p_forzar AND EXISTS (
    SELECT 1 FROM public.avisos_whatsapp
     WHERE tipo = 'reunion' AND estado <> 'error'
       AND (created_at AT TIME ZONE 'America/Santiago')::date = hoy) THEN
    RETURN 0;
  END IF;
  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'avisos_tareas_secret';
  IF url IS NULL OR secreto IS NULL THEN
    RAISE WARNING 'enviar_reunion_entrega: faltan avisos_tareas_url / avisos_tareas_secret en Vault';
    RETURN 0;
  END IF;

  SELECT array_agg(email ORDER BY nombre) INTO para FROM public.equipo WHERE activo AND avisos_correo;
  IF para IS NULL THEN
    RETURN 0;
  END IF;

  -- Hoy, si hoy vence algo; si no, el próximo día con entregas.
  SELECT min(fecha_limite) INTO reunion
    FROM public.tareas
   WHERE fecha_limite >= hoy AND estado <> 'cancelada'
     AND (fecha_limite = hoy OR estado <> 'completada');

  IF reunion IS NOT NULL THEN
    entregas := public.reunion_por_persona(reunion, hoy);
  END IF;
  pendientes := public.reunion_por_persona(NULL, hoy, reunion);

  IF reunion IS NULL AND jsonb_array_length(pendientes) = 0 THEN
    RETURN 0;
  END IF;

  SELECT net.http_post(
    url     := url,
    body    := jsonb_build_object(
                 'to', to_jsonb(para),
                 'fecha', public.fecha_larga(hoy),
                 'hora', '16:00',
                 'hoy', coalesce(reunion = hoy, false),
                 'reunion', CASE WHEN reunion IS NOT NULL THEN jsonb_build_object(
                              'fecha', reunion, 'texto', public.fecha_larga(reunion), 'dias', reunion - hoy) END,
                 'entregas', entregas,
                 'pendientes', pendientes),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secreto),
    timeout_milliseconds := 20000
  ) INTO req_id;

  INSERT INTO public.avisos_whatsapp (tarea_id, equipo_id, canal, email, tipo, estado, detalle, request_id)
  VALUES (NULL, NULL, 'correo', array_to_string(para, ', '), 'reunion', 'pendiente',
          CASE WHEN reunion = hoy THEN 'Reunión hoy'
               WHEN reunion IS NOT NULL THEN 'Próxima reunión ' || reunion
               ELSE 'Sin reunión agendada' END, req_id);
  RETURN 1;
END $$;

REVOKE ALL ON FUNCTION public.reunion_por_persona(date, date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enviar_reunion_entrega(boolean) FROM PUBLIC, anon, authenticated;

-- pg_cron corre en UTC y Chile cambia de horario: 12 y 13 UTC, y la función
-- solo actúa cuando en Santiago son las 9 (una vez por día).
DO $$
BEGIN
  PERFORM cron.unschedule('reunion-entrega-diaria') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reunion-entrega-diaria');
  PERFORM cron.schedule('reunion-entrega-diaria', '0 12,13 * * *', 'SELECT public.enviar_reunion_entrega()');
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261014150000', 'reunion_de_entrega')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
