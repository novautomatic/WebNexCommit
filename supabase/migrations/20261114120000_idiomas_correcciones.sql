-- Tutor de idiomas del asistente de WhatsApp de los socios (back_chat_next,
-- src/asistente/tutor.js): cada corrección de francés o inglés que recibe un
-- socio, para su repaso de los viernes (src/asistente/repasoIdiomas.js).
--
-- Solo la usa el back con service_role: RLS activa y SIN políticas, ningún
-- rol del navegador la lee. Datos del propio equipo, nunca de clientes.
-- Retención: el cron semanal del back borra lo que tenga más de 180 días.

CREATE TABLE IF NOT EXISTS public.idiomas_correcciones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id    uuid NOT NULL REFERENCES public.equipo(id) ON DELETE CASCADE,
  idioma       text NOT NULL CHECK (idioma IN ('fr', 'en')),
  dijiste      text NOT NULL CHECK (length(dijiste) <= 300),
  correcto     text NOT NULL CHECK (length(correcto) <= 300),
  explicacion  text CHECK (length(explicacion) <= 500),
  tipo         text NOT NULL DEFAULT 'gramatica' CHECK (length(tipo) <= 30),
  frase        text CHECK (length(frase) <= 1000),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idiomas_correcciones_equipo_fecha
  ON public.idiomas_correcciones (equipo_id, created_at DESC);

ALTER TABLE public.idiomas_correcciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.idiomas_correcciones FROM anon, authenticated;

COMMENT ON TABLE public.idiomas_correcciones IS
  'Correcciones del tutor de idiomas (asistente WhatsApp de socios). Solo service_role. Se purgan a los 180 días.';
