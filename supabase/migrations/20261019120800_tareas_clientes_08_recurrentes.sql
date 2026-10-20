-- ─── Plantillas recurrentes ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tcliente_proxima(p_frecuencia text, p_dia integer, p_desde date)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_frecuencia = 'semanal'
    THEN p_desde + ((p_dia - extract(isodow FROM p_desde)::int + 7) % 7)
    ELSE CASE WHEN make_date(extract(year FROM p_desde)::int, extract(month FROM p_desde)::int, p_dia) >= p_desde
              THEN make_date(extract(year FROM p_desde)::int, extract(month FROM p_desde)::int, p_dia)
              ELSE (make_date(extract(year FROM p_desde)::int, extract(month FROM p_desde)::int, p_dia) + interval '1 month')::date END
  END
$$;

-- p: { id?, cliente_id, contacto_id, encargado_id, titulo, tarea_cliente,
--      tarea_encargado, entregables: [texto], frecuencia, dia, dias_cliente, dias_encargado }
CREATE OR REPLACE FUNCTION public.tcliente_plantilla_guardar(p jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id  uuid := nullif(p->>'id', '')::uuid;
  v_ent text[];
  v_fr  text := p->>'frecuencia';
  v_dia integer := (p->>'dia')::int;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  SELECT array_agg(left(trim(x), 300)) INTO v_ent FROM jsonb_array_elements_text(coalesce(p->'entregables', '[]')) x
   WHERE length(trim(x)) > 0;
  IF v_ent IS NULL THEN RAISE EXCEPTION 'Agrega al menos un entregable para el cliente.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cliente_contactos WHERE id = (p->>'contacto_id')::uuid
                    AND cliente_id = (p->>'cliente_id')::uuid AND activo) THEN
    RAISE EXCEPTION 'Elige quién del cliente debe cumplir la tarea.';
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO public.tareas_cliente_plantillas (cliente_id, contacto_id, encargado_id, titulo, tarea_cliente, tarea_encargado,
      entregables, frecuencia, dia, dias_cliente, dias_encargado, proxima_fecha, creada_por)
    VALUES ((p->>'cliente_id')::uuid, (p->>'contacto_id')::uuid, (p->>'encargado_id')::uuid, trim(p->>'titulo'),
      trim(p->>'tarea_cliente'), trim(p->>'tarea_encargado'), v_ent, v_fr, v_dia, (p->>'dias_cliente')::int,
      (p->>'dias_encargado')::int, public.tcliente_proxima(v_fr, v_dia, public.hoy_cl()), public.mi_equipo_id())
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.tareas_cliente_plantillas
       SET contacto_id = (p->>'contacto_id')::uuid, encargado_id = (p->>'encargado_id')::uuid, titulo = trim(p->>'titulo'),
           tarea_cliente = trim(p->>'tarea_cliente'), tarea_encargado = trim(p->>'tarea_encargado'), entregables = v_ent,
           frecuencia = v_fr, dia = v_dia, dias_cliente = (p->>'dias_cliente')::int, dias_encargado = (p->>'dias_encargado')::int,
           proxima_fecha = public.tcliente_proxima(v_fr, v_dia, public.hoy_cl())
     WHERE id = v_id AND cliente_id = (p->>'cliente_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'La plantilla no existe.'; END IF;
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.tcliente_plantilla_activar(p_id uuid, p_activa boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  UPDATE public.tareas_cliente_plantillas
     SET activa = p_activa,
         proxima_fecha = CASE WHEN p_activa THEN public.tcliente_proxima(frecuencia, dia, public.hoy_cl()) ELSE proxima_fecha END
   WHERE id = p_id;
END $$;

-- ─── Solicitudes y derechos (lado equipo) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.tcliente_solicitud_rechazar(p_id uuid, p_respuesta text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF length(trim(coalesce(p_respuesta, ''))) < 3 THEN RAISE EXCEPTION 'Explícale al cliente por qué.'; END IF;
  UPDATE public.cliente_solicitudes SET estado = 'rechazada', respuesta = trim(p_respuesta),
         resuelta_por = public.mi_equipo_id(), resuelta_at = now()
   WHERE id = p_id AND estado = 'nueva';
END $$;

-- Art. 11 Ley 21.719: la respuesta va POR ESCRITO al correo del titular y se
-- guarda respaldo (el registro de ese correo no lo borra la retención). Si se
-- rechaza, el correo le dice que tiene 30 días hábiles para reclamar ante la
-- Agencia. Para una supresión: primero responder, después «Eliminar datos».
CREATE OR REPLACE FUNCTION public.tcliente_derecho_resolver(p_id uuid, p_estado text, p_respuesta text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d public.derechos_solicitudes;
  c public.cliente_contactos;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF p_estado NOT IN ('atendida', 'rechazada') THEN RAISE EXCEPTION 'Estado desconocido.'; END IF;
  IF length(trim(coalesce(p_respuesta, ''))) < 3 THEN RAISE EXCEPTION 'Escribe la respuesta: le llega por correo y queda como constancia.'; END IF;
  UPDATE public.derechos_solicitudes SET estado = p_estado, respuesta = trim(p_respuesta),
         atendida_por = public.mi_equipo_id(), atendida_at = now()
   WHERE id = p_id AND estado = 'pendiente'
  RETURNING * INTO d;
  IF NOT FOUND THEN RAISE EXCEPTION 'Esa solicitud ya estaba resuelta.'; END IF;
  SELECT * INTO c FROM public.cliente_contactos WHERE id = d.contacto_id AND anonimizado_at IS NULL;
  IF FOUND THEN
    PERFORM public.tcliente_enviar('derecho_respuesta', ARRAY[c.email], jsonb_build_object(
      'nombre', split_part(trim(c.nombre), ' ', 1), 'derecho', d.tipo, 'estado', d.estado,
      'respuesta', d.respuesta, 'pedido', public.fecha_larga((d.created_at AT TIME ZONE 'America/Santiago')::date)), c.id);
    UPDATE public.derechos_solicitudes SET respuesta_enviada_at = now() WHERE id = d.id;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.tcliente_puede_editar(public.tareas_cliente), public.tcliente_proxima(text, integer, date)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tcliente_entregable_marcar(uuid, boolean),
  public.tcliente_registrar_archivo(uuid, uuid, text, text, bigint, text), public.tcliente_quitar_archivo(uuid),
  public.tcliente_plantilla_guardar(jsonb), public.tcliente_plantilla_activar(uuid, boolean),
  public.tcliente_solicitud_rechazar(uuid, text), public.tcliente_derecho_resolver(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tcliente_entregable_marcar(uuid, boolean),
  public.tcliente_registrar_archivo(uuid, uuid, text, text, bigint, text), public.tcliente_quitar_archivo(uuid),
  public.tcliente_plantilla_guardar(jsonb), public.tcliente_plantilla_activar(uuid, boolean),
  public.tcliente_solicitud_rechazar(uuid, text), public.tcliente_derecho_resolver(uuid, text, text) TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019120800', 'tareas_clientes_08_recurrentes')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
