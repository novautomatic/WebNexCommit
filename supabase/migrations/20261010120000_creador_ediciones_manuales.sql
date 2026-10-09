-- ============================================================================
-- Creador: tope de ediciones MANUALES (además de las de IA).
--
-- Una edición manual = una vez que el cliente presiona «Publicar cambios» en
-- el editor (entre publicaciones puede editar libremente; el borrador vive en
-- su navegador). Cuando se acaban las de IA o las manuales, el editor invita a
-- contactar a NexCommit. El equipo puede regalar más desde /admin → Creador
-- (por eso el panel puede actualizar ediciones_max y ediciones_manuales_max).
--
-- Idempotente.
-- ============================================================================

ALTER TABLE public.creador_config
  ADD COLUMN IF NOT EXISTS ediciones_manuales int NOT NULL DEFAULT 5;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creador_config_ediciones_manuales_check') THEN
    ALTER TABLE public.creador_config
      ADD CONSTRAINT creador_config_ediciones_manuales_check CHECK (ediciones_manuales BETWEEN 0 AND 100);
  END IF;
END $$;

ALTER TABLE public.creador_paginas
  ADD COLUMN IF NOT EXISTS ediciones_manuales_usadas int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ediciones_manuales_max int NOT NULL DEFAULT 5;

-- El panel cambia solo estas columnas (el resto lo escribe el backend).
REVOKE UPDATE ON public.creador_paginas FROM authenticated;
GRANT UPDATE (estado, expira_at, ediciones_max, ediciones_manuales_max) ON public.creador_paginas TO authenticated;
REVOKE UPDATE ON public.creador_config FROM authenticated;
GRANT UPDATE (activo, duracion_dias, tope_diario, ediciones, ediciones_manuales, max_caracteres, responsable_id)
  ON public.creador_config TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261010120000', 'creador_ediciones_manuales')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
