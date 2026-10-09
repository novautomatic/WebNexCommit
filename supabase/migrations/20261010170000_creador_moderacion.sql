-- ============================================================================
-- Creador: moderación con advertencias y bloqueo.
--
--   creador_leads          + advertencias, bloqueado_at, bloqueo_motivo
--   creador_infracciones   cada pedido/imagen rechazada por el moderador
--                          (origen, categorías y un extracto de 300 car.)
--
-- Regla: 2 advertencias; la tercera infracción bloquea al lead (no puede
-- editar ni volver a entrar, ni con el mismo correo ni con el mismo celular)
-- y suspende su página. Solo el equipo desbloquea (/admin → Creador).
--
-- El backend de Agente-Next llama a creador_registrar_infraccion() con
-- service_role. El panel llama a creador_desbloquear() (es_equipo()).
--
-- Retención: las infracciones se borran a los 12 meses. El bloqueo se mantiene
-- aunque el lead se anonimice (quedan los hashes de correo y celular).
--
-- Idempotente. Correr DESPUÉS de 20261010150000_creador_tienda.sql.
-- ============================================================================

ALTER TABLE public.creador_leads ADD COLUMN IF NOT EXISTS advertencias int NOT NULL DEFAULT 0;
ALTER TABLE public.creador_leads ADD COLUMN IF NOT EXISTS bloqueado_at timestamptz;
ALTER TABLE public.creador_leads ADD COLUMN IF NOT EXISTS bloqueo_motivo text;

CREATE TABLE IF NOT EXISTS public.creador_infracciones (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id     uuid NOT NULL REFERENCES public.creador_leads(id) ON DELETE CASCADE,
  origen      text NOT NULL,
  categorias  text[] NOT NULL DEFAULT '{}',
  extracto    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creador_infracciones_lead_idx ON public.creador_infracciones (lead_id, created_at DESC);
COMMENT ON TABLE public.creador_infracciones IS
  'Contenido rechazado por el moderador del Creador. 3 infracciones = bloqueo. Se borran a los 12 meses.';

-- ─── Registrar una infracción (backend, service_role) ──────────────────────
-- Suma y bloquea en la misma sentencia: dos pedidos a la vez no se saltan el conteo.
CREATE OR REPLACE FUNCTION public.creador_registrar_infraccion(
  p_lead uuid, p_origen text, p_categorias text[], p_extracto text
)
RETURNS TABLE (advertencias int, bloqueado boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  v_n int;
  v_bloq timestamptz;
BEGIN
  INSERT INTO public.creador_infracciones (lead_id, origen, categorias, extracto)
  VALUES (p_lead, left(p_origen, 60), coalesce(p_categorias, '{}'), left(p_extracto, 300));

  UPDATE public.creador_leads l
     SET advertencias   = l.advertencias + 1,
         bloqueado_at   = CASE WHEN l.advertencias + 1 >= 3 THEN coalesce(l.bloqueado_at, now()) ELSE l.bloqueado_at END,
         bloqueo_motivo = CASE WHEN l.advertencias + 1 >= 3 AND l.bloqueado_at IS NULL
                               THEN array_to_string(p_categorias, ', ') ELSE l.bloqueo_motivo END
   WHERE l.id = p_lead
  RETURNING l.advertencias, l.bloqueado_at INTO v_n, v_bloq;

  -- Las sesiones no se borran: el backend responde «bloqueado» a cualquier
  -- sesión de un lead bloqueado, y si el equipo lo desbloquea, su sesión vuelve a servir.
  IF v_bloq IS NOT NULL THEN
    UPDATE public.creador_paginas SET estado = 'suspendida' WHERE lead_id = p_lead AND estado <> 'suspendida';
  END IF;

  RETURN QUERY SELECT coalesce(v_n, 0), v_bloq IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.creador_registrar_infraccion(uuid, text, text[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creador_registrar_infraccion(uuid, text, text[], text) TO service_role;

-- ─── Desbloquear (panel del equipo) ────────────────────────────────────────
-- Deja las advertencias en 0 y reactiva la página. Las infracciones quedan
-- registradas como historial.
CREATE OR REPLACE FUNCTION public.creador_desbloquear(p_lead uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_equipo() THEN
    RAISE EXCEPTION 'Solo el equipo puede desbloquear' USING ERRCODE = '42501';
  END IF;
  UPDATE public.creador_paginas p SET estado = 'activa'
    FROM public.creador_leads l
   WHERE p.lead_id = l.id AND l.id = p_lead AND l.bloqueado_at IS NOT NULL;
  UPDATE public.creador_leads SET advertencias = 0, bloqueado_at = NULL, bloqueo_motivo = NULL WHERE id = p_lead;
END $$;
REVOKE ALL ON FUNCTION public.creador_desbloquear(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creador_desbloquear(uuid) TO authenticated;

-- ─── Retención (reemplaza la de 20261010150000) ────────────────────────────
CREATE OR REPLACE FUNCTION public.creador_retencion()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.creador_codigos  WHERE expira_at < now() - interval '1 day';
  DELETE FROM public.creador_sesiones WHERE expira_at < now();
  DELETE FROM public.creador_contactos WHERE created_at < now() - interval '30 days';
  DELETE FROM public.creador_pedidos  WHERE created_at < now() - interval '90 days';
  DELETE FROM public.creador_eventos  WHERE created_at < now() - interval '12 months';
  DELETE FROM public.creador_infracciones WHERE created_at < now() - interval '12 months';
  DELETE FROM public.creador_paginas  WHERE expira_at < now() - interval '30 days';
  DELETE FROM public.creador_leads
   WHERE verificado_at IS NULL AND created_at < now() - interval '7 days'
     AND bloqueado_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.creador_paginas p WHERE p.lead_id = creador_leads.id);
  -- Anonimizar conserva email_hash/telefono_hash: un bloqueado sigue bloqueado.
  UPDATE public.creador_leads
     SET nombre = NULL, email = NULL, telefono = NULL, ip_hash = NULL, notas = NULL,
         acepta_marketing = false, password_hash = NULL, anonimizado_at = now()
   WHERE anonimizado_at IS NULL AND estado <> 'convertido'
     AND created_at < now() - interval '12 months';
END $$;
REVOKE ALL ON FUNCTION public.creador_retencion() FROM PUBLIC, anon, authenticated;

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.creador_infracciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creador_infracciones FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.creador_infracciones FROM authenticated;
DROP POLICY IF EXISTS creador_infracciones_leer ON public.creador_infracciones;
CREATE POLICY creador_infracciones_leer ON public.creador_infracciones FOR SELECT TO authenticated USING (public.es_equipo());

-- El panel lee el estado de moderación (se suma al GRANT por columnas de la migración de tienda).
GRANT SELECT (advertencias, bloqueado_at, bloqueo_motivo) ON public.creador_leads TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261010170000', 'creador_moderacion')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
