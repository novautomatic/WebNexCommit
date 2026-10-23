-- ============================================================================
-- Dashboard por cliente · parte 4 de 4: lectura de Gmail, resolver dudosos, crons.
-- Requiere la parte 3. Idempotente.
-- ============================================================================

-- ─── Lectura: procesa la vuelta anterior y pide la siguiente ───────────────
CREATE OR REPLACE FUNCTION public.leer_respuestas_clientes()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l record;  m jsonb;  c record;  nueva uuid;  n integer := 0;
  url text := public.avisos_url('leer-respuestas');
  secreto text;  desde timestamptz;  req bigint;
BEGIN
  IF auth.role() = 'authenticated' AND NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'no autorizado'; END IF;
  FOR l IN SELECT x.id, x.created_at, r.status_code, r.content, r.error_msg, r.timed_out
             FROM public.correo_lecturas x LEFT JOIN net._http_response r ON r.id = x.request_id
            WHERE x.estado = 'pendiente' LOOP
    IF l.status_code BETWEEN 200 AND 299 AND l.content ~ '^\s*\{' THEN
      FOR m IN SELECT * FROM jsonb_array_elements(coalesce(l.content::jsonb -> 'mensajes', '[]')) LOOP
        SELECT co.cliente_id, co.id AS contacto_id INTO c FROM public.cliente_contactos co
         WHERE lower(co.email) = lower(m ->> 'de') ORDER BY co.activo DESC LIMIT 1;
        IF c.cliente_id IS NULL THEN
          SELECT id AS cliente_id, NULL::uuid AS contacto_id INTO c FROM public.clientes
           WHERE lower(email) = lower(m ->> 'de') ORDER BY activo DESC LIMIT 1;
        END IF;
        CONTINUE WHEN c.cliente_id IS NULL;
        INSERT INTO public.cliente_respuestas (message_id, cliente_id, contacto_id, de, asunto, fecha, extracto, tipo, clasificacion)
        VALUES (left(m ->> 'message_id', 300), c.cliente_id, c.contacto_id, lower(m ->> 'de'), left(m ->> 'asunto', 300),
                coalesce((m ->> 'fecha')::timestamptz, now()), left(m ->> 'texto', 2000),
                CASE WHEN m ->> 'tipo' = 'permiso_web' THEN 'permiso_web' ELSE 'otro' END,
                CASE WHEN m ->> 'tipo' = 'permiso_web' AND m ->> 'clasificacion' IN ('si', 'no', 'dudoso')
                     THEN m ->> 'clasificacion' END)
        ON CONFLICT (message_id) DO NOTHING RETURNING id INTO nueva;
        IF nueva IS NOT NULL THEN
          n := n + 1;
          IF m ->> 'tipo' = 'permiso_web' AND m ->> 'clasificacion' IN ('si', 'no') THEN
            PERFORM public.cliente_respuesta_aplicar(nueva, m ->> 'clasificacion', 'anotado automáticamente');
          END IF;
        END IF;
        nueva := NULL;
      END LOOP;
      UPDATE public.correo_lecturas SET estado = 'ok', procesada_at = now(),
             mensajes = jsonb_array_length(coalesce(l.content::jsonb -> 'mensajes', '[]')) WHERE id = l.id;
    ELSIF l.status_code IS NOT NULL OR l.error_msg IS NOT NULL OR l.timed_out
          OR l.created_at < now() - interval '15 minutes' THEN
      UPDATE public.correo_lecturas SET estado = 'error', procesada_at = now(),
             detalle = left(coalesce(CASE WHEN l.content ~ '^\s*\{' THEN l.content::jsonb ->> 'error' END,
                                     l.error_msg, 'HTTP ' || l.status_code, 'Sin respuesta en 15 minutos'), 500)
       WHERE id = l.id;
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM public.correo_lecturas WHERE estado = 'pendiente') THEN RETURN n; END IF;
  SELECT decrypted_secret INTO secreto FROM vault.decrypted_secrets WHERE name = 'avisos_tareas_secret';
  IF url IS NULL OR secreto IS NULL THEN RETURN n; END IF;
  -- Primera vez: 90 días atrás. Después: desde la última lectura buena, con 1 día de margen.
  SELECT coalesce(max(created_at) - interval '1 day', now() - interval '90 days') INTO desde
    FROM public.correo_lecturas WHERE estado = 'ok';
  SELECT net.http_post(
    url := url,
    body := jsonb_build_object('desde', desde, 'direcciones',
      (SELECT coalesce(jsonb_agg(DISTINCT lower(e)), '[]') FROM (
         SELECT email AS e FROM public.clientes WHERE email IS NOT NULL
         UNION SELECT email FROM public.cliente_contactos WHERE anonimizado_at IS NULL) x)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secreto),
    timeout_milliseconds := 60000) INTO req;
  INSERT INTO public.correo_lecturas (request_id, desde) VALUES (req, desde);
  RETURN n;
END $$;

-- ─── El equipo resuelve lo dudoso ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cliente_respuesta_resolver(p_respuesta uuid, p_decision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.es_equipo(), false) THEN RAISE EXCEPTION 'No autorizado.'; END IF;
  IF p_decision NOT IN ('si', 'no', 'ignorar') THEN RAISE EXCEPTION 'Decisión desconocida.'; END IF;
  UPDATE public.cliente_respuestas SET resuelta_at = now(), resuelta_por = public.mi_equipo_id(),
         clasificacion = CASE WHEN p_decision = 'ignorar' THEN clasificacion ELSE p_decision END
   WHERE id = p_respuesta AND tipo = 'permiso_web';
  IF NOT FOUND THEN RAISE EXCEPTION 'Esa respuesta no existe.'; END IF;
  IF p_decision <> 'ignorar' THEN
    PERFORM public.cliente_respuesta_aplicar(p_respuesta, p_decision,
      'confirmado por ' || coalesce((SELECT nombre FROM public.equipo WHERE id = public.mi_equipo_id()), 'el equipo'));
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.cliente_respuesta_aplicar(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leer_respuestas_clientes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cliente_respuesta_resolver(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leer_respuestas_clientes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cliente_respuesta_resolver(uuid, text) TO authenticated;

DO $$
DECLARE j text;
BEGIN
  FOREACH j IN ARRAY ARRAY['leer-respuestas-clientes', 'limpiar-respuestas-clientes'] LOOP
    PERFORM cron.unschedule(j) WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = j);
  END LOOP;
  PERFORM cron.schedule('leer-respuestas-clientes', '*/10 * * * *', 'SELECT public.leer_respuestas_clientes()');
  PERFORM cron.schedule('limpiar-respuestas-clientes', '50 4 * * *',
    $q$DELETE FROM public.cliente_respuestas WHERE fecha < now() - interval '180 days';
       DELETE FROM public.correo_lecturas WHERE created_at < now() - interval '30 days'$q$);
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261022170400', 'dashboard_cliente_4_lectura') ON CONFLICT DO NOTHING;
  END IF;
END $$;
