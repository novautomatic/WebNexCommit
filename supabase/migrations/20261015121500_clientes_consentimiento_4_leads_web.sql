-- Consentimiento de clientes (parte 4/6). Correr después de la parte 3.

-- ─── Clientes que entran por la web (Creador) ──────────────────────────────
-- El lead ya aceptó términos (obligatorio) y quizá ofertas en el formulario.
-- Al marcarlo 'convertido' se crea (o completa) su ficha de cliente.
CREATE OR REPLACE FUNCTION public.cliente_desde_lead(p_lead uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l      public.creador_leads;
  v_id   uuid;
  v_nom  text;
BEGIN
  SELECT * INTO l FROM public.creador_leads WHERE id = p_lead;
  IF l.id IS NULL OR l.anonimizado_at IS NOT NULL THEN RETURN NULL; END IF;

  SELECT id INTO v_id FROM public.clientes
   WHERE lead_id = l.id OR (l.email IS NOT NULL AND lower(email) = lower(l.email))
   ORDER BY (lead_id = l.id) DESC NULLS LAST LIMIT 1;

  PERFORM set_config('app.consentimiento', 'on', true);
  IF v_id IS NULL THEN
    v_nom := coalesce(nullif(trim(l.nombre), ''), l.empresa);
    IF EXISTS (SELECT 1 FROM public.clientes WHERE lower(nombre) = lower(v_nom)) THEN
      v_nom := v_nom || ' · ' || l.empresa;
    END IF;
    IF EXISTS (SELECT 1 FROM public.clientes WHERE lower(nombre) = lower(v_nom)) THEN
      v_nom := v_nom || ' · ' || left(l.id::text, 4);
    END IF;
    INSERT INTO public.clientes (nombre, empresa, email, telefono, lead_id, acepta_politicas_at,
                                 acepta_marketing, acepta_marketing_at, consentimiento_origen)
    VALUES (v_nom, l.empresa, l.email, l.telefono, l.id, l.acepta_terminos_at,
            l.acepta_marketing, CASE WHEN l.acepta_marketing THEN l.acepta_terminos_at END, 'web')
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.clientes SET
      lead_id               = coalesce(lead_id, l.id),
      acepta_politicas_at   = coalesce(acepta_politicas_at, l.acepta_terminos_at),
      consentimiento_origen = coalesce(consentimiento_origen, 'web'),
      acepta_marketing      = acepta_marketing OR (l.acepta_marketing AND acepta_marketing_at IS NULL),
      acepta_marketing_at   = CASE WHEN NOT acepta_marketing AND l.acepta_marketing AND acepta_marketing_at IS NULL
                                   THEN l.acepta_terminos_at ELSE acepta_marketing_at END
    WHERE id = v_id;
  END IF;
  PERFORM set_config('app.consentimiento', '', true);

  INSERT INTO public.cliente_consentimientos (cliente_id, accion, origen, detalle, ip_hash, created_at)
  SELECT v_id, x.accion, 'web', x.detalle, l.ip_hash, l.acepta_terminos_at
    FROM (VALUES ('acepta_politicas', 'Formulario de nexcommit.com/crea-tu-web'),
                 ('acepta_marketing', 'Casilla de ofertas en nexcommit.com/crea-tu-web')) AS x(accion, detalle)
   WHERE (x.accion = 'acepta_politicas' OR l.acepta_marketing)
     AND NOT EXISTS (SELECT 1 FROM public.cliente_consentimientos k
                      WHERE k.cliente_id = v_id AND k.accion = x.accion AND k.origen = 'web');
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.creador_lead_a_cliente()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.cliente_desde_lead(NEW.id);
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS creador_lead_a_cliente ON public.creador_leads;
CREATE TRIGGER creador_lead_a_cliente
  AFTER INSERT OR UPDATE OF estado ON public.creador_leads
  FOR EACH ROW WHEN (NEW.estado = 'convertido')
  EXECUTE FUNCTION public.creador_lead_a_cliente();

-- Los que ya estaban convertidos.
SELECT public.cliente_desde_lead(id) FROM public.creador_leads WHERE estado = 'convertido' AND anonimizado_at IS NULL;

REVOKE ALL ON FUNCTION public.cliente_desde_lead(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.creador_lead_a_cliente() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261015121500', 'clientes_consentimiento_4_leads_web')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
