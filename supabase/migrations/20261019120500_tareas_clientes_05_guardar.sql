-- Tareas de clientes (parte 5/14): acciones del equipo sobre una tarea.

CREATE OR REPLACE FUNCTION public.tcliente_revisar_cierre(p_tarea uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.tareas_cliente SET cerrada_at = now(), updated_at = now()
   WHERE id = p_tarea AND cerrada_at IS NULL AND estado_cliente = 'aprobada' AND estado_encargado = 'lista';
  IF FOUND THEN PERFORM public.tcliente_log(p_tarea, 'Tarea cumplida 🎉'); END IF;
END $$;

-- Crea (sin id) o edita una tarea. TODOS los campos son obligatorios.
-- p: { id?, cliente_id, contacto_id, encargado_id, titulo, tarea_cliente,
--      tarea_encargado, fecha_cliente, fecha_encargado, entregables: [{id?, texto}],
--      solicitud_id?, plantilla_id? }
CREATE OR REPLACE FUNCTION public.tcliente_guardar(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id   uuid := nullif(p->>'id', '')::uuid;
  v_cli  uuid := nullif(p->>'cliente_id', '')::uuid;
  v_con  uuid := nullif(p->>'contacto_id', '')::uuid;
  v_enc  uuid := nullif(p->>'encargado_id', '')::uuid;
  v_tit  text := trim(coalesce(p->>'titulo', ''));
  v_tc   text := trim(coalesce(p->>'tarea_cliente', ''));
  v_te   text := trim(coalesce(p->>'tarea_encargado', ''));
  v_fc   date := nullif(p->>'fecha_cliente', '')::date;
  v_fe   date := nullif(p->>'fecha_encargado', '')::date;
  v_ent  jsonb := coalesce(p->'entregables', '[]'::jsonb);
  t      public.tareas_cliente;
  antes  public.tareas_cliente;
  e      jsonb;
  i      integer := 0;
  ids    uuid[] := '{}';
  v_eid  uuid;
  nueva  boolean := v_id IS NULL;
BEGIN
  -- coalesce: sin él, una sesión sin la variable da NULL y el IF no detiene a nadie.
  IF NOT (public.es_equipo() OR coalesce(current_setting('app.tcliente_sistema', true), '') = 'on') THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;
  IF length(v_tit) < 3 THEN RAISE EXCEPTION 'Escribe el objetivo de la tarea.'; END IF;
  IF v_cli IS NULL THEN RAISE EXCEPTION 'Elige el cliente.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cliente_contactos WHERE id = v_con AND cliente_id = v_cli AND activo AND anonimizado_at IS NULL) THEN
    RAISE EXCEPTION 'Elige quién del cliente debe cumplir la tarea.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.equipo WHERE id = v_enc AND activo) THEN RAISE EXCEPTION 'Elige al encargado.'; END IF;
  IF length(v_tc) < 3 THEN RAISE EXCEPTION 'Escribe qué debe hacer el cliente.'; END IF;
  IF length(v_te) < 3 THEN RAISE EXCEPTION 'Escribe qué hará el encargado.'; END IF;
  IF v_fc IS NULL OR v_fe IS NULL THEN RAISE EXCEPTION 'Pon las dos fechas de entrega.'; END IF;
  IF v_fe < v_fc THEN RAISE EXCEPTION 'La fecha del encargado no puede ser antes que la del cliente.'; END IF;
  IF jsonb_typeof(v_ent) <> 'array' OR NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(v_ent) x WHERE length(trim(coalesce(x->>'texto', ''))) > 0) THEN
    RAISE EXCEPTION 'Agrega al menos un entregable para el cliente.';
  END IF;
  IF jsonb_array_length(v_ent) > 30 THEN RAISE EXCEPTION 'Máximo 30 entregables por tarea.'; END IF;

  IF nueva THEN
    IF v_fc < public.hoy_cl() THEN RAISE EXCEPTION 'La fecha del cliente ya pasó.'; END IF;
    INSERT INTO public.tareas_cliente (cliente_id, contacto_id, encargado_id, titulo, tarea_cliente, tarea_encargado,
                                       fecha_cliente, fecha_encargado, plantilla_id, solicitud_id, creada_por)
    VALUES (v_cli, v_con, v_enc, v_tit, v_tc, v_te, v_fc, v_fe, nullif(p->>'plantilla_id', '')::uuid,
            nullif(p->>'solicitud_id', '')::uuid, public.mi_equipo_id())
    RETURNING * INTO t;
    PERFORM public.tcliente_log(t.id, 'Creó la tarea');
  ELSE
    SELECT * INTO antes FROM public.tareas_cliente WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'La tarea no existe.'; END IF;
    IF antes.cerrada_at IS NOT NULL OR antes.cancelada_at IS NOT NULL THEN RAISE EXCEPTION 'La tarea ya está cerrada.'; END IF;
    IF antes.cliente_id <> v_cli THEN RAISE EXCEPTION 'No se puede cambiar el cliente de una tarea.'; END IF;
    UPDATE public.tareas_cliente
       SET contacto_id = v_con, encargado_id = v_enc, titulo = v_tit, tarea_cliente = v_tc, tarea_encargado = v_te,
           fecha_cliente = v_fc, fecha_encargado = v_fe, updated_at = now(),
           aviso_duenos_at = CASE WHEN v_fc > antes.fecha_cliente THEN NULL ELSE aviso_duenos_at END
     WHERE id = v_id RETURNING * INTO t;
    IF v_fc <> antes.fecha_cliente THEN
      PERFORM public.tcliente_log(t.id, 'Cambió la fecha del cliente', public.fecha_larga(antes.fecha_cliente) || ' → ' || public.fecha_larga(v_fc));
    END IF;
    IF v_fe <> antes.fecha_encargado THEN
      PERFORM public.tcliente_log(t.id, 'Cambió la fecha del encargado', public.fecha_larga(antes.fecha_encargado) || ' → ' || public.fecha_larga(v_fe));
    END IF;
    IF v_enc <> antes.encargado_id THEN PERFORM public.tcliente_log(t.id, 'Cambió el encargado'); END IF;
    IF v_con <> antes.contacto_id THEN PERFORM public.tcliente_log(t.id, 'Cambió quién entrega del cliente'); END IF;
    IF (v_tit, v_tc, v_te) IS DISTINCT FROM (antes.titulo, antes.tarea_cliente, antes.tarea_encargado) THEN
      PERFORM public.tcliente_log(t.id, 'Editó la descripción');
    END IF;
  END IF;

  -- Entregables: los que vienen con id se actualizan, los nuevos se crean y
  -- los que ya no vienen se borran.
  FOR e IN SELECT * FROM jsonb_array_elements(v_ent) LOOP
    CONTINUE WHEN length(trim(coalesce(e->>'texto', ''))) = 0;
    i := i + 1;
    v_eid := nullif(e->>'id', '')::uuid;
    IF v_eid IS NOT NULL AND EXISTS (SELECT 1 FROM public.tareas_cliente_entregables WHERE id = v_eid AND tarea_id = t.id) THEN
      UPDATE public.tareas_cliente_entregables SET texto = left(trim(e->>'texto'), 300), orden = i WHERE id = v_eid;
    ELSE
      INSERT INTO public.tareas_cliente_entregables (tarea_id, orden, texto)
      VALUES (t.id, i, left(trim(e->>'texto'), 300)) RETURNING id INTO v_eid;
    END IF;
    ids := ids || v_eid;
  END LOOP;
  DELETE FROM public.tareas_cliente_entregables WHERE tarea_id = t.id AND NOT (id = ANY(ids));

  IF nueva AND t.solicitud_id IS NOT NULL THEN
    UPDATE public.cliente_solicitudes SET estado = 'aceptada', tarea_id = t.id, resuelta_por = public.mi_equipo_id(), resuelta_at = now()
     WHERE id = t.solicitud_id AND cliente_id = t.cliente_id;
  END IF;

  IF nueva OR v_con <> antes.contacto_id THEN
    PERFORM public.tcliente_correo_contacto(t.contacto_id, 'cliente_nueva', ARRAY[t.id]);
  END IF;
  IF (nueva OR v_enc <> antes.encargado_id) AND t.encargado_id IS DISTINCT FROM public.mi_equipo_id() THEN
    PERFORM public.tcliente_correo_equipo(ARRAY[t.encargado_id], 'encargado_asignado',
      jsonb_build_object('tareas', jsonb_build_array(public.tcliente_json_correo(t.id))), ARRAY[t.id]);
  END IF;
  RETURN jsonb_build_object('id', t.id, 'numero', t.numero);
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019120500', 'tareas_clientes_05_guardar')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
