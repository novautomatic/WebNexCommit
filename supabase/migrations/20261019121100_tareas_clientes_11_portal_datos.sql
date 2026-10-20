-- Tareas de clientes (parte 11/14): funciones del portal /mi-espacio.
-- Todas filtran por el cliente de la sesión (mi_cliente_portal()).

CREATE OR REPLACE FUNCTION public.portal_yo()
RETURNS public.cliente_contactos LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cliente_contactos;
BEGIN
  SELECT * INTO c FROM public.cliente_contactos WHERE id = public.mi_contacto_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'Tu cuenta no tiene un espacio de cliente activo.'; END IF;
  RETURN c;
END $$;

-- Todo lo que el cliente ve. Sin notas internas ni historial interno.
CREATE OR REPLACE FUNCTION public.portal_datos()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cliente_contactos := public.portal_yo();
BEGIN
  UPDATE public.cliente_contactos SET ultimo_ingreso_at = now() WHERE id = c.id;
  RETURN jsonb_build_object(
    'contacto', jsonb_build_object('nombre', c.nombre, 'email', c.email, 'telefono', c.telefono, 'cargo', c.cargo,
                                   'aviso_privacidad_at', c.aviso_privacidad_at),
    'cliente', (SELECT jsonb_build_object('nombre', nombre, 'empresa', empresa) FROM public.clientes WHERE id = c.cliente_id),
    'tareas', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', t.id, 'numero', t.numero, 'titulo', t.titulo, 'tarea_cliente', t.tarea_cliente,
        'tarea_encargado', t.tarea_encargado, 'fecha_cliente', t.fecha_cliente, 'fecha_encargado', t.fecha_encargado,
        'estado_cliente', t.estado_cliente, 'estado_encargado', t.estado_encargado, 'entregada_at', t.entregada_at,
        'cerrada_at', t.cerrada_at, 'cancelada_at', t.cancelada_at, 'created_at', t.created_at,
        'responsable', co.nombre, 'es_mia', t.contacto_id = c.id, 'encargado', e.nombre,
        'entregables', coalesce((SELECT jsonb_agg(jsonb_build_object('id', x.id, 'texto', x.texto, 'hecho', x.hecho) ORDER BY x.orden)
                                   FROM public.tareas_cliente_entregables x WHERE x.tarea_id = t.id), '[]'),
        'archivos', coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'nombre', a.nombre, 'ruta', a.ruta, 'tamano', a.tamano,
                                   'tipo', a.tipo, 'entregable_id', a.entregable_id, 'subido_por', a.subido_por,
                                   'mio', a.subido_contacto_id = c.id, 'created_at', a.created_at) ORDER BY a.created_at)
                                FROM public.tareas_cliente_archivos a
                               WHERE a.tarea_id = t.id AND a.eliminado_at IS NULL AND a.borrado_at IS NULL), '[]'),
        'notas', coalesce((SELECT jsonb_agg(jsonb_build_object('id', n.id, 'autor', n.autor_nombre, 'texto', n.texto,
                                   'entregable_id', n.entregable_id, 'del_equipo', n.autor_equipo_id IS NOT NULL,
                                   'created_at', n.created_at) ORDER BY n.created_at)
                             FROM public.tareas_cliente_notas n WHERE n.tarea_id = t.id AND NOT n.interna), '[]'),
        'historial', coalesce((SELECT jsonb_agg(jsonb_build_object('actor', h.actor, 'accion', h.accion, 'detalle', h.detalle,
                                   'created_at', h.created_at) ORDER BY h.created_at DESC)
                                 FROM public.tareas_cliente_historial h WHERE h.tarea_id = t.id AND h.visible_cliente), '[]')
      ) ORDER BY (t.cerrada_at IS NOT NULL OR t.cancelada_at IS NOT NULL), t.fecha_cliente)
      FROM public.tareas_cliente t
      JOIN public.cliente_contactos co ON co.id = t.contacto_id
      JOIN public.equipo e ON e.id = t.encargado_id
     WHERE t.cliente_id = c.cliente_id), '[]'),
    'solicitudes', coalesce((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'titulo', s.titulo, 'detalle', s.detalle,
        'estado', s.estado, 'respuesta', s.respuesta, 'created_at', s.created_at) ORDER BY s.created_at DESC)
      FROM public.cliente_solicitudes s WHERE s.cliente_id = c.cliente_id), '[]'),
    'derechos', coalesce((SELECT jsonb_agg(jsonb_build_object('tipo', d.tipo, 'estado', d.estado, 'respuesta', d.respuesta,
        'vence_el', d.vence_el, 'created_at', d.created_at) ORDER BY d.created_at DESC)
      FROM public.derechos_solicitudes d WHERE d.contacto_id = c.id), '[]'));
END $$;

-- ─── Derechos del titular ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.portal_aviso_visto()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.cliente_contactos SET aviso_privacidad_at = coalesce(aviso_privacidad_at, now()) WHERE id = public.mi_contacto_id()
$$;

CREATE OR REPLACE FUNCTION public.portal_rectificar(p_nombre text, p_telefono text, p_cargo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cliente_contactos := public.portal_yo();
BEGIN
  IF length(trim(coalesce(p_nombre, ''))) = 0 THEN RAISE EXCEPTION 'Tu nombre no puede quedar vacío.'; END IF;
  UPDATE public.cliente_contactos SET nombre = left(trim(p_nombre), 120), telefono = left(nullif(trim(p_telefono), ''), 30),
         cargo = left(nullif(trim(p_cargo), ''), 80) WHERE id = c.id;
  INSERT INTO public.derechos_solicitudes (contacto_id, tipo, estado, respuesta, atendida_at)
  VALUES (c.id, 'rectificacion', 'atendida', 'Corregido por el titular desde el portal', now());
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019121100', 'tareas_clientes_11_portal_datos')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
