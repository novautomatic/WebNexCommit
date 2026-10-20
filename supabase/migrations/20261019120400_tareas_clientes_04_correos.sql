-- Tareas de clientes (parte 4/14): correos. Salen por el back de Agente-Next
-- (POST /avisos/tareas-cliente, Gmail de NexCommit) con los secretos de Vault
-- avisos_tareas_url / avisos_tareas_secret, igual que los demás avisos.

-- Enlace personal de 1 día que abre el portal completo del contacto.
CREATE OR REPLACE FUNCTION public.tcliente_enlace(p_contacto uuid, p_tarea uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_token text := encode(extensions.gen_random_bytes(24), 'hex');
BEGIN
  INSERT INTO public.portal_enlaces (token_hash, contacto_id, expira_at)
  VALUES (encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), p_contacto, now() + interval '1 day');
  RETURN 'https://www.nexcommit.com/mi-espacio?e=' || v_token || coalesce('&t=' || p_tarea::text, '');
END $$;

-- Una tarea, tal como la ve el correo del cliente.
CREATE OR REPLACE FUNCTION public.tcliente_json_correo(p_tarea uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'numero', t.numero, 'titulo', t.titulo, 'que_hacer', t.tarea_cliente,
    'fecha', public.fecha_larga(t.fecha_cliente), 'dias', t.fecha_cliente - public.hoy_cl(),
    'estado', t.estado_cliente,
    'encargado', split_part(e.nombre, ' ', 1),
    'cliente', c.nombre,
    'contacto', split_part(co.nombre, ' ', 1),
    'entregables', coalesce((SELECT jsonb_agg(jsonb_build_object('texto', x.texto, 'hecho', x.hecho) ORDER BY x.orden)
                               FROM public.tareas_cliente_entregables x WHERE x.tarea_id = t.id), '[]'::jsonb),
    'enlace_equipo', 'https://www.nexcommit.com/admin?tab=clientes-tareas&tarea=' || t.numero)
  FROM public.tareas_cliente t
  JOIN public.equipo e ON e.id = t.encargado_id
  JOIN public.clientes c ON c.id = t.cliente_id
  JOIN public.cliente_contactos co ON co.id = t.contacto_id
  WHERE t.id = p_tarea
$$;

-- Envía y deja registro. Nunca lanza error: un correo que falla no debe
-- deshacer lo que hizo el usuario (queda "error" en el registro).
CREATE OR REPLACE FUNCTION public.tcliente_enviar(p_tipo text, p_para text[], p_payload jsonb,
  p_contacto uuid DEFAULT NULL, p_equipo uuid DEFAULT NULL, p_tareas uuid[] DEFAULT '{}')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  url     text := public.avisos_url('tareas-cliente');
  secreto text;
  req_id  bigint;
  v_id    uuid;
BEGIN
  IF p_para IS NULL OR cardinality(p_para) = 0 THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'avisos_tareas_secret';
  IF url IS NOT NULL AND secreto IS NOT NULL THEN
    SELECT net.http_post(
      url     := url,
      body    := p_payload || jsonb_build_object('tipo', p_tipo, 'to', to_jsonb(p_para)),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secreto),
      timeout_milliseconds := 20000) INTO req_id;
  END IF;
  INSERT INTO public.tareas_cliente_avisos (tipo, para, contacto_id, equipo_id, tareas, request_id, estado, detalle)
  VALUES (p_tipo, array_to_string(p_para, ', '), p_contacto, p_equipo, coalesce(p_tareas, '{}'), req_id,
          CASE WHEN req_id IS NULL THEN 'error' ELSE 'pendiente' END,
          CASE WHEN req_id IS NULL THEN 'Faltan avisos_tareas_url / avisos_tareas_secret en Vault.' END)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Correo a un contacto del cliente con una o varias tareas.
-- p_tipo: cliente_nueva | cliente_diario | cliente_devuelta
CREATE OR REPLACE FUNCTION public.tcliente_correo_contacto(p_contacto uuid, p_tipo text, p_tareas uuid[], p_extra jsonb DEFAULT '{}')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  co      public.cliente_contactos;
  v_empresa text;
  v_tareas  jsonb;
BEGIN
  SELECT * INTO co FROM public.cliente_contactos WHERE id = p_contacto;
  IF NOT FOUND OR NOT co.activo OR co.bloqueado_at IS NOT NULL OR co.anonimizado_at IS NOT NULL THEN
    RETURN NULL;
  END IF;
  SELECT coalesce(nullif(trim(cl.empresa), ''), cl.nombre) INTO v_empresa FROM public.clientes cl WHERE cl.id = co.cliente_id;
  SELECT coalesce(jsonb_agg(public.tcliente_json_correo(x) - 'enlace_equipo'
                            ORDER BY (SELECT fecha_cliente FROM public.tareas_cliente WHERE id = x)), '[]'::jsonb)
    INTO v_tareas FROM unnest(p_tareas) AS x;
  RETURN public.tcliente_enviar(p_tipo, ARRAY[co.email],
    p_extra || jsonb_build_object(
      'nombre', split_part(trim(co.nombre), ' ', 1), 'empresa', v_empresa, 'tareas', v_tareas,
      'enlace', public.tcliente_enlace(co.id, CASE WHEN cardinality(p_tareas) = 1 THEN p_tareas[1] END)),
    co.id, NULL, p_tareas);
END $$;

-- Correo a gente del equipo (encargado o dueños).
CREATE OR REPLACE FUNCTION public.tcliente_correo_equipo(p_equipo uuid[], p_tipo text, p_payload jsonb, p_tareas uuid[] DEFAULT '{}')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_para   text[];
  v_nombre text;
BEGIN
  SELECT array_agg(e.email ORDER BY e.nombre), min(split_part(e.nombre, ' ', 1)) INTO v_para, v_nombre
    FROM public.equipo e WHERE e.id = ANY(p_equipo) AND e.activo AND e.avisos_correo;
  RETURN public.tcliente_enviar(p_tipo, v_para,
    p_payload || jsonb_build_object('nombre', CASE WHEN cardinality(p_equipo) = 1 THEN v_nombre END),
    NULL, CASE WHEN cardinality(p_equipo) = 1 THEN p_equipo[1] END, p_tareas);
END $$;

CREATE OR REPLACE FUNCTION public.tcliente_duenos()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(id), '{}') FROM public.equipo WHERE activo AND rol = 'dueno'
$$;

REVOKE ALL ON FUNCTION public.tcliente_enlace(uuid, uuid), public.tcliente_json_correo(uuid),
  public.tcliente_enviar(text, text[], jsonb, uuid, uuid, uuid[]),
  public.tcliente_correo_contacto(uuid, text, uuid[], jsonb),
  public.tcliente_correo_equipo(uuid[], text, jsonb, uuid[]), public.tcliente_duenos()
  FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019120400', 'tareas_clientes_04_correos')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
