-- Tareas de clientes (parte 9/14): contactos y acceso al portal.
--
-- Crear el usuario de Supabase Auth necesita la service role, así que "Dar
-- acceso" pasa por la Edge Function portal-clientes, que genera una
-- contraseña fácil y llama a portal_acceso_preparar. Las funciones portal_*
-- de service role NO se exponen a nadie más.

-- p: { id?, cliente_id, nombre, email, telefono?, cargo?, activo? }
CREATE OR REPLACE FUNCTION public.tcliente_contacto_guardar(p jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id    uuid := nullif(p->>'id', '')::uuid;
  v_email text := lower(trim(coalesce(p->>'email', '')));
  antes   public.cliente_contactos;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF v_email !~* '^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$' THEN RAISE EXCEPTION 'Correo inválido.'; END IF;
  IF EXISTS (SELECT 1 FROM public.equipo WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'Ese correo es de alguien del equipo.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cliente_contactos WHERE lower(email) = v_email AND id IS DISTINCT FROM v_id) THEN
    RAISE EXCEPTION 'Ese correo ya es contacto de un cliente.';
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO public.cliente_contactos (cliente_id, nombre, email, telefono, cargo)
    VALUES ((p->>'cliente_id')::uuid, trim(p->>'nombre'), v_email, nullif(trim(p->>'telefono'), ''), nullif(trim(p->>'cargo'), ''))
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;
  SELECT * INTO antes FROM public.cliente_contactos WHERE id = v_id;
  IF antes.anonimizado_at IS NOT NULL THEN RAISE EXCEPTION 'Este contacto fue eliminado.'; END IF;
  IF antes.user_id IS NOT NULL AND v_email <> lower(antes.email) THEN
    RAISE EXCEPTION 'Esta persona ya tiene acceso con su correo. Para cambiarlo, crea un contacto nuevo y desactiva este.';
  END IF;
  UPDATE public.cliente_contactos
     SET nombre = trim(p->>'nombre'), email = v_email, telefono = nullif(trim(p->>'telefono'), ''),
         cargo = nullif(trim(p->>'cargo'), ''), activo = coalesce((p->>'activo')::boolean, activo),
         desactivado_at = CASE WHEN coalesce((p->>'activo')::boolean, activo) THEN NULL ELSE coalesce(desactivado_at, now()) END
   WHERE id = v_id;
  RETURN v_id;
END $$;

-- Derecho de bloqueo: mientras esté bloqueado no se le escribe.
CREATE OR REPLACE FUNCTION public.tcliente_contacto_bloqueo(p_id uuid, p_bloquear boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  UPDATE public.cliente_contactos SET bloqueado_at = CASE WHEN p_bloquear THEN coalesce(bloqueado_at, now()) END WHERE id = p_id;
END $$;

-- Supresión: borra los datos personales y deja la fila (las tareas la
-- referencian). La Edge Function borra además el usuario de Auth.
CREATE OR REPLACE FUNCTION public.tcliente_contacto_anonimizar(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cliente_contactos;
BEGIN
  -- session_user (no current_user, que en SECURITY DEFINER siempre es el dueño
  -- de la función): 'postgres' = cron o editor SQL.
  IF NOT (public.es_dueno() OR coalesce(auth.role(), '') = 'service_role' OR session_user = 'postgres') THEN
    RAISE EXCEPTION 'Solo un dueño puede eliminar los datos de un contacto.';
  END IF;
  SELECT * INTO c FROM public.cliente_contactos WHERE id = p_id;
  IF NOT FOUND OR c.anonimizado_at IS NOT NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.tareas_cliente WHERE contacto_id = p_id AND cerrada_at IS NULL AND cancelada_at IS NULL) THEN
    RAISE EXCEPTION 'Tiene tareas abiertas: reasígnalas o cancélalas primero.';
  END IF;
  IF c.user_id IS NOT NULL THEN
    BEGIN
      DELETE FROM auth.users WHERE id = c.user_id;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE WARNING 'No se pudo borrar el usuario de Auth %; bórralo en Authentication → Users.', c.user_id;
    END;
  END IF;
  UPDATE public.tareas_cliente_notas SET autor_nombre = 'Contacto eliminado' WHERE autor_contacto_id = p_id;
  UPDATE public.tareas_cliente_archivos SET subido_por = 'Contacto eliminado' WHERE subido_contacto_id = p_id;
  UPDATE public.tareas_cliente_historial h SET actor = 'Contacto eliminado'
   WHERE h.actor = c.nombre AND h.tarea_id IN (SELECT id FROM public.tareas_cliente WHERE cliente_id = c.cliente_id);
  DELETE FROM public.portal_enlaces WHERE contacto_id = p_id;
  DELETE FROM public.portal_claves WHERE contacto_id = p_id;
  UPDATE public.cliente_contactos
     SET nombre = 'Contacto eliminado', email = p_id::text || '@eliminado.invalid', telefono = NULL, cargo = NULL,
         activo = false, user_id = NULL, desactivado_at = coalesce(desactivado_at, now()), anonimizado_at = now()
   WHERE id = p_id;
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019120900', 'tareas_clientes_09_contactos')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
