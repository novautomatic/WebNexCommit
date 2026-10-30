-- Chatbots → Auditoría → «Qué hicimos»: comentarios por nota. Sirven para anotar, mientras se
-- presenta lo hecho, lo que la clienta quiere cambiar o iterar. Cada comentario se marca
-- «resuelto» cuando se atiende; mientras haya uno sin resolver, la nota se destaca en el panel.
-- Como las otras tablas de auditoría: solo la lee y escribe el back de Agente-Next (service role,
-- /nexcommit/auditoria, solo dueños). Este repo es PÚBLICO: aquí solo va la estructura.
-- Idempotente: se puede volver a correr.

CREATE TABLE IF NOT EXISTS public.auditoria_chatbots_comentarios (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cambio_id    uuid NOT NULL REFERENCES public.auditoria_chatbots_cambios(id) ON DELETE CASCADE,
  texto        text NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 1 AND 2000),
  resuelto     boolean NOT NULL DEFAULT false,
  resuelto_at  timestamptz,
  resuelto_por text,
  creado_por   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auditoria_chatbots_comentarios_idx
  ON public.auditoria_chatbots_comentarios (cambio_id, created_at);

ALTER TABLE public.auditoria_chatbots_comentarios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auditoria_chatbots_comentarios FROM anon, authenticated;
