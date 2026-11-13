-- Cotizaciones conversadas con Claude (parte 2 de 3: guardar y conversación).
-- Las llama el back de Agente-Next con la sesión de la persona (no con service role),
-- así que las reglas de acceso son las mismas en el panel y en el conector MCP.
-- Idempotente.

CREATE OR REPLACE FUNCTION public.cotizacion_guardar(
  p_id             uuid,
  p_datos          jsonb,
  p_titulo         text,
  p_cliente_nombre text,
  p_cliente_id     uuid DEFAULT NULL,
  p_total_unico    numeric DEFAULT NULL,
  p_total_mensual  numeric DEFAULT NULL,
  p_conversacion   jsonb DEFAULT NULL,
  p_origen         text DEFAULT 'panel'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_yo     uuid := public.mi_equipo_id();
  v_base   text;
  v_numero text;
  v_n      int := 1;
  v_fila   public.cotizaciones;
BEGIN
  IF v_yo IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Solo el equipo puede guardar cotizaciones.'); END IF;
  IF p_datos IS NULL OR jsonb_typeof(p_datos) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Faltan los datos de la cotización.');
  END IF;
  IF coalesce(trim(p_titulo), '') = '' OR coalesce(trim(p_cliente_nombre), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Faltan el título o el nombre del cliente.');
  END IF;
  IF coalesce(p_origen, '') NOT IN ('mcp', 'panel', 'historica') THEN p_origen := 'panel'; END IF;

  IF p_id IS NULL THEN
    -- Número correlativo por día: NC-2026-1113, NC-2026-1113-2…
    PERFORM pg_advisory_xact_lock(hashtext('cotizaciones_numero'));
    v_base := 'NC-' || to_char(now() AT TIME ZONE 'America/Santiago', 'YYYY-MMDD');
    v_numero := v_base;
    WHILE EXISTS (SELECT 1 FROM public.cotizaciones WHERE numero = v_numero) LOOP
      v_n := v_n + 1;
      v_numero := v_base || '-' || v_n;
    END LOOP;

    INSERT INTO public.cotizaciones (numero, titulo, cliente_nombre, cliente_id, datos, total_unico, total_mensual,
                                     conversacion, origen, creado_por, actualizado_por)
    VALUES (v_numero, left(trim(p_titulo), 200), left(trim(p_cliente_nombre), 200), p_cliente_id,
            jsonb_set(p_datos, '{numero}', to_jsonb(v_numero)), p_total_unico, p_total_mensual,
            coalesce(p_conversacion, '[]'::jsonb), p_origen, v_yo, v_yo)
    RETURNING * INTO v_fila;
  ELSE
    UPDATE public.cotizaciones c SET
      titulo          = left(trim(p_titulo), 200),
      cliente_nombre  = left(trim(p_cliente_nombre), 200),
      cliente_id      = coalesce(p_cliente_id, c.cliente_id),
      version         = CASE WHEN c.datos = jsonb_set(p_datos, '{numero}', to_jsonb(c.numero)) THEN c.version ELSE c.version + 1 END,
      datos           = jsonb_set(p_datos, '{numero}', to_jsonb(c.numero)),
      total_unico     = p_total_unico,
      total_mensual   = p_total_mensual,
      conversacion    = coalesce(p_conversacion, c.conversacion),
      actualizado_por = v_yo,
      updated_at      = now()
    WHERE c.id = p_id
    RETURNING * INTO v_fila;
    IF v_fila.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'No existe esa cotización.'); END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_fila.id, 'numero', v_fila.numero, 'version', v_fila.version, 'estado', v_fila.estado);
END $$;

-- Solo la conversación del panel (cada turno del chat), sin tocar la propuesta.
CREATE OR REPLACE FUNCTION public.cotizacion_conversacion(p_id uuid, p_conversacion jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.mi_equipo_id() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Solo el equipo.'); END IF;
  IF jsonb_typeof(p_conversacion) <> 'array' THEN RETURN jsonb_build_object('ok', false, 'error', 'Conversación inválida.'); END IF;
  UPDATE public.cotizaciones SET conversacion = p_conversacion, updated_at = now() WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'No existe esa cotización.'); END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.cotizacion_guardar(uuid, jsonb, text, text, uuid, numeric, numeric, jsonb, text),
                       public.cotizacion_conversacion(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cotizacion_guardar(uuid, jsonb, text, text, uuid, numeric, numeric, jsonb, text),
                          public.cotizacion_conversacion(uuid, jsonb) TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261113150200', 'cotizaciones_2_funciones') ON CONFLICT DO NOTHING;
  END IF;
END $$;
