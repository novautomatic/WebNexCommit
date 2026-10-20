-- Tareas de clientes (parte 7/14): entregables y archivos (equipo y cliente),
-- plantillas recurrentes, solicitudes, derechos y contactos.

-- ¿Puede la sesión tocar esta tarea? Equipo: si está abierta. Cliente: si es
-- de su empresa y le toca entregar.
CREATE OR REPLACE FUNCTION public.tcliente_puede_editar(t public.tareas_cliente)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(t.cerrada_at IS NULL AND t.cancelada_at IS NULL AND (
    public.es_equipo() OR (t.cliente_id = public.mi_cliente_portal() AND t.estado_cliente IN ('pendiente', 'devuelta'))), false)
$$;

CREATE OR REPLACE FUNCTION public.tcliente_entregable_marcar(p_entregable uuid, p_hecho boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  x public.tareas_cliente_entregables;
  t public.tareas_cliente;
BEGIN
  SELECT * INTO x FROM public.tareas_cliente_entregables WHERE id = p_entregable;
  SELECT * INTO t FROM public.tareas_cliente WHERE id = x.tarea_id;
  IF x.id IS NULL OR NOT coalesce(public.tcliente_puede_editar(t), false) THEN
    RAISE EXCEPTION 'Este entregable ya no se puede cambiar.';
  END IF;
  IF x.hecho = p_hecho THEN RETURN; END IF;
  UPDATE public.tareas_cliente_entregables SET hecho = p_hecho, hecho_at = CASE WHEN p_hecho THEN now() END WHERE id = x.id;
  PERFORM public.tcliente_log(t.id, CASE WHEN p_hecho THEN 'Marcó como listo' ELSE 'Desmarcó' END, x.texto);
END $$;

-- Se llama DESPUÉS de subir el archivo a Storage (ruta "<tarea_id>/<archivo>").
CREATE OR REPLACE FUNCTION public.tcliente_registrar_archivo(p_tarea uuid, p_entregable uuid, p_ruta text,
  p_nombre text, p_tamano bigint, p_tipo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT coalesce(split_part(p_ruta, '/', 1) = p_tarea::text AND public.tcliente_puede_archivo(p_ruta, true), false) THEN
    RAISE EXCEPTION 'No puedes subir archivos a esta tarea ahora.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'tareas-clientes' AND name = p_ruta) THEN
    RAISE EXCEPTION 'El archivo no terminó de subir. Intenta de nuevo.';
  END IF;
  IF p_entregable IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.tareas_cliente_entregables WHERE id = p_entregable AND tarea_id = p_tarea) THEN
    RAISE EXCEPTION 'Ese entregable no es de esta tarea.';
  END IF;
  INSERT INTO public.tareas_cliente_archivos (tarea_id, entregable_id, ruta, nombre, tamano, tipo,
                                              subido_contacto_id, subido_equipo_id, subido_por)
  VALUES (p_tarea, p_entregable, p_ruta, left(coalesce(nullif(trim(p_nombre), ''), 'archivo'), 200), coalesce(p_tamano, 0),
          left(p_tipo, 120), public.mi_contacto_id(), public.mi_equipo_id(), public.tcliente_actor())
  RETURNING id INTO v_id;
  PERFORM public.tcliente_log(p_tarea, 'Subió un archivo', p_nombre);
  RETURN v_id;
END $$;

-- Quitar: se oculta ya y el cron lo borra de Storage. El cliente solo quita
-- lo que subió él, mientras le toca entregar.
CREATE OR REPLACE FUNCTION public.tcliente_quitar_archivo(p_archivo uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a public.tareas_cliente_archivos;
  t public.tareas_cliente;
BEGIN
  SELECT * INTO a FROM public.tareas_cliente_archivos WHERE id = p_archivo AND eliminado_at IS NULL;
  SELECT * INTO t FROM public.tareas_cliente WHERE id = a.tarea_id;
  -- coalesce: un archivo subido por el equipo tiene subido_contacto_id NULL.
  IF a.id IS NULL OR NOT coalesce(public.es_equipo() OR (
       a.subido_contacto_id = public.mi_contacto_id() AND public.tcliente_puede_editar(t)), false) THEN
    RAISE EXCEPTION 'No puedes quitar este archivo.';
  END IF;
  UPDATE public.tareas_cliente_archivos SET eliminado_at = now() WHERE id = a.id;
  PERFORM public.tcliente_log(t.id, 'Quitó un archivo', a.nombre);
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019120700', 'tareas_clientes_07_entregables_archivos')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
