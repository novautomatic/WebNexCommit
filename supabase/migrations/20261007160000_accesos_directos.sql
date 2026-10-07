-- Accesos directos del panel (Configuración): links a Supabase, Drive, etc.
-- Los ve y edita cualquier persona activa del equipo (es_equipo()).

CREATE TABLE IF NOT EXISTS public.accesos_directos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 1 AND 80),
  url         text NOT NULL CHECK (url ~* '^https?://' AND char_length(url) <= 2000),
  categoria   text CHECK (categoria IS NULL OR char_length(categoria) <= 40),
  descripcion text CHECK (descripcion IS NULL OR char_length(descripcion) <= 200),
  orden       integer NOT NULL DEFAULT 0,
  creado_por  uuid REFERENCES public.equipo(id) ON DELETE SET NULL DEFAULT public.mi_equipo_id(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accesos_directos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accesos_equipo ON public.accesos_directos;
CREATE POLICY accesos_equipo ON public.accesos_directos FOR ALL TO authenticated
  USING (public.es_equipo()) WITH CHECK (public.es_equipo());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accesos_directos TO authenticated;

-- Refresco en vivo entre compañeros.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.accesos_directos;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
