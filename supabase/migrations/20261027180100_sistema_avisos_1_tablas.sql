-- ============================================================================
--  Sistema de avisos (panel → Avisos, solo dueños) · parte 1 de 3: tablas
--
--  Un aviso = QUÉ lo dispara (saldo de OpenAI bajo, una fecha programada o a
--  mano) + POR DÓNDE sale (WhatsApp, correo o los dos, cada uno con su
--  interruptor) + QUÉ dice (texto propio, que se puede partir de una plantilla).
--  Lo evalúa y lo envía el back de Agente-Next (POST /avisos/sistema/revisar),
--  llamado por el cron de la parte 3. El WhatsApp sale del número de avisos de
--  NexCommit (+56 9 8511 0430) con la plantilla de Meta «aviso_nexcommit».
--
--  Variables en asunto y texto: {{aviso}} {{fecha}} {{hora}} {{saldo_usd}}
--  {{saldo_clp}} {{umbral_usd}} {{umbral_clp}} {{enlace_recarga}} {{panel}}
--  Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.avisos_plantillas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  categoria   text NOT NULL DEFAULT 'general',
  asunto      text NOT NULL,
  cuerpo      text NOT NULL,
  es_sistema  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS avisos_plantillas_sistema_nombre
  ON public.avisos_plantillas (nombre) WHERE es_sistema;

CREATE TABLE IF NOT EXISTS public.avisos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            text NOT NULL,
  tipo              text NOT NULL CHECK (tipo IN ('saldo_openai', 'programado', 'manual')),
  -- saldo_openai: avisa cuando el saldo estimado queda en este monto o menos
  umbral_usd        numeric(10,2),
  repetir_horas     int NOT NULL DEFAULT 6 CHECK (repetir_horas BETWEEN 1 AND 168),
  -- programado: cuándo toca el próximo y cada cuánto se repite
  proximo_envio     timestamptz,
  frecuencia        text CHECK (frecuencia IN ('una_vez', 'diaria', 'semanal', 'mensual')),
  plantilla_id      uuid REFERENCES public.avisos_plantillas(id) ON DELETE SET NULL,
  asunto            text NOT NULL,
  cuerpo            text NOT NULL,
  whatsapp_activo   boolean NOT NULL DEFAULT true,
  whatsapp_destinos text,
  correo_activo     boolean NOT NULL DEFAULT true,
  correo_destinos   text,
  activo            boolean NOT NULL DEFAULT true,
  -- lo escribe el back: cuándo se avisó por la condición actual (se borra
  -- cuando la condición deja de cumplirse, p. ej. tras recargar)
  disparado_at      timestamptz,
  ultimo_envio_at   timestamptz,
  ultimo_resultado  text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT avisos_saldo_umbral CHECK (tipo <> 'saldo_openai' OR umbral_usd IS NOT NULL),
  CONSTRAINT avisos_programado_fecha CHECK (tipo <> 'programado' OR (proximo_envio IS NOT NULL AND frecuencia IS NOT NULL))
);

-- Registro de cada envío (teléfono o correo del destinatario: se borra a los
-- 180 días, cron de la parte 3).
CREATE TABLE IF NOT EXISTS public.avisos_envios (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aviso_id     uuid REFERENCES public.avisos(id) ON DELETE SET NULL,
  aviso_nombre text,
  canal        text NOT NULL CHECK (canal IN ('whatsapp', 'correo')),
  destino      text,
  estado       text NOT NULL CHECK (estado IN ('enviado', 'error')),
  detalle      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS avisos_envios_aviso_idx ON public.avisos_envios (aviso_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.avisos_tocar_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS avisos_updated_at ON public.avisos;
CREATE TRIGGER avisos_updated_at BEFORE UPDATE ON public.avisos
  FOR EACH ROW EXECUTE FUNCTION public.avisos_tocar_updated_at();
DROP TRIGGER IF EXISTS avisos_plantillas_updated_at ON public.avisos_plantillas;
CREATE TRIGGER avisos_plantillas_updated_at BEFORE UPDATE ON public.avisos_plantillas
  FOR EACH ROW EXECUTE FUNCTION public.avisos_tocar_updated_at();

-- ─── RLS: solo dueños (saldo y costos de la empresa) ────────────────────────
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_envios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS avisos_duenos ON public.avisos;
CREATE POLICY avisos_duenos ON public.avisos FOR ALL TO authenticated
  USING (public.es_dueno()) WITH CHECK (public.es_dueno());

DROP POLICY IF EXISTS avisos_plantillas_leer ON public.avisos_plantillas;
CREATE POLICY avisos_plantillas_leer ON public.avisos_plantillas FOR SELECT TO authenticated
  USING (public.es_dueno());
-- Las de sistema no se editan ni se borran: se duplican.
DROP POLICY IF EXISTS avisos_plantillas_escribir ON public.avisos_plantillas;
CREATE POLICY avisos_plantillas_escribir ON public.avisos_plantillas FOR ALL TO authenticated
  USING (public.es_dueno() AND NOT es_sistema) WITH CHECK (public.es_dueno() AND NOT es_sistema);

DROP POLICY IF EXISTS avisos_envios_leer ON public.avisos_envios;
CREATE POLICY avisos_envios_leer ON public.avisos_envios FOR SELECT TO authenticated
  USING (public.es_dueno());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avisos, public.avisos_plantillas TO authenticated;
GRANT SELECT ON public.avisos_envios TO authenticated;
