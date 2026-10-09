-- ============================================================================
-- Creador: tipo de página «Tienda online» (mini ecommerce).
--
--   creador_paginas.tipo   'landing' | 'ecommerce'
--   creador_leads          + password_hash (acceso al mini panel /mi-tienda;
--                            la clave se manda por correo al crear la tienda)
--   creador_productos      hasta productos_max por tienda (10 por defecto)
--   creador_pedidos        pedidos que el comprador envía por WhatsApp
--                          (datos de terceros: se borran a los 90 días)
--   creador_eventos        clics en funciones bloqueadas («Desbloquear para
--                          más»): señal de venta para el equipo
--
-- Todo lo escribe el backend de Agente-Next con service_role. El panel del
-- equipo ve productos y eventos; los pedidos (con datos del comprador) no.
--
-- Idempotente.
-- ============================================================================

ALTER TABLE public.creador_paginas ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'landing';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creador_paginas_tipo_check') THEN
    ALTER TABLE public.creador_paginas ADD CONSTRAINT creador_paginas_tipo_check CHECK (tipo IN ('landing', 'ecommerce'));
  END IF;
END $$;

ALTER TABLE public.creador_leads ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.creador_leads ADD COLUMN IF NOT EXISTS password_cambiada_at timestamptz;

ALTER TABLE public.creador_config ADD COLUMN IF NOT EXISTS productos_max int NOT NULL DEFAULT 10;

-- ─── Productos ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.creador_productos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pagina_id    uuid NOT NULL REFERENCES public.creador_paginas(id) ON DELETE CASCADE,
  nombre       text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 80),
  descripcion  text NOT NULL DEFAULT '',
  precio       int CHECK (precio IS NULL OR precio BETWEEN 0 AND 999999999),
  foto         jsonb,
  destacado    boolean NOT NULL DEFAULT false,
  activo       boolean NOT NULL DEFAULT true,
  orden        double precision NOT NULL DEFAULT extract(epoch FROM now()),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creador_productos_pagina_idx ON public.creador_productos (pagina_id, orden);

DROP TRIGGER IF EXISTS creador_productos_updated ON public.creador_productos;
CREATE TRIGGER creador_productos_updated BEFORE UPDATE ON public.creador_productos
  FOR EACH ROW EXECUTE FUNCTION public.creador_tocar_updated_at();

-- ─── Pedidos ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.creador_pedidos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero      bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  pagina_id   uuid NOT NULL REFERENCES public.creador_paginas(id) ON DELETE CASCADE,
  items       jsonb NOT NULL,
  total       int NOT NULL DEFAULT 0,
  nombre      text,
  nota        text,
  estado      text NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'confirmado', 'entregado', 'cancelado')),
  ip_hash     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creador_pedidos_pagina_idx ON public.creador_pedidos (pagina_id, created_at DESC);
COMMENT ON TABLE public.creador_pedidos IS
  'Pedidos de tiendas del Creador (se envían por WhatsApp al dueño). Datos del comprador: NexCommit es encargado por cuenta del cliente; se borran a los 90 días.';

DROP TRIGGER IF EXISTS creador_pedidos_updated ON public.creador_pedidos;
CREATE TRIGGER creador_pedidos_updated BEFORE UPDATE ON public.creador_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.creador_tocar_updated_at();

-- ─── Interés en funciones bloqueadas ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.creador_eventos (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id     uuid NOT NULL REFERENCES public.creador_leads(id) ON DELETE CASCADE,
  tipo        text NOT NULL DEFAULT 'desbloquear',
  detalle     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creador_eventos_lead_idx ON public.creador_eventos (lead_id, created_at DESC);

-- ─── Retención (reemplaza la función de la migración 20261009120000) ───────
CREATE OR REPLACE FUNCTION public.creador_retencion()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.creador_codigos  WHERE expira_at < now() - interval '1 day';
  DELETE FROM public.creador_sesiones WHERE expira_at < now();
  DELETE FROM public.creador_contactos WHERE created_at < now() - interval '30 days';
  DELETE FROM public.creador_pedidos  WHERE created_at < now() - interval '90 days';
  DELETE FROM public.creador_eventos  WHERE created_at < now() - interval '12 months';
  DELETE FROM public.creador_paginas  WHERE expira_at < now() - interval '30 days';
  DELETE FROM public.creador_leads
   WHERE verificado_at IS NULL AND created_at < now() - interval '7 days'
     AND NOT EXISTS (SELECT 1 FROM public.creador_paginas p WHERE p.lead_id = creador_leads.id);
  UPDATE public.creador_leads
     SET nombre = NULL, email = NULL, telefono = NULL, ip_hash = NULL, notas = NULL,
         acepta_marketing = false, password_hash = NULL, anonimizado_at = now()
   WHERE anonimizado_at IS NULL AND estado <> 'convertido'
     AND created_at < now() - interval '12 months';
END $$;
REVOKE ALL ON FUNCTION public.creador_retencion() FROM PUBLIC, anon, authenticated;

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.creador_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creador_pedidos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creador_eventos   ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creador_productos, public.creador_pedidos, public.creador_eventos FROM anon;
-- Pedidos (datos de compradores): nadie del panel.
REVOKE ALL ON public.creador_pedidos FROM authenticated;
-- Leads: el panel lee solo estas columnas (ni la clave ni los hashes). Un
-- REVOKE de una sola columna no sirve si la tabla entera tiene SELECT.
REVOKE SELECT ON public.creador_leads FROM authenticated;
GRANT SELECT (id, nombre, empresa, email, telefono, acepta_terminos_at, acepta_marketing, verificado_at,
              estado, notas, anonimizado_at, created_at, updated_at)
  ON public.creador_leads TO authenticated;

DROP POLICY IF EXISTS creador_productos_leer ON public.creador_productos;
CREATE POLICY creador_productos_leer ON public.creador_productos FOR SELECT TO authenticated USING (public.es_equipo());
DROP POLICY IF EXISTS creador_eventos_leer ON public.creador_eventos;
CREATE POLICY creador_eventos_leer ON public.creador_eventos FOR SELECT TO authenticated USING (public.es_equipo());

REVOKE UPDATE ON public.creador_config FROM authenticated;
GRANT UPDATE (activo, duracion_dias, tope_diario, ediciones, ediciones_manuales, productos_max, max_caracteres, responsable_id)
  ON public.creador_config TO authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261010150000', 'creador_tienda')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
