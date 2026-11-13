-- CRM de vendedores (1/7): tablas, permisos y valores iniciales.
-- Vendedores y captadores NO son del equipo: entran a /ventas y solo ven lo suyo.
-- La jefatura de ventas = dueños (es_dueno()). Correr las 7 partes en orden.

CREATE TABLE IF NOT EXISTS public.ventas_personas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL CHECK (length(trim(nombre)) > 0),
  email      text NOT NULL CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  whatsapp   text CHECK (whatsapp IS NULL OR whatsapp ~ '^[0-9]{8,15}$'),
  rol        text NOT NULL CHECK (rol IN ('vendedor', 'captador')),
  user_id    uuid,
  activo     boolean NOT NULL DEFAULT true,
  inicio     date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ventas_personas_email ON public.ventas_personas (lower(email));

-- Una sola fila (id = 1). Montos en CLP, porcentajes en %.
CREATE TABLE IF NOT EXISTS public.ventas_config (
  id                 int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pct_asignado       numeric NOT NULL DEFAULT 60 CHECK (pct_asignado BETWEEN 0 AND 100),
  pct_oferta         numeric NOT NULL DEFAULT 10,
  pct_ultima         numeric NOT NULL DEFAULT 15,
  tope_ultimas_mes   int NOT NULL DEFAULT 2,
  pago_jornada       int NOT NULL DEFAULT 10000,
  pago_inscrito      int NOT NULL DEFAULT 1500,
  meses_minimos      int NOT NULL DEFAULT 6,
  dias_proteccion    int NOT NULL DEFAULT 60,
  bonos              jsonb NOT NULL DEFAULT '[{"desde":3000000,"bono":100000},{"desde":6000000,"bono":250000},{"desde":10000000,"bono":500000}]'
);
INSERT INTO public.ventas_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Tabla normal. monto = comisión fija del tramo; pct = % del total (si monto es NULL).
CREATE TABLE IF NOT EXISTS public.ventas_tramos (
  id    serial PRIMARY KEY,
  desde bigint NOT NULL,
  hasta bigint,
  monto bigint,
  pct   numeric,
  CHECK ((monto IS NULL) <> (pct IS NULL))
);
INSERT INTO public.ventas_tramos (desde, hasta, monto, pct)
SELECT * FROM (VALUES
  (0::bigint, 399999::bigint, NULL::bigint, 12::numeric), (400000, 499999, 65000, NULL), (500000, 599999, 80000, NULL),
  (600000, 699999, 95000, NULL), (700000, 799999, 110000, NULL), (800000, 899999, 125000, NULL),
  (900000, 999999, 140000, NULL), (1000000, 1249999, 170000, NULL), (1250000, 1499999, 210000, NULL),
  (1500000, 1749999, 250000, NULL), (1750000, 1999999, 290000, NULL), (2000000, 2499999, 350000, NULL),
  (2500000, 2999999, 430000, NULL), (3000000, 3499999, 510000, NULL), (3500000, 3999999, 590000, NULL),
  (4000000, 4499999, 670000, NULL), (4500000, 4999999, 755000, NULL), (5000000, 5499999, 840000, NULL),
  (5500000, 6000000, 920000, NULL), (6000001, NULL, NULL, 17)
) t WHERE NOT EXISTS (SELECT 1 FROM public.ventas_tramos);

CREATE TABLE IF NOT EXISTS public.ventas_jornadas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES public.ventas_personas(id),
  zona       text NOT NULL,
  inicio     timestamptz NOT NULL DEFAULT now(),
  fin        timestamptz,
  estado     text NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada', 'aprobada', 'rechazada'))
);

-- Prospectos = el CRM. Datos personales (Ley 19.628): solo para contactar y proponer.
CREATE TABLE IF NOT EXISTS public.ventas_prospectos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contacto           text NOT NULL,
  negocio            text NOT NULL,
  rubro              text,
  comuna             text,
  whatsapp           text NOT NULL CHECK (whatsapp ~ '^[0-9]{8,15}$'),
  email              text,
  interes            text,
  origen             text NOT NULL CHECK (origen IN ('terreno', 'propio', 'panel')),
  captado_por        uuid REFERENCES public.ventas_personas(id),
  jornada_id         uuid REFERENCES public.ventas_jornadas(id),
  asignado_a         uuid REFERENCES public.ventas_personas(id),
  asignado_por_jefe  boolean NOT NULL DEFAULT false,
  asignado_at        timestamptz,
  etapa              text NOT NULL DEFAULT 'nuevo'
    CHECK (etapa IN ('nuevo', 'contactado', 'reunion', 'propuesta', 'ganado', 'perdido')),
  motivo_perdida     text,
  proximo_paso       text,
  proximo_paso_fecha date,
  acepta_contacto_at timestamptz NOT NULL,
  validado           boolean,
  validado_at        timestamptz,
  ultimo_movimiento  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ventas_prospectos_wsp ON public.ventas_prospectos (whatsapp);
CREATE INDEX IF NOT EXISTS ventas_prospectos_asignado ON public.ventas_prospectos (asignado_a);

CREATE TABLE IF NOT EXISTS public.ventas_notas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id uuid NOT NULL REFERENCES public.ventas_prospectos(id) ON DELETE CASCADE,
  autor        text NOT NULL,
  tipo         text NOT NULL DEFAULT 'nota' CHECK (tipo IN ('nota', 'llamada', 'whatsapp', 'reunion', 'sistema')),
  texto        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
