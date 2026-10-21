-- ============================================================================
-- Creador: «producto base» — la maqueta hecha con IA se publica por
-- $150.000 + IVA con 1 año incluido (src/data/PRECIOS.js → PLAN_BASE).
--
--   creador_paginas.plan = 'base'  → sin barra de prueba ni cuenta regresiva,
--                                    indexable, editor manual SIN tope y sin IA
--                                    (lo aplica el back de Agente-Next).
--   creador_paginas.dominio        → dominio propio del cliente (nota del
--                                    equipo; la conexión se hace a mano).
--
-- creador_habilitar(pagina, meses, dominio): la usa el panel (botón «Habilitar
-- plan base») después de recibir el pago. Volver a llamarla = renovar (suma
-- los meses al vencimiento vigente). Deja el lead como 'convertido' para que la
-- retención no lo anonimice.
--
-- La retención guarda las páginas del plan base 90 días después de vencer
-- (para renovar) en vez de 30.
--
-- Idempotente. Correr DESPUÉS de 20261010170000_creador_moderacion.sql.
-- ============================================================================

ALTER TABLE public.creador_paginas
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'prueba',
  ADD COLUMN IF NOT EXISTS habilitada_at timestamptz,
  ADD COLUMN IF NOT EXISTS dominio text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creador_paginas_plan_check') THEN
    ALTER TABLE public.creador_paginas
      ADD CONSTRAINT creador_paginas_plan_check CHECK (plan IN ('prueba', 'base'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.creador_habilitar(p_pagina uuid, p_meses int DEFAULT 12, p_dominio text DEFAULT NULL)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead uuid;
  v_expira timestamptz;
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN
    RAISE EXCEPTION 'Solo el equipo puede habilitar páginas' USING ERRCODE = '42501';
  END IF;
  IF p_meses IS NULL OR p_meses NOT BETWEEN 1 AND 36 THEN
    RAISE EXCEPTION 'Meses inválidos (1 a 36)';
  END IF;

  UPDATE public.creador_paginas
     SET plan = 'base',
         estado = 'activa',
         habilitada_at = coalesce(habilitada_at, now()),
         expira_at = greatest(expira_at, now()) + make_interval(months => p_meses),
         dominio = coalesce(nullif(lower(trim(p_dominio)), ''), dominio)
   WHERE id = p_pagina
  RETURNING lead_id, expira_at INTO v_lead, v_expira;

  IF v_lead IS NULL THEN
    RAISE EXCEPTION 'No existe esa página';
  END IF;

  UPDATE public.creador_leads SET estado = 'convertido' WHERE id = v_lead;
  RETURN v_expira;
END $$;

REVOKE ALL ON FUNCTION public.creador_habilitar(uuid, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creador_habilitar(uuid, int, text) TO authenticated;

-- Misma retención de 20261010170000, salvo el plazo de las páginas del plan base.
CREATE OR REPLACE FUNCTION public.creador_retencion()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.creador_codigos  WHERE expira_at < now() - interval '1 day';
  DELETE FROM public.creador_sesiones WHERE expira_at < now();
  DELETE FROM public.creador_contactos WHERE created_at < now() - interval '30 days';
  DELETE FROM public.creador_pedidos  WHERE created_at < now() - interval '90 days';
  DELETE FROM public.creador_eventos  WHERE created_at < now() - interval '12 months';
  DELETE FROM public.creador_infracciones WHERE created_at < now() - interval '12 months';
  DELETE FROM public.creador_paginas
   WHERE expira_at < now() - CASE WHEN plan = 'base' THEN interval '90 days' ELSE interval '30 days' END;
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

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261021121000', 'creador_plan_base')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Verificación:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'creador_paginas' AND column_name IN ('plan', 'habilitada_at', 'dominio');  -- 3 filas
--   SELECT has_function_privilege('anon', 'public.creador_habilitar(uuid,int,text)', 'EXECUTE');   -- false
--   SELECT plan, count(*) FROM public.creador_paginas GROUP BY plan;                               -- todas 'prueba'
