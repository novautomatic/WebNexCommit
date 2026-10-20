-- ============================================================================
-- Tareas de clientes (parte 1/14): tablas principales.
--
-- Sistema APARTE del de tareas internas (no pasa por GitHub). Cada tarea tiene
-- dos partes con su propia fecha: lo que ENTREGA el cliente (lista de
-- entregables) y lo que HACE el encargado de NexCommit. El cliente entra a
-- /mi-espacio con su correo; ver docs/tareas-clientes.md.
--
-- Las 14 partes se corren EN ORDEN en el editor SQL (cada una < 8.000 caracteres).
-- Idempotente.
-- ============================================================================

-- Personas de cada cliente con acceso al portal (un cliente puede tener varias).
CREATE TABLE IF NOT EXISTS public.cliente_contactos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id          uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nombre              text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 120),
  email               text NOT NULL CHECK (email ~* '^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$'),
  telefono            text CHECK (telefono IS NULL OR length(telefono) <= 30),
  cargo               text CHECK (cargo IS NULL OR length(cargo) <= 80),
  activo              boolean NOT NULL DEFAULT true,
  bloqueado_at        timestamptz,   -- derecho de bloqueo: no se le escribe
  user_id             uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  acceso_enviado_at   timestamptz,
  ultimo_ingreso_at   timestamptz,
  aviso_privacidad_at timestamptz,   -- vio el aviso de privacidad del portal
  desactivado_at      timestamptz,
  anonimizado_at      timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cliente_contactos_email_unico ON public.cliente_contactos (lower(email));
CREATE INDEX IF NOT EXISTS cliente_contactos_cliente_idx ON public.cliente_contactos (cliente_id);
COMMENT ON TABLE public.cliente_contactos IS
  'Personas de un cliente con acceso a /mi-espacio. Datos personales (Ley 21.719): base = ejecución del contrato; se anonimizan 12 meses después de desactivadas.';

CREATE TABLE IF NOT EXISTS public.tareas_cliente (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero           bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  cliente_id       uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  contacto_id      uuid NOT NULL REFERENCES public.cliente_contactos(id) ON DELETE RESTRICT,
  encargado_id     uuid NOT NULL REFERENCES public.equipo(id) ON DELETE RESTRICT,
  titulo           text NOT NULL CHECK (length(trim(titulo)) BETWEEN 3 AND 160),
  tarea_cliente    text NOT NULL CHECK (length(trim(tarea_cliente)) BETWEEN 3 AND 4000),
  tarea_encargado  text NOT NULL CHECK (length(trim(tarea_encargado)) BETWEEN 3 AND 4000),
  fecha_cliente    date NOT NULL,
  fecha_encargado  date NOT NULL,
  estado_cliente   text NOT NULL DEFAULT 'pendiente'
                   CHECK (estado_cliente IN ('pendiente', 'entregada', 'devuelta', 'aprobada')),
  estado_encargado text NOT NULL DEFAULT 'pendiente'
                   CHECK (estado_encargado IN ('pendiente', 'en_progreso', 'lista')),
  entregada_at     timestamptz,
  aprobada_at      timestamptz,
  cerrada_at       timestamptz,
  cancelada_at     timestamptz,
  plantilla_id     uuid,
  solicitud_id     uuid,
  aviso_encargado_el date,         -- último recordatorio al encargado
  aviso_duenos_at  timestamptz,    -- aviso de vencida a los dueños (una vez)
  creada_por       uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tareas_cliente_fechas CHECK (fecha_encargado >= fecha_cliente)
);
CREATE INDEX IF NOT EXISTS tareas_cliente_cliente_idx ON public.tareas_cliente (cliente_id);
CREATE INDEX IF NOT EXISTS tareas_cliente_abiertas_idx ON public.tareas_cliente (fecha_cliente)
  WHERE cerrada_at IS NULL AND cancelada_at IS NULL;

CREATE TABLE IF NOT EXISTS public.tareas_cliente_entregables (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id   uuid NOT NULL REFERENCES public.tareas_cliente(id) ON DELETE CASCADE,
  orden      integer NOT NULL DEFAULT 0,
  texto      text NOT NULL CHECK (length(trim(texto)) BETWEEN 1 AND 300),
  hecho      boolean NOT NULL DEFAULT false,
  hecho_at   timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tareas_cliente_entregables_tarea_idx ON public.tareas_cliente_entregables (tarea_id, orden);

-- Notas: las internas (interna = true) nunca llegan al portal del cliente.
CREATE TABLE IF NOT EXISTS public.tareas_cliente_notas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id          uuid NOT NULL REFERENCES public.tareas_cliente(id) ON DELETE CASCADE,
  entregable_id     uuid REFERENCES public.tareas_cliente_entregables(id) ON DELETE SET NULL,
  autor_contacto_id uuid REFERENCES public.cliente_contactos(id) ON DELETE SET NULL,
  autor_equipo_id   uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  autor_nombre      text NOT NULL,
  interna           boolean NOT NULL DEFAULT false,
  texto             text NOT NULL CHECK (length(trim(texto)) BETWEEN 1 AND 4000),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tareas_cliente_notas_tarea_idx ON public.tareas_cliente_notas (tarea_id, created_at);

-- Archivos en Storage (bucket privado tareas-clientes, ruta <tarea_id>/<archivo>).
CREATE TABLE IF NOT EXISTS public.tareas_cliente_archivos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id           uuid NOT NULL REFERENCES public.tareas_cliente(id) ON DELETE CASCADE,
  entregable_id      uuid REFERENCES public.tareas_cliente_entregables(id) ON DELETE SET NULL,
  ruta               text NOT NULL UNIQUE,
  nombre             text NOT NULL CHECK (length(nombre) BETWEEN 1 AND 200),
  tamano             bigint NOT NULL DEFAULT 0,
  tipo               text,
  subido_contacto_id uuid REFERENCES public.cliente_contactos(id) ON DELETE SET NULL,
  subido_equipo_id   uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  subido_por         text NOT NULL,
  eliminado_at       timestamptz,   -- alguien lo quitó: se oculta y el cron lo borra de Storage
  borrado_at         timestamptz,   -- ya no está en Storage (quitado o por retención)
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tareas_cliente_archivos_tarea_idx ON public.tareas_cliente_archivos (tarea_id);

CREATE TABLE IF NOT EXISTS public.tareas_cliente_historial (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tarea_id   uuid NOT NULL REFERENCES public.tareas_cliente(id) ON DELETE CASCADE,
  actor      text NOT NULL,
  accion     text NOT NULL,
  detalle    text,
  visible_cliente boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tareas_cliente_historial_tarea_idx ON public.tareas_cliente_historial (tarea_id, created_at);

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261019120100', 'tareas_clientes_01_tablas')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
