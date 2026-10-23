-- ============================================================================
-- Dashboard por cliente · parte 3 de 4: respuestas de clientes leídas de Gmail.
--
-- Cada 10 min, leer_respuestas_clientes() le pide al back de Agente-Next
-- (POST /avisos/leer-respuestas, mismo secreto que los demás avisos) los correos
-- que llegaron a nexcommit@gmail.com DESDE direcciones de clientes o contactos.
-- La respuesta se procesa en la vuelta siguiente (pg_net es asíncrono).
--
--   cliente_respuestas  una fila por correo recibido: asunto, fecha y solo el
--                       texto nuevo (sin la parte citada), máx. 2.000 caracteres.
--                       Se borran a los 180 días.
--   Permiso «Powered by»: «sí» o «no» claros se anotan solos en clientes.permiso_web
--   (la prueba, con el texto, queda en cliente_consentimientos); lo dudoso queda
--   como «Respondió — revisar» y se resuelve con cliente_respuesta_resolver().
--
-- Requiere 20261019150000_clientes_permiso_web.sql y las partes 1-2. Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cliente_respuestas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    text NOT NULL UNIQUE,
  cliente_id    uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  contacto_id   uuid REFERENCES public.cliente_contactos(id) ON DELETE SET NULL,
  de            text NOT NULL,
  asunto        text,
  fecha         timestamptz NOT NULL,
  extracto      text,
  tipo          text NOT NULL DEFAULT 'otro' CHECK (tipo IN ('permiso_web', 'otro')),
  clasificacion text CHECK (clasificacion IN ('si', 'no', 'dudoso')),
  resuelta_at   timestamptz,
  resuelta_por  uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cliente_respuestas_cliente_idx ON public.cliente_respuestas (cliente_id, fecha DESC);

CREATE TABLE IF NOT EXISTS public.correo_lecturas (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id   bigint,
  desde        timestamptz NOT NULL,
  estado       text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'ok', 'error')),
  detalle      text,
  mensajes     integer,
  created_at   timestamptz NOT NULL DEFAULT now(),
  procesada_at timestamptz
);

ALTER TABLE public.cliente_respuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correo_lecturas    ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cliente_respuestas, public.correo_lecturas FROM anon, authenticated;
GRANT SELECT ON public.cliente_respuestas, public.correo_lecturas TO authenticated;
DROP POLICY IF EXISTS cliente_respuestas_equipo ON public.cliente_respuestas;
CREATE POLICY cliente_respuestas_equipo ON public.cliente_respuestas FOR SELECT TO authenticated USING (public.es_equipo());
DROP POLICY IF EXISTS correo_lecturas_equipo ON public.correo_lecturas;
CREATE POLICY correo_lecturas_equipo ON public.correo_lecturas FOR SELECT TO authenticated USING (public.es_equipo());

-- ─── La prueba del permiso dice de dónde vino (panel o correo) ──────────────
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
            CASE WHEN current_setting('app.permiso_web_origen', true) = 'correo' THEN 'correo' ELSE 'panel' END,
            coalesce(nullif(current_setting('app.permiso_web_detalle', true), ''),
              'Anotado por ' || coalesce((SELECT nombre FROM public.equipo WHERE id = public.mi_equipo_id()), 'el equipo')
              || ' a partir de la respuesta del cliente al correo de permiso.'));
  ELSE
    NEW.permiso_web_at := OLD.permiso_web_at;
  END IF;
  RETURN NEW;
END $$;

-- Anota el permiso con el texto del correo como prueba (solo si aún no hay respuesta).
CREATE OR REPLACE FUNCTION public.cliente_respuesta_aplicar(p_respuesta uuid, p_decision text, p_quien text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.cliente_respuestas WHERE id = p_respuesta;
  IF r.id IS NULL OR p_decision NOT IN ('si', 'no') THEN RETURN; END IF;
  PERFORM set_config('app.permiso_web_origen', 'correo', true);
  PERFORM set_config('app.permiso_web_detalle', left(format('Respondió por correo (%s) el %s; %s. Texto: «%s»',
    r.de, to_char(r.fecha AT TIME ZONE 'America/Santiago', 'DD-MM-YYYY HH24:MI'), p_quien,
    coalesce(r.extracto, '')), 2000), true);
  UPDATE public.clientes SET permiso_web = p_decision WHERE id = r.cliente_id AND permiso_web IS NULL;
  PERFORM set_config('app.permiso_web_origen', '', true);
  PERFORM set_config('app.permiso_web_detalle', '', true);
END $$;


DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261022170300', 'dashboard_cliente_3_respuestas') ON CONFLICT DO NOTHING;
  END IF;
END $$;
