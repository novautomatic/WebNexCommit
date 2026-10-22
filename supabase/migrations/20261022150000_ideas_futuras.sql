-- Proyectos futuros: ideas que no son tareas todavía (sin proyecto, responsable ni fecha).
-- Se muestran como primera columna del tablero de Tareas; «Convertir en tarea» abre el
-- formulario normal con el tema y las notas, y al crearla la idea se borra.
-- Las ve y edita cualquier persona activa del equipo (es_equipo()).

CREATE TABLE IF NOT EXISTS public.ideas_futuras (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tema        text NOT NULL CHECK (char_length(btrim(tema)) BETWEEN 1 AND 200),
  notas       text CHECK (notas IS NULL OR char_length(notas) <= 5000),
  creado_por  uuid REFERENCES public.equipo(id) ON DELETE SET NULL DEFAULT public.mi_equipo_id(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ideas_futuras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ideas_futuras_equipo ON public.ideas_futuras;
CREATE POLICY ideas_futuras_equipo ON public.ideas_futuras FOR ALL TO authenticated
  USING (public.es_equipo()) WITH CHECK (public.es_equipo());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ideas_futuras TO authenticated;

CREATE OR REPLACE FUNCTION public.ideas_futuras_tocar()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ideas_futuras_tocar ON public.ideas_futuras;
CREATE TRIGGER ideas_futuras_tocar BEFORE UPDATE ON public.ideas_futuras
  FOR EACH ROW EXECUTE FUNCTION public.ideas_futuras_tocar();

-- Refresco en vivo entre compañeros.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ideas_futuras;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
