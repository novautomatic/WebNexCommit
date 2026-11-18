-- Cotizador único (18-nov-2026). Correr DESPUÉS de 20261113150100–150300_cotizaciones_*.sql.
-- Una sola IA (50x, en el back de Agente-Next) redacta las cotizaciones; se conversa con
-- ella desde el panel o desde Claude (herramienta `cotizar` del conector MCP) y es la
-- MISMA conversación (tabla cotizaciones_chats). Las reglas que la IA aprende con el «sí»
-- de un socio van a cotizaciones_reglas. El bucket acepta también Word (.docx).
-- El equipo LEE (RLS es_equipo()); se escribe solo por estas funciones. Idempotente.

CREATE TABLE IF NOT EXISTS public.cotizaciones_chats (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id  uuid REFERENCES public.cotizaciones(id) ON DELETE SET NULL,
  titulo         text,
  conversacion   jsonb NOT NULL DEFAULT '[]'::jsonb,
  origen         text NOT NULL DEFAULT 'panel' CHECK (origen IN ('panel', 'mcp')),
  ocupado_desde  timestamptz,                       -- la IA está respondiendo
  creado_por     uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cotizaciones_chats_fecha_idx ON public.cotizaciones_chats (updated_at DESC);
CREATE INDEX IF NOT EXISTS cotizaciones_chats_cot_idx ON public.cotizaciones_chats (cotizacion_id) WHERE cotizacion_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.cotizaciones_reglas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regla          text NOT NULL CHECK (length(regla) BETWEEN 8 AND 500),
  cotizacion_id  uuid REFERENCES public.cotizaciones(id) ON DELETE SET NULL,  -- de dónde salió
  activa         boolean NOT NULL DEFAULT true,
  creado_por     uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cotizaciones_chats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones_reglas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cotizaciones_chats, public.cotizaciones_reglas FROM anon, authenticated;
GRANT SELECT ON public.cotizaciones_chats, public.cotizaciones_reglas TO authenticated;
DROP POLICY IF EXISTS cotizaciones_chats_equipo ON public.cotizaciones_chats;
CREATE POLICY cotizaciones_chats_equipo ON public.cotizaciones_chats FOR SELECT TO authenticated
  USING (coalesce(public.es_equipo(), false));
DROP POLICY IF EXISTS cotizaciones_reglas_equipo ON public.cotizaciones_reglas;
CREATE POLICY cotizaciones_reglas_equipo ON public.cotizaciones_reglas FOR SELECT TO authenticated
  USING (coalesce(public.es_equipo(), false));

-- Crea o actualiza una conversación (la llama el back con la sesión de la persona).
CREATE OR REPLACE FUNCTION public.cotizacion_chat_guardar(
  p_id uuid, p_conversacion jsonb, p_cotizacion_id uuid DEFAULT NULL, p_titulo text DEFAULT NULL,
  p_origen text DEFAULT 'panel', p_ocupado boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_yo uuid := public.mi_equipo_id(); v_id uuid;
BEGIN
  IF v_yo IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Solo el equipo.'); END IF;
  IF p_conversacion IS NOT NULL AND jsonb_typeof(p_conversacion) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Conversación inválida.');
  END IF;
  IF length(coalesce(p_conversacion::text, '')) > 2000000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La conversación es demasiado larga: empieza una nueva.');
  END IF;
  IF coalesce(p_origen, '') NOT IN ('panel', 'mcp') THEN p_origen := 'panel'; END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.cotizaciones_chats (cotizacion_id, titulo, conversacion, origen, ocupado_desde, creado_por)
    VALUES (p_cotizacion_id, left(nullif(trim(p_titulo), ''), 120), coalesce(p_conversacion, '[]'::jsonb), p_origen,
            CASE WHEN p_ocupado THEN now() END, v_yo)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.cotizaciones_chats c SET
      conversacion  = coalesce(p_conversacion, c.conversacion),
      cotizacion_id = coalesce(p_cotizacion_id, c.cotizacion_id),
      titulo        = coalesce(c.titulo, left(nullif(trim(p_titulo), ''), 120)),
      ocupado_desde = CASE WHEN p_ocupado THEN now() END,
      updated_at    = now()
    WHERE c.id = p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'No existe esa conversación.'); END IF;
  END IF;
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END $$;

-- Regla aprendida: la IA la anota solo después del «sí» de un socio en el chat.
CREATE OR REPLACE FUNCTION public.cotizacion_regla_anotar(p_regla text, p_cotizacion_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT coalesce(public.es_dueno(), false) THEN RETURN jsonb_build_object('ok', false, 'error', 'Solo los socios aprueban reglas de cotización.'); END IF;
  IF length(trim(coalesce(p_regla, ''))) NOT BETWEEN 8 AND 500 THEN RETURN jsonb_build_object('ok', false, 'error', 'La regla debe tener entre 8 y 500 caracteres.'); END IF;
  INSERT INTO public.cotizaciones_reglas (regla, cotizacion_id, creado_por)
  VALUES (trim(p_regla), p_cotizacion_id, public.mi_equipo_id()) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END $$;

CREATE OR REPLACE FUNCTION public.cotizacion_regla_quitar(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.es_dueno(), false) THEN RETURN jsonb_build_object('ok', false, 'error', 'Solo los socios.'); END IF;
  DELETE FROM public.cotizaciones_reglas WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.cotizacion_chat_guardar(uuid, jsonb, uuid, text, text, boolean),
  public.cotizacion_regla_anotar(text, uuid), public.cotizacion_regla_quitar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cotizacion_chat_guardar(uuid, jsonb, uuid, text, text, boolean),
  public.cotizacion_regla_anotar(text, uuid), public.cotizacion_regla_quitar(uuid) TO authenticated;

-- El bucket guarda también el Word editable.
UPDATE storage.buckets SET allowed_mime_types = ARRAY['application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
WHERE id = 'cotizaciones';

-- Conservación: las conversaciones que nunca llegaron a cotización se borran a los 90 días.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('cotizaciones-chats-limpiar', '40 4 * * *',
      $c$DELETE FROM public.cotizaciones_chats WHERE cotizacion_id IS NULL AND updated_at < now() - interval '90 days'$c$);
  END IF;
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261118120000', 'cotizador_unico') ON CONFLICT DO NOTHING;
  END IF;
END $$;
