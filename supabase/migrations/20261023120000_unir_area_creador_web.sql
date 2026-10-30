-- Une el área «Ventas – Creador web» con «Ventas y Campañas Ads».
-- Las tareas que tenía pasan a «Ventas y Campañas Ads», el área se borra y
-- las páginas que se publiquen en /crea-tu-web crean su tarea en esa área.
-- Idempotente.

-- 1) Las tareas que se creen con cada página nueva van al área de Ventas y Campañas Ads.
CREATE OR REPLACE FUNCTION public.creador_tarea_por_pagina()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l      public.creador_leads;
  area   public.proyectos;
  resp   uuid;
BEGIN
  SELECT * INTO l FROM public.creador_leads WHERE id = NEW.lead_id;
  SELECT * INTO area FROM public.proyectos WHERE lower(nombre) = lower('Ventas y Campañas Ads') AND tipo = 'area';
  IF area.id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT coalesce(c.responsable_id, area.area_responsable_id) INTO resp FROM public.creador_config c WHERE c.id = 1;

  INSERT INTO public.tareas (proyecto_id, titulo, descripcion, estado, prioridad, responsable_id, creado_por,
                             fecha_limite, etiquetas, sync_estado)
  VALUES (
    area.id,
    left('Lead Creador: ' || l.empresa, 200),
    concat_ws(E'\n',
      'Creó su página de prueba con el Creador.',
      '',
      'Empresa: ' || l.empresa,
      'Nombre: ' || coalesce(l.nombre, '—'),
      'Correo: ' || coalesce(l.email, '—'),
      'WhatsApp: ' || coalesce('+' || l.telefono, '—'),
      'Acepta ofertas: ' || CASE WHEN l.acepta_marketing THEN 'sí' ELSE 'no (solo contactar por su página)' END,
      '',
      'Página: https://www.nexcommit.com/' || NEW.slug,
      'Vence: ' || to_char(NEW.expira_at AT TIME ZONE 'America/Santiago', 'DD-MM-YYYY HH24:MI'),
      '',
      'Objetivo: ofrecerle dejarla permanente antes de que venza.'),
    'pendiente', 'alta', resp, NULL,
    (NEW.publicada_at AT TIME ZONE 'America/Santiago')::date + 1,
    ARRAY['creador', 'lead'], 'ok');

  UPDATE public.creador_leads SET estado = 'con_pagina' WHERE id = NEW.lead_id AND estado IN ('registrado', 'verificado');
  RETURN NEW;
END $$;

-- 2) Mover las tareas que tenía y borrar el área.
DO $$
DECLARE
  v_viejo uuid;
  v_nuevo uuid;
BEGIN
  PERFORM set_config('app.sin_avisos', 'on', true);

  SELECT id INTO v_viejo FROM public.proyectos
   WHERE lower(nombre) = lower('Ventas – Creador web') AND tipo = 'area';
  SELECT id INTO v_nuevo FROM public.proyectos
   WHERE lower(nombre) = lower('Ventas y Campañas Ads') AND tipo = 'area';

  IF v_viejo IS NULL OR v_nuevo IS NULL THEN
    RAISE NOTICE 'Nada que unir (viejo=%, nuevo=%).', v_viejo, v_nuevo;
    RETURN;
  END IF;

  UPDATE public.tareas SET proyecto_id = v_nuevo WHERE proyecto_id = v_viejo;
  DELETE FROM public.proyectos WHERE id = v_viejo;
END $$;
