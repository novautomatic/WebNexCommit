-- Chatbots → Auditoría (nexcommit.com/admin?tab=auditoria-chatbots): registro de lo que se
-- hizo en cada chatbot, la auditoría de cada mes (checklist + notas + decisiones de la
-- clienta + foto de cifras) y los pendientes.
-- Las lee y escribe SOLO el back de Agente-Next (service role, ruta /nexcommit/auditoria,
-- solo dueños): el navegador no tiene ningún permiso directo (RLS activo y sin políticas).
-- Este repo es PÚBLICO: aquí va solo la estructura. El contenido real (hallazgos, cifras,
-- decisiones con la clienta) se carga en la base, nunca en git.
-- Idempotente: se puede volver a correr.

CREATE TABLE IF NOT EXISTS public.auditoria_chatbots_meses (
  chatbot           text NOT NULL,                       -- 'sofia-v2'
  clave             text NOT NULL CHECK (clave = 'linea-base' OR clave ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  checklist         jsonb NOT NULL DEFAULT '{}'::jsonb,  -- auditoría mensual: { idItem: true }
  checklist_cliente jsonb NOT NULL DEFAULT '{}'::jsonb,  -- reunión / informe a la clienta
  notas             text NOT NULL DEFAULT '',
  decisiones        text NOT NULL DEFAULT '',            -- lo que decidió la clienta
  indicadores       jsonb,                               -- foto de cifras guardada al cerrar el mes
  actualizado_at    timestamptz NOT NULL DEFAULT now(),
  actualizado_por   text,
  PRIMARY KEY (chatbot, clave)
);

CREATE TABLE IF NOT EXISTS public.auditoria_chatbots_cambios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot     text NOT NULL,
  fecha       date NOT NULL,
  hallazgo    text NOT NULL,              -- qué se encontró
  accion      text NOT NULL,              -- qué se hizo
  donde       text NOT NULL DEFAULT '',   -- PR, SQL, panel…
  efecto      text NOT NULL DEFAULT '',   -- qué se espera ganar
  estado      text NOT NULL DEFAULT 'hecho' CHECK (estado IN ('hecho', 'en_prueba', 'por_confirmar')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  creado_por  text
);
CREATE INDEX IF NOT EXISTS auditoria_chatbots_cambios_idx
  ON public.auditoria_chatbots_cambios (chatbot, fecha DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.auditoria_chatbots_pendientes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot     text NOT NULL,
  titulo      text NOT NULL,
  detalle     text NOT NULL DEFAULT '',
  prioridad   text NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
  orden       integer NOT NULL DEFAULT 0,
  hecho       boolean NOT NULL DEFAULT false,
  hecho_at    timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auditoria_chatbots_pendientes_idx
  ON public.auditoria_chatbots_pendientes (chatbot, hecho, orden);

-- RLS sin políticas: nadie con la llave pública lee ni escribe; el back usa service role.
ALTER TABLE public.auditoria_chatbots_meses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_chatbots_cambios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_chatbots_pendientes  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auditoria_chatbots_meses      FROM anon, authenticated;
REVOKE ALL ON public.auditoria_chatbots_cambios    FROM anon, authenticated;
REVOKE ALL ON public.auditoria_chatbots_pendientes FROM anon, authenticated;
