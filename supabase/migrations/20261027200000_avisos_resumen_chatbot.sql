-- ============================================================================
--  Sistema de avisos · parte 5: resumen de conversaciones del chatbot
--
--  Tipo nuevo «resumen_chatbot»: a cada hora de `resumen_horas` (hora de
--  Santiago) el back de Agente-Next junta lo que se conversó con el chatbot
--  `chatbot_agente_id` (id del agente en el Supabase de Agente-Next) desde la
--  hora anterior de la lista hasta esta, lo resume con IA y lo manda.
--  Ej. {16:00, 20:00}: a las 16:00 va de 20:00 del día anterior a 16:00, y a
--  las 20:00 de 16:00 a 20:00.
--
--  resumen_corte_at lo escribe el back: el último corte enviado (evita
--  mandarlo dos veces si dos revisiones se cruzan).
--
--  Variables nuevas: {{chatbot}} {{desde}} {{hasta}} {{conversaciones}}
--  {{mensajes}} {{derivadas}} {{resumen}}
--  Requiere las partes 1–4. Idempotente.
-- ============================================================================

ALTER TABLE public.avisos
  ADD COLUMN IF NOT EXISTS chatbot_agente_id uuid,
  ADD COLUMN IF NOT EXISTS chatbot_nombre    text,
  ADD COLUMN IF NOT EXISTS resumen_horas     text[],
  ADD COLUMN IF NOT EXISTS resumen_corte_at  timestamptz;

ALTER TABLE public.avisos DROP CONSTRAINT IF EXISTS avisos_tipo_check;
ALTER TABLE public.avisos ADD CONSTRAINT avisos_tipo_check
  CHECK (tipo IN ('saldo_openai', 'programado', 'manual', 'resumen_chatbot'));

ALTER TABLE public.avisos DROP CONSTRAINT IF EXISTS avisos_resumen_chatbot;
ALTER TABLE public.avisos ADD CONSTRAINT avisos_resumen_chatbot
  CHECK (tipo <> 'resumen_chatbot' OR (chatbot_agente_id IS NOT NULL AND coalesce(cardinality(resumen_horas), 0) > 0));

INSERT INTO public.avisos_plantillas (nombre, categoria, asunto, cuerpo, es_sistema) VALUES
('Resumen de conversaciones del chatbot', 'chatbots',
 '💬 Resumen de {{chatbot}} del {{fecha}}',
 'Entre las {{desde}} y las {{hasta}} hubo {{conversaciones}} conversaciones con {{mensajes}} mensajes de clientes; {{derivadas}} se derivaron a una persona. Resumen: {{resumen}} Puedes revisar cada conversación en https://nexa.nexcommit.com/panel/conversaciones', true)
ON CONFLICT (nombre) WHERE es_sistema
DO UPDATE SET categoria = EXCLUDED.categoria, asunto = EXCLUDED.asunto, cuerpo = EXCLUDED.cuerpo;

-- Que nada la vuelva a aplicar si se corrió a mano en el editor SQL.
DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261027200000', 'avisos_resumen_chatbot')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
