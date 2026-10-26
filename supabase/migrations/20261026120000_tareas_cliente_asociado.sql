-- ============================================================================
-- Cliente asociado a una tarea interna (área o proyecto de GitHub)
--
-- Es solo una referencia: la tarea sigue siendo del equipo, no del cliente
-- (eso son las «tareas de clientes», otra tabla). Sirve para buscar y filtrar
-- las tareas por cliente y verlas en su dashboard.
--
-- Vive solo en Supabase: no viaja a GitHub y la sincronización no la toca
-- (github_aplicar_issue no escribe esta columna).
--
-- Idempotente.
-- ============================================================================

ALTER TABLE public.tareas
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tareas_cliente_idx ON public.tareas (cliente_id) WHERE cliente_id IS NOT NULL;

-- El panel no escribe `tareas` directo: este RPC asigna o quita el cliente.
CREATE OR REPLACE FUNCTION public.tarea_asignar_cliente(p_tarea uuid, p_cliente uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_antes uuid;
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'no autorizado'; END IF;
  SELECT cliente_id INTO v_antes FROM public.tareas WHERE id = p_tarea;
  IF NOT FOUND THEN RAISE EXCEPTION 'La tarea no existe.'; END IF;
  IF p_cliente IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.clientes WHERE id = p_cliente) THEN
    RAISE EXCEPTION 'El cliente no existe.';
  END IF;
  IF v_antes IS NOT DISTINCT FROM p_cliente THEN RETURN; END IF;

  UPDATE public.tareas SET cliente_id = p_cliente WHERE id = p_tarea;
  INSERT INTO public.tarea_historial (tarea_id, actor_id, accion, campo, antes, despues)
  VALUES (p_tarea, public.mi_equipo_id(), 'cambio', 'cliente_id', v_antes::text, p_cliente::text);
END $$;

REVOKE ALL ON FUNCTION public.tarea_asignar_cliente(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tarea_asignar_cliente(uuid, uuid) TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261026120000', 'tareas_cliente_asociado')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
