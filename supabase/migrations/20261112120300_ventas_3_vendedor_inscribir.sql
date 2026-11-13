-- CRM de vendedores (3/7): cálculo de comisión y lo que hacen vendedores y captadores.
-- Ellos no escriben tablas: solo estas funciones, que validan cada regla.

CREATE OR REPLACE FUNCTION public.ventas_comision(p_total bigint, p_tabla text DEFAULT 'normal')
RETURNS bigint LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; pct_a numeric;
BEGIN
  SELECT pct_asignado INTO pct_a FROM ventas_config WHERE id = 1;
  SELECT * INTO t FROM ventas_tramos
   WHERE p_total >= desde AND (hasta IS NULL OR p_total <= hasta) ORDER BY desde DESC LIMIT 1;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF t.monto IS NOT NULL THEN
    IF p_tabla = 'asignado' THEN RETURN round(t.monto * pct_a / 100 / 5000) * 5000; END IF;
    RETURN t.monto;
  END IF;
  IF p_tabla = 'asignado' THEN RETURN round(p_total * round(t.pct * pct_a / 100) / 100); END IF;
  RETURN round(p_total * t.pct / 100);
END $$;

CREATE OR REPLACE FUNCTION public.ventas_actor() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT nombre FROM ventas_personas WHERE id = mi_vendedor_id()),
                  (SELECT nombre FROM equipo WHERE id = mi_equipo_id()), 'Sistema')
$$;

-- Prospecto que la sesión puede trabajar: el asignado o la jefatura.
CREATE OR REPLACE FUNCTION public.ventas_puede(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ventas_jefe() OR EXISTS (SELECT 1 FROM ventas_prospectos WHERE id = p_id AND asignado_a = mi_vendedor_id())
$$;

CREATE OR REPLACE FUNCTION public.ventas_jornada_iniciar(p_zona text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE yo uuid := mi_vendedor_id(); nueva uuid;
BEGIN
  IF yo IS NULL THEN RAISE EXCEPTION 'No tienes acceso a ventas.'; END IF;
  IF length(trim(coalesce(p_zona, ''))) < 2 THEN RAISE EXCEPTION 'Escribe la zona o comuna que vas a recorrer.'; END IF;
  IF EXISTS (SELECT 1 FROM ventas_jornadas WHERE persona_id = yo AND estado = 'abierta') THEN
    RAISE EXCEPTION 'Ya tienes una jornada abierta.';
  END IF;
  INSERT INTO ventas_jornadas (persona_id, zona) VALUES (yo, trim(p_zona)) RETURNING id INTO nueva;
  RETURN nueva;
END $$;

CREATE OR REPLACE FUNCTION public.ventas_jornada_terminar() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE ventas_jornadas SET fin = now(), estado = 'cerrada' WHERE persona_id = mi_vendedor_id() AND estado = 'abierta'
$$;

-- Inscribir: en terreno (jornada abierta) va a la jefatura; un vendedor fuera de
-- jornada registra su propio prospecto (protegido); la jefatura lo deja sin asignar.
CREATE OR REPLACE FUNCTION public.ventas_inscribir(
  p_contacto text, p_negocio text, p_rubro text, p_comuna text, p_whatsapp text,
  p_email text, p_interes text, p_acepta boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  yo uuid := mi_vendedor_id(); mi_rol text; jor uuid; d text; nuevo uuid; v_origen text; v_asig uuid;
BEGIN
  IF yo IS NULL AND NOT ventas_jefe() THEN RAISE EXCEPTION 'No tienes acceso a ventas.'; END IF;
  IF NOT coalesce(p_acepta, false) THEN
    RAISE EXCEPTION 'Sin la autorización de la persona no se puede registrar.';
  END IF;
  IF length(trim(coalesce(p_contacto, ''))) < 2 OR length(trim(coalesce(p_negocio, ''))) < 2 THEN
    RAISE EXCEPTION 'Faltan el nombre de la persona o del negocio.';
  END IF;
  d := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  IF length(d) < 8 THEN RAISE EXCEPTION 'El WhatsApp debe tener al menos 8 dígitos.'; END IF;
  d := '569' || right(d, 8);
  IF EXISTS (SELECT 1 FROM ventas_prospectos WHERE whatsapp = d) THEN
    RAISE EXCEPTION 'Ese WhatsApp ya está registrado.';
  END IF;

  SELECT rol INTO mi_rol FROM ventas_personas WHERE id = yo;
  SELECT id INTO jor FROM ventas_jornadas WHERE persona_id = yo AND estado = 'abierta';
  IF jor IS NOT NULL THEN v_origen := 'terreno';
  ELSIF mi_rol = 'vendedor' THEN v_origen := 'propio'; v_asig := yo;
  ELSIF mi_rol = 'captador' THEN RAISE EXCEPTION 'Inicia tu jornada antes de inscribir.';
  ELSE v_origen := 'panel';
  END IF;

  INSERT INTO ventas_prospectos (contacto, negocio, rubro, comuna, whatsapp, email, interes, origen,
                                 captado_por, jornada_id, asignado_a, asignado_at, acepta_contacto_at)
  VALUES (trim(p_contacto), trim(p_negocio), nullif(trim(p_rubro), ''), nullif(trim(p_comuna), ''), d,
          nullif(lower(trim(p_email)), ''), nullif(trim(p_interes), ''), v_origen, yo, jor, v_asig,
          CASE WHEN v_asig IS NOT NULL THEN now() END, now())
  RETURNING id INTO nuevo;
  INSERT INTO ventas_notas (prospecto_id, autor, tipo, texto)
  VALUES (nuevo, ventas_actor(), 'sistema', 'Registrado (' || v_origen || '). Autorizó ser contactado por WhatsApp.');
  RETURN nuevo;
END $$;
