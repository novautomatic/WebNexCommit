-- Aprobar lo que entregó el cliente.
CREATE OR REPLACE FUNCTION public.tcliente_aprobar(p_tarea uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  UPDATE public.tareas_cliente SET estado_cliente = 'aprobada', aprobada_at = now(), updated_at = now()
   WHERE id = p_tarea AND estado_cliente = 'entregada' AND cancelada_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo se aprueba una entrega que el cliente ya marcó como lista.'; END IF;
  PERFORM public.tcliente_log(p_tarea, 'Aprobó la entrega del cliente ✅');
  PERFORM public.tcliente_revisar_cierre(p_tarea);
END $$;

-- Devolver: falta algo. El cliente vuelve a recibir avisos.
CREATE OR REPLACE FUNCTION public.tcliente_devolver(p_tarea uuid, p_nota text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tareas_cliente;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF length(trim(coalesce(p_nota, ''))) < 3 THEN RAISE EXCEPTION 'Cuéntale al cliente qué falta.'; END IF;
  UPDATE public.tareas_cliente SET estado_cliente = 'devuelta', entregada_at = NULL, aprobada_at = NULL, updated_at = now()
   WHERE id = p_tarea AND estado_cliente IN ('entregada', 'aprobada') AND cerrada_at IS NULL AND cancelada_at IS NULL
   RETURNING * INTO t;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo se devuelve una entrega hecha y una tarea abierta.'; END IF;
  INSERT INTO public.tareas_cliente_notas (tarea_id, autor_equipo_id, autor_nombre, texto)
  VALUES (p_tarea, public.mi_equipo_id(), public.tcliente_actor(), trim(p_nota));
  PERFORM public.tcliente_log(p_tarea, 'Devolvió la entrega: falta algo', trim(p_nota));
  PERFORM public.tcliente_correo_contacto(t.contacto_id, 'cliente_devuelta', ARRAY[p_tarea], jsonb_build_object('nota', trim(p_nota)));
END $$;

CREATE OR REPLACE FUNCTION public.tcliente_encargado_estado(p_tarea uuid, p_estado text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF p_estado NOT IN ('pendiente', 'en_progreso', 'lista') THEN RAISE EXCEPTION 'Estado desconocido.'; END IF;
  UPDATE public.tareas_cliente SET estado_encargado = p_estado, updated_at = now()
   WHERE id = p_tarea AND cerrada_at IS NULL AND cancelada_at IS NULL AND estado_encargado <> p_estado;
  IF NOT FOUND THEN RETURN; END IF;
  PERFORM public.tcliente_log(p_tarea, 'Parte de NexCommit: ' ||
    CASE p_estado WHEN 'pendiente' THEN 'pendiente' WHEN 'en_progreso' THEN 'en progreso' ELSE 'lista ✅' END);
  PERFORM public.tcliente_revisar_cierre(p_tarea);
END $$;

CREATE OR REPLACE FUNCTION public.tcliente_cancelar(p_tarea uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF length(trim(coalesce(p_motivo, ''))) < 3 THEN RAISE EXCEPTION 'Escribe por qué se cancela.'; END IF;
  UPDATE public.tareas_cliente SET cancelada_at = now(), updated_at = now()
   WHERE id = p_tarea AND cerrada_at IS NULL AND cancelada_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'La tarea ya estaba cerrada.'; END IF;
  PERFORM public.tcliente_log(p_tarea, 'Canceló la tarea', trim(p_motivo));
END $$;

CREATE OR REPLACE FUNCTION public.tcliente_nota(p_tarea uuid, p_texto text, p_interna boolean DEFAULT false, p_entregable uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  INSERT INTO public.tareas_cliente_notas (tarea_id, entregable_id, autor_equipo_id, autor_nombre, interna, texto)
  VALUES (p_tarea, p_entregable, public.mi_equipo_id(), public.tcliente_actor(), coalesce(p_interna, false), trim(p_texto));
END $$;

REVOKE ALL ON FUNCTION public.tcliente_revisar_cierre(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tcliente_guardar(jsonb), public.tcliente_aprobar(uuid), public.tcliente_devolver(uuid, text),
  public.tcliente_encargado_estado(uuid, text), public.tcliente_cancelar(uuid, text),
  public.tcliente_nota(uuid, text, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tcliente_guardar(jsonb), public.tcliente_aprobar(uuid), public.tcliente_devolver(uuid, text),
  public.tcliente_encargado_estado(uuid, text), public.tcliente_cancelar(uuid, text),
  public.tcliente_nota(uuid, text, boolean, uuid) TO authenticated;

-- Resultado de cada envío (cron cada minuto + panel).
CREATE OR REPLACE FUNCTION public.procesar_avisos_tareas_cliente()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n integer := 0;
  a record;
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.es_equipo() THEN RAISE EXCEPTION 'no autorizado'; END IF;
  FOR a IN
    SELECT v.id, v.created_at, r.status_code, r.content, r.error_msg, r.timed_out
      FROM public.tareas_cliente_avisos v
      LEFT JOIN net._http_response r ON r.id = v.request_id
     WHERE v.estado = 'pendiente'
  LOOP
    IF a.status_code BETWEEN 200 AND 299 THEN
      UPDATE public.tareas_cliente_avisos SET estado = 'enviado', procesado_at = now() WHERE id = a.id;
    ELSIF a.status_code IS NOT NULL OR a.error_msg IS NOT NULL OR a.timed_out THEN
      UPDATE public.tareas_cliente_avisos SET estado = 'error', procesado_at = now(),
             detalle = left(coalesce(CASE WHEN a.content ~ '^\s*\{' THEN a.content::jsonb ->> 'error' END,
                                     a.error_msg, 'HTTP ' || a.status_code, 'Sin respuesta'), 500)
       WHERE id = a.id;
    ELSIF a.created_at < now() - interval '15 minutes' THEN
      UPDATE public.tareas_cliente_avisos SET estado = 'error', detalle = 'Sin respuesta del back en 15 minutos.', procesado_at = now() WHERE id = a.id;
    ELSE
      CONTINUE;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.procesar_avisos_tareas_cliente() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.procesar_avisos_tareas_cliente() TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019120600', 'tareas_clientes_06_acciones')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
