-- ============================================================================
--  Cobros a clientes (panel → Gestión → Cobros, solo dueños) · parte 1 de 2
--
--  cobros_clientes  qué se le cobra a cada cliente cada mes: concepto, monto
--                   fijo, si lleva un extra variable (p. ej. los costos de las
--                   ventas del mes anterior), el día de cobro (31 = último día
--                   del mes, también en meses de 28 o 30 días) y cuántos días hay
--                   para cobrarlo (p. ej. «los primeros 5 días»).
--  cobros           el registro de cada cobro: uno por cliente y mes (lo crea el
--                   cron de la parte 2) o puntual (a mano). Ahí se anota el extra
--                   y se marca cobrado / pagado.
--
--  El día de cobro, la parte 2 crea el cobro del mes y arma el aviso de ese
--  cliente en `avisos` (programado, una vez): el back de Agente-Next lo manda
--  por correo a los dueños en su revisión de cada 5 minutos.
--  Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cobros_clientes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id     uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  concepto       text NOT NULL CHECK (length(trim(concepto)) > 0),
  monto_fijo     integer NOT NULL DEFAULT 0 CHECK (monto_fijo >= 0),
  tiene_extra    boolean NOT NULL DEFAULT false,
  extra_detalle  text,
  dia_cobro      smallint NOT NULL CHECK (dia_cobro BETWEEN 1 AND 31),
  plazo_dias     smallint NOT NULL DEFAULT 1 CHECK (plazo_dias BETWEEN 1 AND 28),
  -- No se generan cobros con fecha anterior a esta (al crear uno a mitad de
  -- mes no aparece de golpe el cobro de un día que ya pasó).
  inicio         date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Santiago')::date),
  activo         boolean NOT NULL DEFAULT true,
  notas          text,
  aviso_id       uuid REFERENCES public.avisos(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cobros_clientes_extra CHECK (NOT tiene_extra OR length(trim(coalesce(extra_detalle, ''))) > 0)
);
CREATE INDEX IF NOT EXISTS cobros_clientes_cliente_idx ON public.cobros_clientes (cliente_id);

CREATE TABLE IF NOT EXISTS public.cobros (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cobro_cliente_id  uuid REFERENCES public.cobros_clientes(id) ON DELETE SET NULL,
  cliente_id        uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  periodo           text NOT NULL CHECK (periodo ~ '^\d{4}-\d{2}$'),
  fecha_cobro       date NOT NULL,
  vence_el          date NOT NULL,
  concepto          text NOT NULL CHECK (length(trim(concepto)) > 0),
  monto_fijo        integer NOT NULL DEFAULT 0 CHECK (monto_fijo >= 0),
  tiene_extra       boolean NOT NULL DEFAULT false,
  extra_detalle     text,
  monto_extra       integer NOT NULL DEFAULT 0 CHECK (monto_extra >= 0),
  total             integer GENERATED ALWAYS AS (monto_fijo + monto_extra) STORED,
  estado            text NOT NULL DEFAULT 'por_cobrar'
                    CHECK (estado IN ('por_cobrar', 'cobrado', 'pagado', 'anulado')),
  cobrado_at        timestamptz,
  pagado_at         timestamptz,
  notas             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cobros_vence CHECK (vence_el >= fecha_cobro)
);
-- Un solo cobro por cobro mensual y mes (los puntuales no tienen límite).
CREATE UNIQUE INDEX IF NOT EXISTS cobros_mensual_periodo
  ON public.cobros (cobro_cliente_id, periodo) WHERE cobro_cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cobros_periodo_idx ON public.cobros (periodo, fecha_cobro);
CREATE INDEX IF NOT EXISTS cobros_cliente_idx ON public.cobros (cliente_id);

COMMENT ON TABLE public.cobros IS
  'Cobros a clientes (registro contable: conservar 6 años por lo tributario). Solo dueños.';

-- updated_at + fechas de cobrado/pagado al cambiar de estado.
CREATE OR REPLACE FUNCTION public.cobros_antes_de_guardar()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_TABLE_NAME = 'cobros' THEN
    IF NEW.estado IN ('cobrado', 'pagado') AND NEW.cobrado_at IS NULL THEN NEW.cobrado_at := now(); END IF;
    IF NEW.estado = 'pagado' AND NEW.pagado_at IS NULL THEN NEW.pagado_at := now(); END IF;
    IF NEW.estado = 'por_cobrar' THEN NEW.cobrado_at := NULL; NEW.pagado_at := NULL; END IF;
    IF NEW.estado = 'cobrado' THEN NEW.pagado_at := NULL; END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS cobros_clientes_guardar ON public.cobros_clientes;
CREATE TRIGGER cobros_clientes_guardar BEFORE UPDATE ON public.cobros_clientes
  FOR EACH ROW EXECUTE FUNCTION public.cobros_antes_de_guardar();
DROP TRIGGER IF EXISTS cobros_guardar ON public.cobros;
CREATE TRIGGER cobros_guardar BEFORE INSERT OR UPDATE ON public.cobros
  FOR EACH ROW EXECUTE FUNCTION public.cobros_antes_de_guardar();

-- ─── RLS: solo dueños (montos de la empresa) ────────────────────────────────
ALTER TABLE public.cobros_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobros ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cobros_clientes, public.cobros FROM anon;

DROP POLICY IF EXISTS cobros_clientes_duenos ON public.cobros_clientes;
CREATE POLICY cobros_clientes_duenos ON public.cobros_clientes FOR ALL TO authenticated
  USING (public.es_dueno()) WITH CHECK (public.es_dueno());

DROP POLICY IF EXISTS cobros_duenos ON public.cobros;
CREATE POLICY cobros_duenos ON public.cobros FOR ALL TO authenticated
  USING (public.es_dueno()) WITH CHECK (public.es_dueno());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobros_clientes, public.cobros TO authenticated;
