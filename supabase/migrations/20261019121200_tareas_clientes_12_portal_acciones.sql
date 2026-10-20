-- "Listo, entregué": exige todos los entregables marcados.
CREATE OR REPLACE FUNCTION public.portal_entregar(p_tarea uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.cliente_contactos := public.portal_yo();
  t public.tareas_cliente;
  falta text;
BEGIN
  SELECT * INTO t FROM public.tareas_cliente WHERE id = p_tarea AND cliente_id = c.cliente_id FOR UPDATE;
  IF NOT FOUND OR NOT coalesce(public.tcliente_puede_editar(t), false) THEN RAISE EXCEPTION 'Esta tarea ya no espera una entrega tuya.'; END IF;
  SELECT string_agg(texto, ', ' ORDER BY orden) INTO falta FROM public.tareas_cliente_entregables WHERE tarea_id = t.id AND NOT hecho;
  IF falta IS NOT NULL THEN RAISE EXCEPTION 'Te falta marcar: %', falta; END IF;
  UPDATE public.tareas_cliente SET estado_cliente = 'entregada', entregada_at = now(), updated_at = now() WHERE id = t.id;
  PERFORM public.tcliente_log(t.id, 'Entregó todo 📦');
  PERFORM public.tcliente_correo_equipo(ARRAY[t.encargado_id], 'encargado_entrega',
    jsonb_build_object('quien', c.nombre, 'tareas', jsonb_build_array(public.tcliente_json_correo(t.id))), ARRAY[t.id]);
END $$;

CREATE OR REPLACE FUNCTION public.portal_nota(p_tarea uuid, p_texto text, p_entregable uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.cliente_contactos := public.portal_yo();
  t public.tareas_cliente;
BEGIN
  SELECT * INTO t FROM public.tareas_cliente WHERE id = p_tarea AND cliente_id = c.cliente_id AND cancelada_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'No encontramos esa tarea.'; END IF;
  IF length(trim(coalesce(p_texto, ''))) = 0 THEN RAISE EXCEPTION 'Escribe tu nota.'; END IF;
  INSERT INTO public.tareas_cliente_notas (tarea_id, entregable_id, autor_contacto_id, autor_nombre, texto)
  VALUES (t.id, p_entregable, c.id, c.nombre, left(trim(p_texto), 4000));
  PERFORM public.tcliente_correo_equipo(ARRAY[t.encargado_id], 'encargado_nota',
    jsonb_build_object('quien', c.nombre, 'nota', left(trim(p_texto), 1000),
                       'tareas', jsonb_build_array(public.tcliente_json_correo(t.id))), ARRAY[t.id]);
END $$;

CREATE OR REPLACE FUNCTION public.portal_solicitud(p_titulo text, p_detalle text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cliente_contactos := public.portal_yo();
BEGIN
  IF (SELECT count(*) FROM public.cliente_solicitudes WHERE contacto_id = c.id AND created_at > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'Ya enviaste varias solicitudes hoy. Te respondemos pronto.';
  END IF;
  INSERT INTO public.cliente_solicitudes (cliente_id, contacto_id, titulo, detalle)
  VALUES (c.cliente_id, c.id, trim(p_titulo), trim(p_detalle));
  PERFORM public.tcliente_correo_equipo(public.tcliente_duenos(), 'solicitud_nueva', jsonb_build_object(
    'quien', c.nombre, 'cliente', (SELECT nombre FROM public.clientes WHERE id = c.cliente_id),
    'titulo', trim(p_titulo), 'detalle', left(trim(p_detalle), 1500),
    'enlace_equipo', 'https://www.nexcommit.com/admin?tab=clientes-tareas&vista=solicitudes'));
END $$;

-- Acceso y portabilidad: copia completa (JSON) + constancia.
CREATE OR REPLACE FUNCTION public.portal_mis_datos(p_tipo text DEFAULT 'acceso')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cliente_contactos := public.portal_yo();
BEGIN
  INSERT INTO public.derechos_solicitudes (contacto_id, tipo, estado, respuesta, atendida_at)
  VALUES (c.id, CASE WHEN p_tipo = 'portabilidad' THEN 'portabilidad' ELSE 'acceso' END, 'atendida', 'Descarga desde el portal', now());
  RETURN jsonb_build_object('generado_el', now(), 'responsable', 'NexCommit · nexcommit@gmail.com',
    'datos', public.portal_datos(),
    'tratamiento', jsonb_build_object(
      'finalidad', 'Coordinar las tareas y entregas de tu proyecto con NexCommit',
      'base_legal', 'Ejecución del contrato de servicios (Ley 21.719)',
      'destinatarios', jsonb_build_array('Supabase (base de datos y archivos, EE.UU.)', 'Google Gmail (envío de correos, EE.UU.)',
                                         'Vercel (sitio y servidor de correos, EE.UU.)'),
      'conservacion', 'Archivos: 180 días después de cerrar la tarea. Tareas y notas: 24 meses después de cerradas. Tu ficha: se anonimiza 12 meses después de terminar la relación.'));
END $$;

-- Supresión, oposición y bloqueo: los resuelve un dueño (plazo legal 30 días).
CREATE OR REPLACE FUNCTION public.portal_derecho(p_tipo text, p_detalle text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cliente_contactos := public.portal_yo();
BEGIN
  IF p_tipo NOT IN ('supresion', 'oposicion', 'bloqueo') THEN RAISE EXCEPTION 'Derecho desconocido.'; END IF;
  IF EXISTS (SELECT 1 FROM public.derechos_solicitudes WHERE contacto_id = c.id AND tipo = p_tipo AND estado = 'pendiente') THEN
    RAISE EXCEPTION 'Ya tienes una solicitud de este tipo en curso.';
  END IF;
  INSERT INTO public.derechos_solicitudes (contacto_id, tipo, detalle, acuse_enviado_at)
  VALUES (c.id, p_tipo, left(trim(p_detalle), 2000), now());
  -- Art. 11: acuse de recibo al titular.
  PERFORM public.tcliente_enviar('derecho_recibido', ARRAY[c.email], jsonb_build_object(
    'nombre', split_part(trim(c.nombre), ' ', 1), 'derecho', p_tipo, 'vence', public.fecha_larga(public.hoy_cl() + 30)), c.id);
  PERFORM public.tcliente_correo_equipo(public.tcliente_duenos(), 'derecho_nuevo', jsonb_build_object(
    'quien', c.nombre, 'cliente', (SELECT nombre FROM public.clientes WHERE id = c.cliente_id), 'derecho', p_tipo,
    'detalle', left(trim(p_detalle), 1500), 'vence', public.fecha_larga(public.hoy_cl() + 30),
    'enlace_equipo', 'https://www.nexcommit.com/admin?tab=clientes-tareas&vista=solicitudes'));
END $$;

REVOKE ALL ON FUNCTION public.portal_yo() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_datos(), public.portal_entregar(uuid), public.portal_nota(uuid, text, uuid),
  public.portal_solicitud(text, text), public.portal_aviso_visto(), public.portal_mis_datos(text),
  public.portal_rectificar(text, text, text), public.portal_derecho(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_datos(), public.portal_entregar(uuid), public.portal_nota(uuid, text, uuid),
  public.portal_solicitud(text, text), public.portal_aviso_visto(), public.portal_mis_datos(text),
  public.portal_rectificar(text, text, text), public.portal_derecho(text, text) TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019121200', 'tareas_clientes_12_portal_acciones')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
