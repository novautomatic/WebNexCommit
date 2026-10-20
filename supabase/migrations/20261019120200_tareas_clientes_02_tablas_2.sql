-- Tareas de clientes (parte 2/14): recurrentes, solicitudes, derechos, portal y
-- registro de correos. Correr después de la parte 1.

-- Plantilla de tarea recurrente: el cron crea la tarea cuando llega proxima_fecha.
--   semanal: dia = día de la semana (1 lunes … 5 viernes)
--   mensual: dia = día del mes (1 … 28)
-- Plazos en días corridos: fecha_cliente = creación + dias_cliente;
-- fecha_encargado = fecha_cliente + dias_encargado.
CREATE TABLE IF NOT EXISTS public.tareas_cliente_plantillas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  contacto_id     uuid NOT NULL REFERENCES public.cliente_contactos(id) ON DELETE CASCADE,
  encargado_id    uuid NOT NULL REFERENCES public.equipo(id) ON DELETE RESTRICT,
  titulo          text NOT NULL CHECK (length(trim(titulo)) BETWEEN 3 AND 160),
  tarea_cliente   text NOT NULL CHECK (length(trim(tarea_cliente)) BETWEEN 3 AND 4000),
  tarea_encargado text NOT NULL CHECK (length(trim(tarea_encargado)) BETWEEN 3 AND 4000),
  entregables     text[] NOT NULL CHECK (cardinality(entregables) BETWEEN 1 AND 30),
  frecuencia      text NOT NULL CHECK (frecuencia IN ('semanal', 'mensual')),
  dia             integer NOT NULL,
  dias_cliente    integer NOT NULL CHECK (dias_cliente BETWEEN 1 AND 60),
  dias_encargado  integer NOT NULL CHECK (dias_encargado BETWEEN 0 AND 60),
  proxima_fecha   date NOT NULL,
  activa          boolean NOT NULL DEFAULT true,
  creada_por      uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plantillas_dia CHECK (
    (frecuencia = 'semanal' AND dia BETWEEN 1 AND 5) OR (frecuencia = 'mensual' AND dia BETWEEN 1 AND 28))
);

-- Lo que el cliente pide a NexCommit desde su portal.
CREATE TABLE IF NOT EXISTS public.cliente_solicitudes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  contacto_id  uuid REFERENCES public.cliente_contactos(id) ON DELETE SET NULL,
  titulo       text NOT NULL CHECK (length(trim(titulo)) BETWEEN 3 AND 160),
  detalle      text NOT NULL CHECK (length(trim(detalle)) BETWEEN 3 AND 4000),
  estado       text NOT NULL DEFAULT 'nueva' CHECK (estado IN ('nueva', 'aceptada', 'rechazada')),
  respuesta    text CHECK (respuesta IS NULL OR length(respuesta) <= 2000),
  tarea_id     uuid REFERENCES public.tareas_cliente(id) ON DELETE SET NULL,
  resuelta_por uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  resuelta_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Derechos del titular (Ley 21.719, arts. 5 a 9 y 11): constancia de cada
-- ejercicio. Acceso, portabilidad y rectificación se resuelven solos en el
-- portal y quedan "atendida" al instante; el resto lo resuelve un dueño.
CREATE TABLE IF NOT EXISTS public.derechos_solicitudes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contacto_id  uuid REFERENCES public.cliente_contactos(id) ON DELETE SET NULL,
  tipo         text NOT NULL CHECK (tipo IN ('acceso', 'rectificacion', 'supresion', 'oposicion', 'portabilidad', 'bloqueo')),
  detalle      text CHECK (detalle IS NULL OR length(detalle) <= 2000),
  estado       text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'atendida', 'rechazada')),
  respuesta    text CHECK (respuesta IS NULL OR length(respuesta) <= 2000),
  vence_el     date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Santiago')::date + 30),
  atendida_por uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  atendida_at  timestamptz,
  acuse_enviado_at     timestamptz,  -- art. 11: acusar recibo
  respuesta_enviada_at timestamptz,  -- art. 11: responder por escrito y guardar respaldo
  created_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.derechos_solicitudes IS
  'Prueba de cumplimiento Ley 21.719 art. 11: acuse, respuesta en 30 días corridos (prorrogable una vez) y respaldo del envío. No la borra la retención.';

-- Enlaces de los correos: abren el portal completo del contacto por 1 día.
-- Solo se guarda el hash SHA-256 del token.
CREATE TABLE IF NOT EXISTS public.portal_enlaces (
  token_hash  text PRIMARY KEY,
  contacto_id uuid NOT NULL REFERENCES public.cliente_contactos(id) ON DELETE CASCADE,
  expira_at   timestamptz NOT NULL,
  usos        integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Contraseña inicial: se ve UNA vez desde el correo de bienvenida (72 h) y se
-- borra. Cifrada con el secreto de Vault portal_claves_secreto.
CREATE TABLE IF NOT EXISTS public.portal_claves (
  contacto_id uuid PRIMARY KEY REFERENCES public.cliente_contactos(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  clave       text NOT NULL,
  expira_at   timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'portal_claves_secreto') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'portal_claves_secreto',
      'Cifra la contraseña inicial de los clientes hasta que la ven (72 h).');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'portal_cron_secreto') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'portal_cron_secreto',
      'Autoriza al cron a pedir la purga de archivos a la Edge Function portal-clientes.');
  END IF;
END $$;

-- Registro de correos de este sistema (se borra a los 180 días).
CREATE TABLE IF NOT EXISTS public.tareas_cliente_avisos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo         text NOT NULL,
  para         text NOT NULL,
  contacto_id  uuid REFERENCES public.cliente_contactos(id) ON DELETE SET NULL,
  equipo_id    uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  tareas       uuid[] NOT NULL DEFAULT '{}',
  request_id   bigint,
  estado       text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'error')),
  detalle      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  procesado_at timestamptz
);
CREATE INDEX IF NOT EXISTS tareas_cliente_avisos_pend_idx ON public.tareas_cliente_avisos (created_at) WHERE estado = 'pendiente';

-- Una corrida por día y tipo (el cron se agenda 2 veces por el cambio de hora).
CREATE TABLE IF NOT EXISTS public.tareas_cliente_corridas (
  fecha date NOT NULL,
  tipo  text NOT NULL,
  PRIMARY KEY (fecha, tipo)
);

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019120200', 'tareas_clientes_02_tablas_2')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
