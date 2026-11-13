-- Trabajos en segundo plano del conector MCP de NexCommit para Claude
-- (repo novautomatic/back_chat_next, mcp-server/trabajos.js).
--
-- Lo que tarda (informes de Google, análisis con IA, crear o editar páginas del
-- Creador) se registra aquí: si no termina en ~25 s, sigue corriendo, se avisa
-- por correo y el resultado queda guardado para volver a preguntarlo.
--
-- Solo el back (service role) lee y escribe: RLS activo y SIN políticas.
-- Retención: 30 días (cron mcp-trabajos-retencion).
-- Idempotente: se puede correr de nuevo sin romper nada.

CREATE TABLE IF NOT EXISTS public.mcp_trabajos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,                 -- quién lo pidió (sesión del conector)
  tipo          text NOT NULL,                 -- google_resumen, google_campanas, pagina_crear…
  titulo        text NOT NULL,
  clave         text,                          -- para reutilizar informes recientes
  params        jsonb,
  estado        text NOT NULL DEFAULT 'corriendo' CHECK (estado IN ('corriendo', 'listo', 'error')),
  resultado     jsonb,
  error         text,
  entregado     boolean NOT NULL DEFAULT false, -- se respondió en la misma llamada (sin correo)
  avisado_at    timestamptz,
  empezado_at   timestamptz,
  terminado_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mcp_trabajos_email_idx ON public.mcp_trabajos (email, created_at DESC);
CREATE INDEX IF NOT EXISTS mcp_trabajos_clave_idx ON public.mcp_trabajos (email, clave, terminado_at DESC) WHERE clave IS NOT NULL;

ALTER TABLE public.mcp_trabajos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mcp_trabajos FROM anon, authenticated;

COMMENT ON TABLE public.mcp_trabajos IS
  'Trabajos en segundo plano del conector MCP (informes de Google, páginas del Creador). Solo service role. Se borran a los 30 días.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('mcp-trabajos-retencion') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mcp-trabajos-retencion');
    PERFORM cron.schedule('mcp-trabajos-retencion', '20 7 * * *',
      $c$DELETE FROM public.mcp_trabajos WHERE created_at < now() - interval '30 days'$c$);
  END IF;
END $$;
