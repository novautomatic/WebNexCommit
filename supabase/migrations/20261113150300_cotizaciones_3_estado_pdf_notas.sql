-- Cotizaciones conversadas con Claude (parte 3 de 3: estado, PDF, borrar y notas).
-- Correr después de la parte 2. Idempotente.

CREATE OR REPLACE FUNCTION public.cotizacion_estado(p_id uuid, p_estado text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_yo uuid := public.mi_equipo_id();
BEGIN
  IF v_yo IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Solo el equipo.'); END IF;
  IF p_estado NOT IN ('borrador', 'enviada', 'aceptada', 'rechazada', 'vencida') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Estado inválido: usa borrador, enviada, aceptada, rechazada o vencida.');
  END IF;
  UPDATE public.cotizaciones SET estado = p_estado, actualizado_por = v_yo, updated_at = now() WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'No existe esa cotización.'); END IF;
  RETURN jsonb_build_object('ok', true, 'estado', p_estado);
END $$;

-- El back registra aquí el PDF que acaba de subir al bucket.
CREATE OR REPLACE FUNCTION public.cotizacion_pdf(p_id uuid, p_path text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.mi_equipo_id() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Solo el equipo.'); END IF;
  IF p_path !~ ('^' || p_id::text || '/[A-Za-z0-9._-]+\.pdf$') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ruta de PDF inválida.');
  END IF;
  UPDATE public.cotizaciones SET pdf_path = p_path, pdf_generado_at = now() WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'No existe esa cotización.'); END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

-- Borrar es solo de dueños (los PDF del bucket los borra el back con la misma sesión).
CREATE OR REPLACE FUNCTION public.cotizacion_borrar(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.es_dueno(), false) THEN RETURN jsonb_build_object('ok', false, 'error', 'Solo los dueños pueden borrar cotizaciones.'); END IF;
  DELETE FROM public.cotizaciones WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'No existe esa cotización.'); END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

-- Notas privadas que Claude lee antes de cotizar (reglas internas, descuentos, aprendizajes).
CREATE OR REPLACE FUNCTION public.cotizaciones_notas_guardar(p_notas text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.es_dueno(), false) THEN RETURN jsonb_build_object('ok', false, 'error', 'Solo los dueños editan las notas de cotización.'); END IF;
  IF length(coalesce(p_notas, '')) > 20000 THEN RETURN jsonb_build_object('ok', false, 'error', 'Máximo 20.000 caracteres.'); END IF;
  UPDATE public.cotizaciones_config SET notas = coalesce(p_notas, ''), actualizado_por = public.mi_equipo_id(), updated_at = now() WHERE id;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.cotizacion_estado(uuid, text), public.cotizacion_pdf(uuid, text),
                       public.cotizacion_borrar(uuid), public.cotizaciones_notas_guardar(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cotizacion_estado(uuid, text), public.cotizacion_pdf(uuid, text),
                          public.cotizacion_borrar(uuid), public.cotizaciones_notas_guardar(text) TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261113150300', 'cotizaciones_3_estado_pdf_notas') ON CONFLICT DO NOTHING;
  END IF;
END $$;
