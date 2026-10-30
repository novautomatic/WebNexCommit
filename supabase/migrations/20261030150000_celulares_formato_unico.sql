-- ============================================================================
-- Celulares en un solo formato: +569XXXXXXXX
--
-- Se escriba como se escriba («9 1234 5678», «+56 9 1234-5678», «912345678»),
-- se guardan los 8 últimos dígitos con «+569» adelante. Lo hace un trigger en
-- la base, así da igual quién escribe (panel, portal del cliente, formularios
-- web, back o SQL a mano). Con menos de 8 dígitos el guardado se rechaza.
-- Vacío = sin número (NULL).
--
-- Tablas: equipo.whatsapp, clientes.telefono, cliente_contactos.telefono,
-- contactos_web.telefono, creador_leads.telefono. (creador_contactos no: son
-- clientes de las páginas de nuestros clientes y pueden ser de otro país.)
--
-- Al enviar por WhatsApp el back ya quita el «+» (normalizarNumero).
-- Idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalizar_celular(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN length(d) >= 8 THEN '+569' || right(d, 8) END
    FROM (SELECT regexp_replace(coalesce(p, ''), '\D', '', 'g') AS d) x
$$;

-- TG_ARGV[0] = nombre de la columna del celular.
CREATE OR REPLACE FUNCTION public.celular_antes_de_guardar()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  col   text := TG_ARGV[0];
  nuevo text := to_jsonb(NEW) ->> col;
  limpio text;
BEGIN
  -- Si no cambió, no se toca (no rompe filas viejas al editar otro campo).
  IF TG_OP = 'UPDATE' AND nuevo IS NOT DISTINCT FROM (to_jsonb(OLD) ->> col) THEN
    RETURN NEW;
  END IF;
  IF nullif(trim(coalesce(nuevo, '')), '') IS NULL THEN
    limpio := NULL;
  ELSE
    limpio := public.normalizar_celular(nuevo);
    IF limpio IS NULL THEN
      RAISE EXCEPTION 'Celular inválido: «%». Escribe al menos los 8 dígitos (ej: 9 1234 5678).', nuevo
        USING ERRCODE = '22023';
    END IF;
  END IF;
  NEW := jsonb_populate_record(NEW, jsonb_build_object(col, limpio));
  RETURN NEW;
END $$;

-- Los CHECK viejos exigían solo dígitos: se quitan antes de convertir.
ALTER TABLE public.equipo        DROP CONSTRAINT IF EXISTS equipo_whatsapp_check;
ALTER TABLE public.contactos_web DROP CONSTRAINT IF EXISTS contactos_web_telefono_check;
ALTER TABLE public.creador_leads DROP CONSTRAINT IF EXISTS creador_leads_telefono_check;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT * FROM (VALUES
      ('equipo', 'whatsapp'), ('clientes', 'telefono'), ('cliente_contactos', 'telefono'),
      ('contactos_web', 'telefono'), ('creador_leads', 'telefono')) v(tabla, col)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t.tabla || '_celular', t.tabla);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF %I ON public.%I
                    FOR EACH ROW EXECUTE FUNCTION public.celular_antes_de_guardar(%L)',
                   t.tabla || '_celular', t.col, t.tabla, t.col);
    -- Lo que ya está guardado. Los que tienen menos de 8 dígitos quedan como
    -- estaban (se ven en la verificación).
    EXECUTE format('UPDATE public.%1$I SET %2$I = public.normalizar_celular(%2$I)
                     WHERE public.normalizar_celular(%2$I) IS NOT NULL
                       AND %2$I IS DISTINCT FROM public.normalizar_celular(%2$I)', t.tabla, t.col);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t.tabla, t.tabla || '_celular_formato');
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I IS NULL OR %I ~ %L) NOT VALID',
                   t.tabla, t.tabla || '_celular_formato', t.col, t.col, '^\+569[0-9]{8}$');
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261030150000', 'celulares_formato_unico')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Verificación: todos deben verse como +569XXXXXXXX
SELECT 'equipo' AS tabla, nombre, whatsapp AS celular FROM public.equipo WHERE whatsapp IS NOT NULL
UNION ALL SELECT 'clientes', nombre, telefono FROM public.clientes WHERE telefono IS NOT NULL
UNION ALL SELECT 'cliente_contactos', nombre, telefono FROM public.cliente_contactos WHERE telefono IS NOT NULL
ORDER BY 1, 2;
