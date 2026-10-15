-- Consentimiento de clientes (parte 2/6). Correr después de la parte 1.

-- ─── Enlace firmado de /confirmar-datos ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'clientes_token_secret') THEN
    PERFORM vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
                                'clientes_token_secret', 'Firma de los enlaces de nexcommit.com/confirmar-datos');
  END IF;
END $$;

-- Subir token_version de un cliente invalida todos sus enlaces anteriores.
CREATE OR REPLACE FUNCTION public.cliente_token(p_cliente uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT left(encode(sha256(convert_to(s.decrypted_secret || ':' || c.id || ':' || c.token_version, 'UTF8')), 'hex'), 40)
    FROM public.clientes c, vault.decrypted_secrets s
   WHERE c.id = p_cliente AND s.name = 'clientes_token_secret'
$$;

CREATE OR REPLACE FUNCTION public.cliente_enlace(p_cliente uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'https://www.nexcommit.com/confirmar-datos?c=' || p_cliente || '&t=' || public.cliente_token(p_cliente)
$$;

-- ─── Candado: el consentimiento solo lo cambian las funciones autorizadas ──
CREATE OR REPLACE FUNCTION public.clientes_proteger_consentimiento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('app.consentimiento', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.acepta_politicas_at := NULL;  NEW.acepta_marketing := false;  NEW.acepta_marketing_at := NULL;
    NEW.consentimiento_origen := NULL;  NEW.lead_id := NULL;  NEW.invitacion_enviada_at := NULL;
    RETURN NEW;
  END IF;
  NEW.acepta_politicas_at   := OLD.acepta_politicas_at;
  NEW.consentimiento_origen := OLD.consentimiento_origen;
  NEW.lead_id               := OLD.lead_id;
  NEW.invitacion_enviada_at := OLD.invitacion_enviada_at;
  NEW.token_version         := OLD.token_version;
  IF NEW.acepta_marketing AND NOT OLD.acepta_marketing THEN
    RAISE EXCEPTION 'Las promociones solo las puede activar el cliente desde su enlace.';
  ELSIF OLD.acepta_marketing AND NOT NEW.acepta_marketing THEN
    NEW.acepta_marketing_at := now();
    INSERT INTO public.cliente_consentimientos (cliente_id, accion, origen, detalle)
    VALUES (OLD.id, 'retira_marketing', 'panel', 'Retirado por ' || coalesce((SELECT nombre FROM public.equipo WHERE id = public.mi_equipo_id()), 'el equipo'));
  ELSE
    NEW.acepta_marketing_at := OLD.acepta_marketing_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS clientes_proteger_consentimiento ON public.clientes;
CREATE TRIGGER clientes_proteger_consentimiento
  BEFORE INSERT OR UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.clientes_proteger_consentimiento();

REVOKE ALL ON FUNCTION public.cliente_token(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cliente_enlace(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clientes_proteger_consentimiento() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261015120500', 'clientes_consentimiento_2_enlace')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
