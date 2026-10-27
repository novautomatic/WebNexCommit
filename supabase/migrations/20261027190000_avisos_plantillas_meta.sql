-- ============================================================================
--  Sistema de avisos · parte 4: cada plantilla se aprueba en Meta
--
--  Antes todos los WhatsApp de avisos salían dentro de UNA plantilla genérica
--  («aviso_nexcommit», {{1}} asunto + {{2}} texto) y las plantillas del panel
--  eran solo texto interno. Ahora cada plantilla del panel es su propia
--  plantilla de Meta, categoría UTILITY, en la WABA de avisos de NexCommit, y
--  un aviso solo puede usar una plantilla APROBADA como utility.
--
--  Las columnas meta_* las escribe el back de Agente-Next (service role) al
--  enviar a revisión y al consultar el estado. meta_asunto / meta_cuerpo son el
--  texto que se envió: si la plantilla se edita después, ya no coinciden y hay
--  que volver a enviarla (sale con otro nombre: meta_version + 1).
--
--  avisos.valores: lo que se escribe en cada [corchete] de la plantilla.
--  Requiere las partes 1–3. Idempotente.
-- ============================================================================

ALTER TABLE public.avisos_plantillas
  ADD COLUMN IF NOT EXISTS meta_nombre     text,
  ADD COLUMN IF NOT EXISTS meta_id         text,
  ADD COLUMN IF NOT EXISTS meta_version    int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_estado     text,   -- PENDING | APPROVED | REJECTED | PAUSED | DISABLED | IN_APPEAL
  ADD COLUMN IF NOT EXISTS meta_categoria  text,   -- la que asignó Meta (puede pasarla a MARKETING)
  ADD COLUMN IF NOT EXISTS meta_motivo     text,   -- motivo del rechazo o error al enviar
  ADD COLUMN IF NOT EXISTS meta_variables  jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_asunto     text,
  ADD COLUMN IF NOT EXISTS meta_cuerpo     text,
  ADD COLUMN IF NOT EXISTS meta_enviada_at timestamptz,
  ADD COLUMN IF NOT EXISTS meta_revisada_at timestamptz;

ALTER TABLE public.avisos
  ADD COLUMN IF NOT EXISTS valores jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Que nada la vuelva a aplicar si se corrió a mano en el editor SQL.
DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261027190000', 'avisos_plantillas_meta')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
