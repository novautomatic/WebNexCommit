-- Bóveda: cada clave puede asociarse a un proyecto (o área) para ver, entrando al
-- proyecto, qué accesos tenemos ahí. El cliente sale de proyecto_clientes.
--
-- Solo se guarda la referencia al proyecto, que NO es secreta (el nombre del proyecto ya
-- vive en claro en `proyectos`). Web, usuario, clave y notas siguen cifrados en `datos`.
-- Si se borra el proyecto, las claves no se pierden: quedan «Sin proyecto».
-- Las políticas existentes de boveda_entradas (equipo + código por correo) ya cubren la columna.

ALTER TABLE public.boveda_entradas
  ADD COLUMN IF NOT EXISTS proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS boveda_entradas_proyecto_idx ON public.boveda_entradas (proyecto_id);
