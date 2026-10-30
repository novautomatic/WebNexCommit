-- ============================================================================
-- Aviso «Scripts de Google Ads»: plantilla de sistema con el resumen diario de
-- cómo corrió el script de Ads de cada cliente (NexCommit, Acupuntura, Dye Tales).
--
-- {{scripts_estado}} y {{scripts_ads}} las calcula el back de Agente-Next al
-- enviar (src/services/estadoScriptsAds.js): lee la pestaña `_estado` de cada
-- Hoja y los cambios aprobados sin aplicar de google_cambios.
-- Uso: panel → Avisos → Plantillas → «Scripts de Google Ads» → enviar a Meta →
-- cuando esté aprobada, crear un aviso «Programado», todos los días, 08:30.
-- Idempotente.
-- ============================================================================
INSERT INTO public.avisos_plantillas (nombre, categoria, asunto, cuerpo, es_sistema) VALUES
('Scripts de Google Ads', 'marketing',
 '📊 Scripts de Google Ads: {{scripts_estado}}',
 'Revisión del {{fecha}} de los scripts de Google Ads de cada cliente: {{scripts_ads}}. Si alguno no corrió, revisa en Google Ads que esté programado «Diariamente, 7:00» y autorizado. Panel: https://www.nexcommit.com/admin?tab=google', true)
ON CONFLICT (nombre) WHERE es_sistema
DO UPDATE SET categoria = EXCLUDED.categoria, asunto = EXCLUDED.asunto, cuerpo = EXCLUDED.cuerpo;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261030160000', 'aviso_scripts_ads')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Verificación: 1 fila.
-- SELECT nombre, categoria, asunto FROM public.avisos_plantillas WHERE nombre = 'Scripts de Google Ads';
