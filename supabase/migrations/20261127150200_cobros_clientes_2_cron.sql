-- ============================================================================
--  Cobros a clientes · parte 2 de 2: generar los cobros del mes + aviso
--
--  cobros_generar() corre cada hora (desde las 09:00 de Santiago). Por cada
--  cobro mensual activo cuyo día ya llegó (este mes o, si el cron estuvo caído,
--  el anterior) y que todavía no tiene su cobro de ese mes:
--    1. crea la fila en `cobros` (estado «por cobrar», extra en 0 para anotarlo);
--    2. arma el aviso del cliente en `avisos` (programado, una vez, ahora): el
--       back de Agente-Next lo manda por correo en su revisión de cada 5 min y
--       después lo apaga solo. Hay UN aviso por cobro mensual (se reutiliza cada
--       mes); los destinatarios se pueden cambiar en panel → Avisos y se respetan.
--  Prueba: SELECT public.cobros_generar(forzar => true);
--  Idempotente.
-- ============================================================================

-- Fecha de cobro de un mes: el día pedido o el último del mes si no existe
-- (31 = siempre el último día).
CREATE OR REPLACE FUNCTION public.cobro_fecha(p_mes date, p_dia int)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT make_date(
    extract(year FROM p_mes)::int, extract(month FROM p_mes)::int,
    least(p_dia, extract(day FROM (date_trunc('month', p_mes) + interval '1 month - 1 day'))::int)
  )
$$;

CREATE OR REPLACE FUNCTION public.cobro_pesos(p_monto int)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT '$' || replace(to_char(coalesce(p_monto, 0), 'FM999,999,999,990'), ',', '.')
$$;

CREATE OR REPLACE FUNCTION public.cobros_generar(forzar boolean DEFAULT false)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ahora    timestamp := now() AT TIME ZONE 'America/Santiago';
  hoy      date := ahora::date;
  c        record;
  mes      date;
  fecha    date;
  vence    date;
  nuevo    uuid;
  cliente  text;
  asunto   text;
  cuerpo   text;
  destinos text;
  creados  int := 0;
BEGIN
  IF NOT forzar AND ahora::time < time '09:00' THEN
    RETURN 0;
  END IF;

  SELECT string_agg(email, ', ' ORDER BY nombre) INTO destinos
    FROM public.equipo WHERE activo AND rol = 'dueno' AND email IS NOT NULL;

  FOR c IN
    SELECT cc.*, coalesce(nullif(trim(cl.empresa), ''), cl.nombre) AS nombre_cliente
      FROM public.cobros_clientes cc JOIN public.clientes cl ON cl.id = cc.cliente_id
     WHERE cc.activo AND cl.activo
  LOOP
    FOREACH mes IN ARRAY ARRAY[(date_trunc('month', hoy) - interval '1 month')::date, date_trunc('month', hoy)::date] LOOP
      fecha := public.cobro_fecha(mes, c.dia_cobro);
      CONTINUE WHEN fecha > hoy OR fecha < c.inicio;
      vence := fecha + (c.plazo_dias - 1);

      nuevo := NULL;
      INSERT INTO public.cobros (cobro_cliente_id, cliente_id, periodo, fecha_cobro, vence_el, concepto,
                                 monto_fijo, tiene_extra, extra_detalle)
      VALUES (c.id, c.cliente_id, to_char(mes, 'YYYY-MM'), fecha, vence, c.concepto,
              c.monto_fijo, c.tiene_extra, c.extra_detalle)
      ON CONFLICT (cobro_cliente_id, periodo) WHERE cobro_cliente_id IS NOT NULL DO NOTHING
      RETURNING id INTO nuevo;
      CONTINUE WHEN nuevo IS NULL;
      creados := creados + 1;

      cliente := c.nombre_cliente;
      asunto := '💰 Anotar cobro ' || cliente || ' por ' || public.cobro_pesos(c.monto_fijo)
                || CASE WHEN c.tiene_extra THEN ' + extra' ELSE '' END;
      cuerpo := 'Toca cobrar a ' || cliente || ': ' || c.concepto || ' por ' || public.cobro_pesos(c.monto_fijo) || '.'
        || CASE WHEN c.tiene_extra THEN E'\nAgregar el extra: ' || c.extra_detalle || '.' ELSE '' END
        || E'\nFecha de cobro: ' || to_char(fecha, 'DD-MM-YYYY')
        || CASE WHEN vence > fecha THEN ' (plazo hasta el ' || to_char(vence, 'DD-MM-YYYY') || ')' ELSE '' END || '.'
        || E'\n\nAnótalo en el panel → Cobros: https://www.nexcommit.com/admin?tab=cobros';

      IF c.aviso_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.avisos WHERE id = c.aviso_id) THEN
        UPDATE public.avisos
           SET tipo = 'programado', frecuencia = 'una_vez', proximo_envio = now(), activo = true,
               disparado_at = NULL, asunto = cobros_generar.asunto, cuerpo = cobros_generar.cuerpo,
               nombre = 'Cobro · ' || cliente || ' · ' || c.concepto,
               correo_activo = true, correo_destinos = coalesce(nullif(trim(correo_destinos), ''), destinos)
         WHERE id = c.aviso_id;
      ELSIF destinos IS NOT NULL THEN
        INSERT INTO public.avisos (nombre, tipo, proximo_envio, frecuencia, asunto, cuerpo,
                                   whatsapp_activo, correo_activo, correo_destinos, activo)
        VALUES ('Cobro · ' || cliente || ' · ' || c.concepto, 'programado', now(), 'una_vez',
                cobros_generar.asunto, cobros_generar.cuerpo, false, true, destinos, true)
        RETURNING id INTO c.aviso_id;
        UPDATE public.cobros_clientes SET aviso_id = c.aviso_id WHERE id = c.id;
      END IF;
    END LOOP;
  END LOOP;
  RETURN creados;
END $$;
REVOKE ALL ON FUNCTION public.cobros_generar(boolean) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cobros-generar';
  PERFORM cron.schedule('cobros-generar', '7 * * * *', 'SELECT public.cobros_generar()');
END $$;
