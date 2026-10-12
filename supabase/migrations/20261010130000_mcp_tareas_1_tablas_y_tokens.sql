-- ============================================================================
-- Servidor MCP del tablero de tareas (Edge Function `mcp-tareas`)
--
-- Permite consultar y mover tareas desde Claude. La Edge Function se conecta
-- con la service role (sin sesión de usuario), así que aquí se resuelve:
--   * Autenticación: cada socio tiene un token secreto (en la URL del conector).
--     Solo se guarda su hash SHA-256 en `mcp_tokens`.
--   * Identidad: `mcp_como(equipo_id)` fija los claims JWT de la transacción al
--     email del socio, de modo que las RPC del panel (tarea_actualizar,
--     tarea_crear…) funcionan tal cual: es_equipo() pasa, el historial registra
--     al socio como actor y el aviso de WhatsApp no se manda al autoasignarse.
--     Se reutiliza así TODA la lógica del panel, incluida la traducción de
--     columnas a etiquetas/cierre de issues en GitHub.
--   * Auditoría: `mcp_registro` guarda quién movió/creó qué y cuándo.
--
-- ESTA MIGRACIÓN VA EN 5 PARTES (…_mcp_tareas_1 a _5): el editor SQL del Dashboard trunca lo
-- que se pega por encima de ~8.000 caracteres. Correrlas en orden (con la CLI o psql se aplican solas).
--
-- Todas las funciones mcp_* son solo para service_role. Idempotente.
--
-- Crear el token de un socio (el valor se muestra UNA vez; no se guarda):
--   SELECT public.mcp_crear_token('jpa.pizarro@gmail.com', 'Claude · Juan Pablo');
-- Revocar:
--   UPDATE public.mcp_tokens SET activo = false WHERE nombre = '...';
-- ============================================================================

-- ─── Tablas ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mcp_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id     uuid NOT NULL REFERENCES public.equipo(id) ON DELETE CASCADE,
  nombre        text NOT NULL,
  token_hash    text NOT NULL UNIQUE,
  activo        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz
);

CREATE TABLE IF NOT EXISTS public.mcp_registro (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  equipo_id   uuid REFERENCES public.equipo(id) ON DELETE SET NULL,
  herramienta text NOT NULL,
  tarea_id    uuid REFERENCES public.tareas(id) ON DELETE SET NULL,
  antes       jsonb,
  despues     jsonb,
  ok          boolean NOT NULL DEFAULT true,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mcp_registro_fecha_idx ON public.mcp_registro (created_at DESC);

ALTER TABLE public.mcp_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_registro ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mcp_tokens, public.mcp_registro FROM anon, authenticated;

-- Los hashes de token no se exponen a nadie; el registro lo lee solo un dueño.
GRANT SELECT ON public.mcp_registro TO authenticated;
DROP POLICY IF EXISTS mcp_registro_dueno ON public.mcp_registro;
CREATE POLICY mcp_registro_dueno ON public.mcp_registro FOR SELECT TO authenticated USING (public.es_dueno());

-- ─── Tokens ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mcp_crear_token(p_email text, p_nombre text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_equipo uuid;
  v_token  text := 'nxc_' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
BEGIN
  v_equipo := (SELECT id FROM public.equipo WHERE lower(email) = lower(p_email) AND activo);
  IF v_equipo IS NULL THEN RAISE EXCEPTION 'No hay un integrante activo con el email %.', p_email; END IF;
  INSERT INTO public.mcp_tokens (equipo_id, nombre, token_hash)
  VALUES (v_equipo, p_nombre, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'));
  RETURN v_token;
END $fn$;

-- Devuelve el socio dueño del token (o nada) y marca el uso.
CREATE OR REPLACE FUNCTION public.mcp_resolver_token(p_hash text)
RETURNS TABLE (equipo_id uuid, nombre text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  RETURN QUERY
  WITH t AS (
    UPDATE public.mcp_tokens k SET last_used_at = now()
     WHERE k.token_hash = p_hash AND k.activo
       AND EXISTS (SELECT 1 FROM public.equipo e WHERE e.id = k.equipo_id AND e.activo)
    RETURNING k.equipo_id
  )
  SELECT e.id, e.nombre FROM t JOIN public.equipo e ON e.id = t.equipo_id;
END $fn$;

DO $do$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261010130000', 'mcp_tareas_1_tablas_y_tokens')
    ON CONFLICT DO NOTHING;
  END IF;
END $do$;
