-- ============================================================================
-- El correo de tarea nueva/reasignada llega SIEMPRE al responsable, también
-- cuando la creó o se la asignó él mismo (es el aviso de creación del dueño).
-- El WhatsApp mantiene la regla de no avisar al que se la asignó a sí mismo.
--
-- Idempotente. Requiere 20261011120000_avisos_por_correo.sql.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tareas_avisar_responsable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := coalesce(public.mi_equipo_id(), NEW.creado_por);
  tipo  text;
BEGIN
  IF coalesce(current_setting('app.sin_avisos', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.responsable_id IS NULL OR NEW.estado IN ('completada', 'cancelada') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    tipo := 'asignada';
  ELSIF OLD.responsable_id IS DISTINCT FROM NEW.responsable_id THEN
    tipo := 'reasignada';
  ELSE
    RETURN NEW;
  END IF;
  IF NEW.responsable_id IS DISTINCT FROM actor THEN
    PERFORM public.encolar_aviso_tarea(NEW.id, tipo);
  END IF;
  PERFORM public.encolar_correo_tarea(NEW.id, tipo);
  RETURN NEW;
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261011130000', 'correo_tarea_propia')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
