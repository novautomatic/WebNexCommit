-- CRM de vendedores (2/7): ventas, pagos, quién es quién y RLS.

CREATE TABLE IF NOT EXISTS public.ventas_ventas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id        uuid NOT NULL REFERENCES public.ventas_prospectos(id),
  vendedor_id         uuid NOT NULL REFERENCES public.ventas_personas(id),
  descripcion         text NOT NULL,
  implementacion_lista bigint NOT NULL CHECK (implementacion_lista >= 0),
  nivel_precio        text NOT NULL CHECK (nivel_precio IN ('lista', 'oferta', 'ultima')),
  implementacion      bigint NOT NULL,
  mensualidad         bigint NOT NULL DEFAULT 0 CHECK (mensualidad >= 0),
  meses               int NOT NULL DEFAULT 6,
  total               bigint GENERATED ALWAYS AS (implementacion + mensualidad * meses) STORED,
  tabla               text NOT NULL CHECK (tabla IN ('normal', 'asignado')),
  comision            bigint NOT NULL,
  estado              text NOT NULL DEFAULT 'propuesta'
    CHECK (estado IN ('propuesta', 'aprobada', 'rechazada', 'en_curso', 'pagada', 'cancelada')),
  nota_jefe           text,
  pago1_at            timestamptz,
  pago2_at            timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Lo que NexCommit debe a cada persona. Se paga por transferencia y se marca pagado_at.
CREATE TABLE IF NOT EXISTS public.ventas_pagos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES public.ventas_personas(id),
  concepto   text NOT NULL CHECK (concepto IN ('comision_1', 'comision_2', 'jornada', 'inscrito', 'bono')),
  referencia uuid,
  mes        date NOT NULL DEFAULT date_trunc('month', now())::date,
  detalle    text NOT NULL,
  monto      bigint NOT NULL,
  pagado_at  timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ventas_pagos_unico
  ON public.ventas_pagos (persona_id, concepto, coalesce(referencia, '00000000-0000-0000-0000-000000000000'::uuid), mes);

-- ─── Quién es quién ───
CREATE OR REPLACE FUNCTION public.mi_vendedor_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.ventas_personas
  WHERE activo AND (user_id = auth.uid() OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.es_vendedor() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.mi_vendedor_id() IS NOT NULL $$;
CREATE OR REPLACE FUNCTION public.ventas_jefe() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT coalesce(public.es_dueno(), false) $$;

-- ─── RLS: la jefatura ve y edita todo; cada persona solo lee lo suyo ───
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ventas_personas','ventas_config','ventas_tramos','ventas_jornadas',
                           'ventas_prospectos','ventas_notas','ventas_ventas','ventas_pagos'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('DROP POLICY IF EXISTS jefe_todo ON public.%I', t);
    EXECUTE format('CREATE POLICY jefe_todo ON public.%I FOR ALL TO authenticated USING (public.ventas_jefe()) WITH CHECK (public.ventas_jefe())', t);
  END LOOP;
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ventas_personas, public.ventas_config, public.ventas_tramos,
  public.ventas_jornadas, public.ventas_prospectos, public.ventas_notas, public.ventas_ventas, public.ventas_pagos TO authenticated;
GRANT USAGE ON SEQUENCE public.ventas_tramos_id_seq TO authenticated;

DROP POLICY IF EXISTS propio ON public.ventas_personas;
CREATE POLICY propio ON public.ventas_personas FOR SELECT TO authenticated USING (id = public.mi_vendedor_id());
DROP POLICY IF EXISTS leer ON public.ventas_config;
CREATE POLICY leer ON public.ventas_config FOR SELECT TO authenticated USING (public.es_vendedor());
DROP POLICY IF EXISTS leer ON public.ventas_tramos;
CREATE POLICY leer ON public.ventas_tramos FOR SELECT TO authenticated USING (public.es_vendedor());
DROP POLICY IF EXISTS propio ON public.ventas_jornadas;
CREATE POLICY propio ON public.ventas_jornadas FOR SELECT TO authenticated USING (persona_id = public.mi_vendedor_id());
DROP POLICY IF EXISTS propio ON public.ventas_prospectos;
CREATE POLICY propio ON public.ventas_prospectos FOR SELECT TO authenticated
  USING (asignado_a = public.mi_vendedor_id() OR captado_por = public.mi_vendedor_id());
DROP POLICY IF EXISTS propio ON public.ventas_notas;
CREATE POLICY propio ON public.ventas_notas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ventas_prospectos p WHERE p.id = prospecto_id AND p.asignado_a = public.mi_vendedor_id()));
DROP POLICY IF EXISTS propio ON public.ventas_ventas;
CREATE POLICY propio ON public.ventas_ventas FOR SELECT TO authenticated USING (vendedor_id = public.mi_vendedor_id());
DROP POLICY IF EXISTS propio ON public.ventas_pagos;
CREATE POLICY propio ON public.ventas_pagos FOR SELECT TO authenticated USING (persona_id = public.mi_vendedor_id());

GRANT EXECUTE ON FUNCTION public.mi_vendedor_id(), public.es_vendedor(), public.ventas_jefe() TO authenticated;
