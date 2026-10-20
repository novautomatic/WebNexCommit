-- ============================================================================
-- Correo permiso en página web: pedir al cliente autorización para agregar
-- «© <año> <empresa>. Powered by NexCommit» (con enlace a nexcommit.com) al pie
-- de la web que le hicimos. Es OPCIONAL: sin un «sí» del cliente no se toca nada.
--
--   cliente_enviar_permiso_web(ids)  manda el correo (plantilla fija en el back
--                                    de Agente-Next, tipo 'permiso_web') a
--                                    clientes activos que ya aceptaron las
--                                    políticas y aún no responden; máximo uno
--                                    cada 7 días por cliente.
--   clientes.permiso_web             'si' | 'no' | NULL (sin respuesta). El
--                                    cliente responde el correo y el equipo lo
--                                    anota en su ficha; cada cambio queda en
--                                    cliente_consentimientos como prueba.
--
-- Idempotente. Requiere las partes 1 a 6 de 20261015*_clientes_consentimiento.
-- ============================================================================

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS permiso_web            text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS permiso_web_at         timestamptz;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS permiso_web_enviado_at timestamptz;

ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_permiso_web_check;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_permiso_web_check CHECK (permiso_web IN ('si', 'no'));

ALTER TABLE public.cliente_correos DROP CONSTRAINT IF EXISTS cliente_correos_tipo_check;
ALTER TABLE public.cliente_correos ADD CONSTRAINT cliente_correos_tipo_check
  CHECK (tipo IN ('invitacion', 'campana', 'permiso_web'));

ALTER TABLE public.cliente_consentimientos DROP CONSTRAINT IF EXISTS cliente_consentimientos_accion_check;
ALTER TABLE public.cliente_consentimientos ADD CONSTRAINT cliente_consentimientos_accion_check
  CHECK (accion IN ('acepta_politicas', 'acepta_marketing', 'retira_marketing', 'rectifica_datos',
                    'autoriza_web', 'rechaza_web', 'borra_respuesta_web'));

-- ─── Respuesta del cliente: fecha y prueba automáticas ─────────────────────
-- El panel solo escribe permiso_web; la fecha y el registro los pone esto.
CREATE OR REPLACE FUNCTION public.clientes_registrar_permiso_web()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.permiso_web := NULL;  NEW.permiso_web_at := NULL;  NEW.permiso_web_enviado_at := NULL;
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('app.permiso_web', true), '') <> 'on' THEN
    NEW.permiso_web_enviado_at := OLD.permiso_web_enviado_at;
  END IF;
  IF NEW.permiso_web IS DISTINCT FROM OLD.permiso_web THEN
    NEW.permiso_web_at := CASE WHEN NEW.permiso_web IS NULL THEN NULL ELSE now() END;
    INSERT INTO public.cliente_consentimientos (cliente_id, accion, origen, detalle)
    VALUES (OLD.id,
            CASE NEW.permiso_web WHEN 'si' THEN 'autoriza_web' WHEN 'no' THEN 'rechaza_web' ELSE 'borra_respuesta_web' END,
            'panel',
            'Anotado por ' || coalesce((SELECT nombre FROM public.equipo WHERE id = public.mi_equipo_id()), 'el equipo')
              || ' a partir de la respuesta del cliente al correo de permiso.');
  ELSE
    NEW.permiso_web_at := OLD.permiso_web_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS clientes_registrar_permiso_web ON public.clientes;
CREATE TRIGGER clientes_registrar_permiso_web
  BEFORE INSERT OR UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.clientes_registrar_permiso_web();

-- ─── Envío ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cliente_enviar_permiso_web(p_clientes uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c        record;
  enviados integer := 0;
  cupo     integer;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'no autorizado'; END IF;
  cupo := public.correos_clientes_cupo_hoy();
  PERFORM set_config('app.permiso_web', 'on', true);
  FOR c IN
    SELECT id FROM public.clientes
     WHERE id = ANY(p_clientes) AND activo
       AND acepta_politicas_at IS NOT NULL AND permiso_web IS NULL
       AND email ~* '^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$'
       AND (permiso_web_enviado_at IS NULL OR permiso_web_enviado_at < now() - interval '7 days')
  LOOP
    EXIT WHEN enviados >= cupo;
    PERFORM public.encolar_correo_cliente(c.id, 'permiso_web', jsonb_build_object('anio', extract(year FROM now())::int));
    UPDATE public.clientes SET permiso_web_enviado_at = now() WHERE id = c.id;
    enviados := enviados + 1;
  END LOOP;
  PERFORM set_config('app.permiso_web', '', true);
  RETURN jsonb_build_object('enviados', enviados, 'omitidos', coalesce(array_length(p_clientes, 1), 0) - enviados);
END $$;

REVOKE ALL ON FUNCTION public.clientes_registrar_permiso_web() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cliente_enviar_permiso_web(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_enviar_permiso_web(uuid[]) TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019150000', 'clientes_permiso_web')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
