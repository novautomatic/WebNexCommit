-- ============================================================================
-- Tareas: GitHub es la fuente de verdad, Supabase el respaldo
--
-- Todas las tareas nacen y se mueven en GitHub Issues (cuenta novautomatic).
--   * GitHub → Supabase: `github_sync_tick()` (pg_cron cada minuto, y el panel
--     cada 30 s) pide a GET /issues?filter=all&since=<cursor> los issues que
--     cambiaron y los copia a `tareas`. Los comentarios se traen cuando cambia
--     su cantidad en el issue.
--   * Panel → GitHub: el panel ya no escribe `tareas` directo. Llama a las RPC
--     tarea_crear / tarea_actualizar / tarea_comentar, que mandan el cambio a
--     GitHub (REST para crear, etiquetas y comentarios; GraphQL para título,
--     cuerpo, cerrar y reabrir, porque pg_net no tiene PATCH) y dejan una copia
--     optimista marcada `sync_estado = 'pendiente'` hasta que GitHub la confirma.
--
-- Mapeo issue → tarea:
--   estado     abierto = pendiente, salvo etiqueta «en progreso», «en revisión»
--              o «bloqueada»; cerrado como completed = completada,
--              not_planned = cancelada
--   prioridad  etiqueta «prioridad: urgente|alta|media|baja»; si no hay,
--              «Urgenteee» = urgente, «bug» = alta, si no media
--   responsable  asignado cuyo login está en equipo.github_login, o etiqueta
--              que esté en equipo.github_labels (ej. «Fabian»)
--   fecha_limite línea «Fecha límite: AAAA-MM-DD» del cuerpo
--
-- Requiere en Vault el secreto `github_token` (token de novautomatic con
-- acceso a issues). Idempotente.
-- ============================================================================

-- ─── Columnas nuevas ───────────────────────────────────────────────────────
ALTER TABLE public.equipo ADD COLUMN IF NOT EXISTS github_login  text;
ALTER TABLE public.equipo ADD COLUMN IF NOT EXISTS github_labels text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS github_numero     integer;
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS github_node_id    text;
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS github_labels     text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS github_autor      text;
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS github_updated_at timestamptz;
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS sync_estado       text NOT NULL DEFAULT 'ok'
  CHECK (sync_estado IN ('ok', 'pendiente', 'error'));
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS sync_error        text;
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS sync_desde        timestamptz;

ALTER TABLE public.tarea_comentarios ADD COLUMN IF NOT EXISTS github_comment_id bigint;
ALTER TABLE public.tarea_comentarios ADD COLUMN IF NOT EXISTS autor_github      text;
CREATE UNIQUE INDEX IF NOT EXISTS tarea_comentarios_github_unico
  ON public.tarea_comentarios (github_comment_id) WHERE github_comment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS proyectos_github_repo_unico
  ON public.proyectos (lower(github_repo)) WHERE github_repo IS NOT NULL;

UPDATE public.tareas
   SET github_numero = substring(github_issue_url FROM '/issues/(\d+)$')::int
 WHERE github_numero IS NULL AND github_issue_url IS NOT NULL;

-- El proyecto interno vive en el repo privado dashboard-tareas.
UPDATE public.proyectos SET github_repo = 'novautomatic/dashboard-tareas'
 WHERE es_interno AND github_repo IS NULL
   AND NOT EXISTS (SELECT 1 FROM public.proyectos WHERE lower(github_repo) = 'novautomatic/dashboard-tareas');

UPDATE public.equipo SET github_labels = ARRAY['Fabian', 'Fabi']
 WHERE lower(email) = 'fabianignacio.tm@gmail.com' AND github_labels = '{}';

-- ─── Estado de la sincronización ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.github_sync_estado (
  id            boolean PRIMARY KEY DEFAULT true CHECK (id),
  cursor        timestamptz,
  ultimo_poll   timestamptz,
  ultimo_ok     timestamptz,
  ultimo_error  text
);
INSERT INTO public.github_sync_estado (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.github_peticiones (
  request_id   bigint PRIMARY KEY,
  tipo         text NOT NULL CHECK (tipo IN ('poll', 'crear', 'actualizar', 'comentar', 'leer_issue', 'leer_comentarios')),
  tarea_id     uuid REFERENCES public.tareas(id) ON DELETE CASCADE,
  comentario_id uuid REFERENCES public.tarea_comentarios(id) ON DELETE CASCADE,
  meta         jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  procesada    boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS github_peticiones_pendientes ON public.github_peticiones (created_at) WHERE NOT procesada;

ALTER TABLE public.github_sync_estado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_peticiones  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.github_sync_estado, public.github_peticiones FROM anon;
DROP POLICY IF EXISTS github_sync_leer ON public.github_sync_estado;
CREATE POLICY github_sync_leer ON public.github_sync_estado FOR SELECT TO authenticated USING (public.es_equipo());

-- ─── Escritura: solo vía RPC (que pasan por GitHub) ────────────────────────
DROP POLICY IF EXISTS tareas_equipo ON public.tareas;
DROP POLICY IF EXISTS tareas_leer   ON public.tareas;
CREATE POLICY tareas_leer ON public.tareas FOR SELECT TO authenticated USING (public.es_equipo());

DROP POLICY IF EXISTS comentarios_crear  ON public.tarea_comentarios;
DROP POLICY IF EXISTS comentarios_borrar ON public.tarea_comentarios;

-- ─── Utilidades ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.github_urlencode(p text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  bytes bytea := convert_to(p, 'UTF8');
  out   text := '';
  b     int;
BEGIN
  FOR i IN 0 .. length(bytes) - 1 LOOP
    b := get_byte(bytes, i);
    IF (b BETWEEN 48 AND 57) OR (b BETWEEN 65 AND 90) OR (b BETWEEN 97 AND 122) OR b IN (45, 46, 95, 126) THEN
      out := out || chr(b);
    ELSE
      out := out || '%' || upper(lpad(to_hex(b), 2, '0'));
    END IF;
  END LOOP;
  RETURN out;
END $$;

-- Etiquetas que el sistema administra (el resto son etiquetas libres).
CREATE OR REPLACE FUNCTION public.github_label_estado(p_estado text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_estado WHEN 'en_progreso' THEN 'en progreso'
                       WHEN 'en_revision' THEN 'en revisión'
                       WHEN 'bloqueada'   THEN 'bloqueada' END
$$;

CREATE OR REPLACE FUNCTION public.github_es_label_administrada(p_label text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(p_label) IN ('en progreso', 'en revisión', 'en revision', 'bloqueada', 'urgenteee')
      OR lower(p_label) LIKE 'prioridad:%'
      OR EXISTS (SELECT 1 FROM public.equipo e, unnest(e.github_labels) l WHERE lower(l) = lower(p_label))
$$;

-- Separa la línea «Fecha límite: AAAA-MM-DD» del resto del cuerpo.
CREATE OR REPLACE FUNCTION public.github_cuerpo(p_descripcion text, p_fecha date)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(trim(concat_ws(E'\n\n',
           nullif(trim(coalesce(p_descripcion, '')), ''),
           CASE WHEN p_fecha IS NOT NULL THEN 'Fecha límite: ' || to_char(p_fecha, 'YYYY-MM-DD') END)), '')
$$;

CREATE OR REPLACE FUNCTION public.github_fecha_de(p_body text)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT (regexp_match(coalesce(p_body, ''), '(?:^|\n)\s*(?:📅\s*)?\**fecha l[ií]mite\**:?\**\s*(\d{4}-\d{2}-\d{2})', 'i'))[1]::date
$$;

CREATE OR REPLACE FUNCTION public.github_descripcion_de(p_body text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(trim(regexp_replace(coalesce(p_body, ''),
           '(^|\n)\s*(?:📅\s*)?\**fecha l[ií]mite\**:?\**\s*\d{4}-\d{2}-\d{2}[^\n]*', '', 'gi')), '')
$$;

-- Envía una petición a GitHub con el token de Vault y la registra.
CREATE OR REPLACE FUNCTION public.github_pedir(
  p_metodo text, p_ruta text, p_cuerpo jsonb, p_tipo text,
  p_tarea uuid DEFAULT NULL, p_comentario uuid DEFAULT NULL, p_meta jsonb DEFAULT '{}'
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  token   text;
  url     text := 'https://api.github.com' || p_ruta;
  headers jsonb;
  req     bigint;
BEGIN
  SELECT decrypted_secret INTO token FROM vault.decrypted_secrets WHERE name = 'github_token';
  IF token IS NULL THEN
    RAISE EXCEPTION 'Falta el secreto github_token en Vault';
  END IF;
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || token,
    'Accept', 'application/vnd.github+json',
    'X-GitHub-Api-Version', '2022-11-28',
    'User-Agent', 'nexcommit-tareas',
    'Content-Type', 'application/json');

  IF p_metodo = 'GET' THEN
    req := net.http_get(url := url, headers := headers, timeout_milliseconds := 20000);
  ELSIF p_metodo = 'POST' THEN
    req := net.http_post(url := url, body := coalesce(p_cuerpo, '{}'), headers := headers, timeout_milliseconds := 20000);
  ELSIF p_metodo = 'DELETE' THEN
    req := net.http_delete(url := url, headers := headers, timeout_milliseconds := 20000);
  ELSE
    RAISE EXCEPTION 'Método no soportado: %', p_metodo;
  END IF;

  INSERT INTO public.github_peticiones (request_id, tipo, tarea_id, comentario_id, meta)
  VALUES (req, p_tipo, p_tarea, p_comentario, p_meta || jsonb_build_object('metodo', p_metodo, 'ruta', p_ruta));
  RETURN req;
END $$;

CREATE OR REPLACE FUNCTION public.github_graphql(p_query text, p_variables jsonb, p_tarea uuid)
RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.github_pedir('POST', '/graphql',
    jsonb_build_object('query', p_query, 'variables', p_variables), 'actualizar', p_tarea, NULL,
    jsonb_build_object('graphql', true))
$$;

-- ─── GitHub → Supabase ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.github_aplicar_issue(p_repo text, i jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_proyecto   uuid;
  v_tarea      record;
  v_id         uuid;
  v_labels     text[];
  v_estado     text;
  v_prioridad  text;
  v_resp       uuid;
  v_autor      uuid;
  v_updated    timestamptz := (i ->> 'updated_at')::timestamptz;
  v_url        text := i ->> 'html_url';
  v_repo_nom   text := split_part(p_repo, '/', 2);
BEGIN
  IF i ? 'pull_request' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_proyecto FROM public.proyectos WHERE lower(github_repo) = lower(p_repo);
  IF v_proyecto IS NULL THEN
    INSERT INTO public.proyectos (nombre, github_repo)
    VALUES (CASE WHEN EXISTS (SELECT 1 FROM public.proyectos WHERE lower(nombre) = lower(v_repo_nom))
                 THEN p_repo ELSE v_repo_nom END, p_repo)
    RETURNING id INTO v_proyecto;
  END IF;

  SELECT array_agg(l ->> 'name' ORDER BY l ->> 'name') INTO v_labels FROM jsonb_array_elements(i -> 'labels') l;
  v_labels := coalesce(v_labels, '{}');

  v_estado := CASE
    WHEN i ->> 'state' = 'closed' AND i ->> 'state_reason' = 'not_planned' THEN 'cancelada'
    WHEN i ->> 'state' = 'closed' THEN 'completada'
    WHEN EXISTS (SELECT 1 FROM unnest(v_labels) l WHERE lower(l) = 'bloqueada') THEN 'bloqueada'
    WHEN EXISTS (SELECT 1 FROM unnest(v_labels) l WHERE lower(l) IN ('en revisión', 'en revision')) THEN 'en_revision'
    WHEN EXISTS (SELECT 1 FROM unnest(v_labels) l WHERE lower(l) = 'en progreso') THEN 'en_progreso'
    ELSE 'pendiente' END;

  SELECT lower(trim(split_part(l, ':', 2))) INTO v_prioridad
    FROM unnest(v_labels) l
   WHERE lower(l) LIKE 'prioridad:%' AND lower(trim(split_part(l, ':', 2))) IN ('urgente', 'alta', 'media', 'baja')
   LIMIT 1;
  v_prioridad := coalesce(v_prioridad,
    CASE WHEN EXISTS (SELECT 1 FROM unnest(v_labels) l WHERE lower(l) = 'urgenteee') THEN 'urgente'
         WHEN EXISTS (SELECT 1 FROM unnest(v_labels) l WHERE lower(l) = 'bug') THEN 'alta'
         ELSE 'media' END);

  SELECT e.id INTO v_resp FROM public.equipo e
   WHERE e.github_login IS NOT NULL
     AND lower(e.github_login) IN (SELECT lower(a ->> 'login') FROM jsonb_array_elements(i -> 'assignees') a)
   LIMIT 1;
  IF v_resp IS NULL THEN
    SELECT e.id INTO v_resp FROM public.equipo e, unnest(e.github_labels) gl
     WHERE lower(gl) IN (SELECT lower(l) FROM unnest(v_labels) l)
     ORDER BY e.activo DESC, e.created_at LIMIT 1;
  END IF;

  SELECT e.id INTO v_autor FROM public.equipo e
   WHERE e.github_login IS NOT NULL AND lower(e.github_login) = lower(i -> 'user' ->> 'login') LIMIT 1;

  SELECT * INTO v_tarea FROM public.tareas WHERE github_issue_url = v_url;

  IF v_tarea.id IS NULL THEN
    INSERT INTO public.tareas (
      proyecto_id, titulo, descripcion, estado, prioridad, responsable_id, creado_por, fecha_limite,
      etiquetas, github_issue_url, github_numero, github_node_id, github_labels, github_autor,
      github_updated_at, created_at, completada_at, sync_estado)
    VALUES (
      v_proyecto, left(coalesce(nullif(trim(i ->> 'title'), ''), '(sin título)'), 200),
      public.github_descripcion_de(i ->> 'body'), v_estado, v_prioridad, v_resp, v_autor,
      public.github_fecha_de(i ->> 'body'),
      coalesce((SELECT array_agg(l) FROM unnest(v_labels) l WHERE NOT public.github_es_label_administrada(l)), '{}'),
      v_url, (i ->> 'number')::int, i ->> 'node_id', v_labels, i -> 'user' ->> 'login',
      v_updated, (i ->> 'created_at')::timestamptz,
      CASE WHEN v_estado = 'completada' THEN (i ->> 'closed_at')::timestamptz END, 'ok')
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  -- Cambio local aún no reflejado en GitHub: no pisarlo con un estado viejo.
  IF v_tarea.sync_estado = 'pendiente' AND v_tarea.sync_desde IS NOT NULL AND v_updated < v_tarea.sync_desde THEN
    RETURN v_tarea.id;
  END IF;
  IF v_tarea.github_updated_at IS NOT NULL AND v_updated <= v_tarea.github_updated_at AND v_tarea.sync_estado = 'ok' THEN
    RETURN v_tarea.id;
  END IF;

  UPDATE public.tareas SET
    proyecto_id       = v_proyecto,
    titulo            = left(coalesce(nullif(trim(i ->> 'title'), ''), '(sin título)'), 200),
    descripcion       = public.github_descripcion_de(i ->> 'body'),
    estado            = v_estado,
    prioridad         = v_prioridad,
    responsable_id    = v_resp,
    fecha_limite      = public.github_fecha_de(i ->> 'body'),
    etiquetas         = coalesce((SELECT array_agg(l) FROM unnest(v_labels) l WHERE NOT public.github_es_label_administrada(l)), '{}'),
    github_numero     = (i ->> 'number')::int,
    github_node_id    = i ->> 'node_id',
    github_labels     = v_labels,
    github_autor      = coalesce(github_autor, i -> 'user' ->> 'login'),
    github_updated_at = v_updated,
    completada_at     = CASE WHEN v_estado = 'completada' THEN coalesce((i ->> 'closed_at')::timestamptz, completada_at) END,
    sync_estado       = 'ok',
    sync_error        = NULL
  WHERE id = v_tarea.id;
  RETURN v_tarea.id;
END $$;

CREATE OR REPLACE FUNCTION public.github_aplicar_comentarios(p_tarea uuid, p_lista jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE com jsonb;
BEGIN
  FOR com IN SELECT * FROM jsonb_array_elements(p_lista) LOOP
    INSERT INTO public.tarea_comentarios (tarea_id, autor_id, autor_github, texto, github_comment_id, created_at)
    VALUES (p_tarea,
            (SELECT e.id FROM public.equipo e WHERE e.github_login IS NOT NULL AND lower(e.github_login) = lower(com -> 'user' ->> 'login') LIMIT 1),
            com -> 'user' ->> 'login', left(coalesce(nullif(trim(com ->> 'body'), ''), '(vacío)'), 5000),
            (com ->> 'id')::bigint, (com ->> 'created_at')::timestamptz)
    ON CONFLICT (github_comment_id) WHERE github_comment_id IS NOT NULL DO UPDATE
      SET texto = CASE WHEN tarea_comentarios.autor_id IS NOT NULL AND tarea_comentarios.autor_github IS NULL
                       THEN tarea_comentarios.texto ELSE EXCLUDED.texto END;
  END LOOP;
  -- Borrados en GitHub.
  DELETE FROM public.tarea_comentarios
   WHERE tarea_id = p_tarea AND github_comment_id IS NOT NULL
     AND github_comment_id NOT IN (SELECT (x ->> 'id')::bigint FROM jsonb_array_elements(p_lista) x);
END $$;

-- Procesa las respuestas de GitHub y, si toca, lanza el siguiente poll.
CREATE OR REPLACE FUNCTION public.github_sync_tick()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p          record;
  r          record;
  cuerpo     jsonb;
  item       jsonb;
  v_tarea    uuid;
  st         public.github_sync_estado;
  max_upd    timestamptz;
  procesadas int := 0;
  primera    boolean;
  llena      boolean := false;
  err        text;
  repo       text;
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.es_equipo() THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;
  SELECT * INTO st FROM public.github_sync_estado WHERE id;
  primera := st.cursor IS NULL;

  FOR p IN SELECT * FROM public.github_peticiones WHERE NOT procesada ORDER BY created_at LOOP
    SELECT * INTO r FROM net._http_response WHERE id = p.request_id;
    IF r.id IS NULL THEN
      IF p.created_at < now() - interval '10 minutes' THEN
        UPDATE public.github_peticiones SET procesada = true WHERE request_id = p.request_id;
        IF p.tarea_id IS NOT NULL AND p.tipo <> 'leer_comentarios' THEN
          UPDATE public.tareas SET sync_estado = 'error', sync_error = 'GitHub no respondió.' WHERE id = p.tarea_id;
        END IF;
      END IF;
      CONTINUE;
    END IF;

    UPDATE public.github_peticiones SET procesada = true WHERE request_id = p.request_id;
    procesadas := procesadas + 1;
    cuerpo := NULL;
    BEGIN
      cuerpo := r.content::jsonb;
    EXCEPTION WHEN others THEN
      cuerpo := NULL;
    END;

    err := NULL;
    IF r.status_code IS NULL OR r.status_code >= 300 THEN
      err := coalesce(cuerpo ->> 'message', r.error_msg, 'HTTP ' || coalesce(r.status_code::text, '?'));
    ELSIF cuerpo ? 'errors' AND jsonb_typeof(cuerpo -> 'errors') = 'array' AND coalesce((p.meta ->> 'graphql')::boolean, false) THEN
      err := cuerpo -> 'errors' -> 0 ->> 'message';
    END IF;

    IF p.tipo = 'poll' THEN
      IF err IS NOT NULL THEN
        UPDATE public.github_sync_estado SET ultimo_error = left(err, 500) WHERE id;
        CONTINUE;
      END IF;
      IF primera THEN
        PERFORM set_config('app.sin_avisos', 'on', true);
      END IF;
      max_upd := st.cursor;
      llena := jsonb_array_length(cuerpo) >= 100;
      FOR item IN SELECT * FROM jsonb_array_elements(cuerpo) LOOP
        CONTINUE WHEN item ? 'pull_request';
        CONTINUE WHEN coalesce(lower(item -> 'repository' -> 'owner' ->> 'login'), '') <> 'novautomatic';
        repo := item -> 'repository' ->> 'full_name';
        v_tarea := public.github_aplicar_issue(repo, item);
        max_upd := greatest(max_upd, (item ->> 'updated_at')::timestamptz);
        -- Comentarios: se piden solo si cambió la cantidad.
        IF v_tarea IS NOT NULL AND (item ->> 'comments')::int IS DISTINCT FROM
           (SELECT count(*)::int FROM public.tarea_comentarios WHERE tarea_id = v_tarea AND github_comment_id IS NOT NULL) THEN
          PERFORM public.github_pedir('GET', '/repos/' || repo || '/issues/' || (item ->> 'number') || '/comments?per_page=100',
                                      NULL, 'leer_comentarios', v_tarea);
        END IF;
      END LOOP;
      IF primera THEN
        PERFORM set_config('app.sin_avisos', 'off', true);
      END IF;
      UPDATE public.github_sync_estado
         SET cursor = coalesce(max_upd, cursor, now() - interval '1 minute'), ultimo_ok = now(), ultimo_error = NULL
       WHERE id;
      SELECT * INTO st FROM public.github_sync_estado WHERE id;

    ELSIF p.tipo = 'crear' THEN
      IF err IS NOT NULL THEN
        UPDATE public.tareas SET sync_estado = 'error', sync_error = left('GitHub: ' || err, 500) WHERE id = p.tarea_id;
        CONTINUE;
      END IF;
      IF EXISTS (SELECT 1 FROM public.tareas WHERE github_issue_url = cuerpo ->> 'html_url' AND id <> p.tarea_id) THEN
        DELETE FROM public.tareas WHERE id = p.tarea_id;
      ELSE
        UPDATE public.tareas SET github_issue_url = cuerpo ->> 'html_url', github_numero = (cuerpo ->> 'number')::int,
                                 github_node_id = cuerpo ->> 'node_id', github_autor = cuerpo -> 'user' ->> 'login',
                                 sync_desde = NULL
         WHERE id = p.tarea_id;
        PERFORM public.github_aplicar_issue(p.meta ->> 'repo', cuerpo);
      END IF;

    ELSIF p.tipo = 'actualizar' THEN
      IF err IS NOT NULL THEN
        UPDATE public.tareas SET sync_estado = 'error', sync_error = left('GitHub: ' || err, 500) WHERE id = p.tarea_id;
        -- Volver a la verdad de GitHub.
        PERFORM public.github_pedir('GET', '/repos/' || pr.github_repo || '/issues/' || t.github_numero, NULL, 'leer_issue', t.id,
                                    NULL, jsonb_build_object('repo', pr.github_repo))
          FROM public.tareas t JOIN public.proyectos pr ON pr.id = t.proyecto_id
         WHERE t.id = p.tarea_id AND t.github_numero IS NOT NULL;
      ELSIF NOT EXISTS (SELECT 1 FROM public.github_peticiones
                         WHERE tarea_id = p.tarea_id AND NOT procesada AND tipo = 'actualizar') THEN
        UPDATE public.tareas SET sync_estado = 'ok', sync_error = NULL
         WHERE id = p.tarea_id AND sync_estado = 'pendiente';
      END IF;

    ELSIF p.tipo = 'comentar' THEN
      IF err IS NOT NULL THEN
        UPDATE public.tareas SET sync_estado = 'error', sync_error = left('Comentario no enviado a GitHub: ' || err, 500)
         WHERE id = p.tarea_id;
        DELETE FROM public.tarea_comentarios WHERE id = p.comentario_id;
      ELSIF EXISTS (SELECT 1 FROM public.tarea_comentarios WHERE github_comment_id = (cuerpo ->> 'id')::bigint) THEN
        DELETE FROM public.tarea_comentarios WHERE id = p.comentario_id;
      ELSE
        UPDATE public.tarea_comentarios SET github_comment_id = (cuerpo ->> 'id')::bigint WHERE id = p.comentario_id;
      END IF;

    ELSIF p.tipo = 'leer_issue' AND err IS NULL THEN
      PERFORM public.github_aplicar_issue(p.meta ->> 'repo', cuerpo);

    ELSIF p.tipo = 'leer_comentarios' AND err IS NULL AND jsonb_typeof(cuerpo) = 'array' THEN
      PERFORM public.github_aplicar_comentarios(p.tarea_id, cuerpo);
    END IF;
  END LOOP;

  -- Siguiente poll (uno a la vez, como mucho cada 20 s; de inmediato si la
  -- página anterior vino llena y quedan más).
  IF NOT EXISTS (SELECT 1 FROM public.github_peticiones WHERE tipo = 'poll' AND NOT procesada)
     AND (llena OR st.ultimo_poll IS NULL OR st.ultimo_poll < now() - interval '20 seconds') THEN
    PERFORM public.github_pedir('GET',
      '/issues?filter=all&state=all&sort=updated&direction=asc&per_page=100'
        || CASE WHEN st.cursor IS NOT NULL
                THEN '&since=' || to_char((st.cursor - interval '1 second') AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                ELSE '' END,
      NULL, 'poll');
    UPDATE public.github_sync_estado SET ultimo_poll = now() WHERE id;
  END IF;

  DELETE FROM public.github_peticiones WHERE procesada AND created_at < now() - interval '2 days';
  RETURN jsonb_build_object('procesadas', procesadas);
END $$;

-- ─── Panel → GitHub ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.github_labels_deseadas(
  p_libres text[], p_estado text, p_prioridad text, p_responsable uuid, p_actuales text[] DEFAULT '{}'
) RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ARRAY(SELECT DISTINCT x FROM unnest(
    coalesce(p_libres, '{}')
    || ARRAY[public.github_label_estado(p_estado), 'prioridad: ' || p_prioridad]
    || coalesce((SELECT CASE
                   -- Conserva la etiqueta de persona que ya tenía si sigue siendo de esa persona.
                   WHEN EXISTS (SELECT 1 FROM unnest(e.github_labels) gl, unnest(p_actuales) a WHERE lower(gl) = lower(a))
                   THEN (SELECT array_agg(a) FROM unnest(p_actuales) a WHERE lower(a) IN (SELECT lower(gl) FROM unnest(e.github_labels) gl))
                   WHEN cardinality(e.github_labels) > 0 THEN ARRAY[e.github_labels[1]]
                   ELSE '{}'::text[] END
                 FROM public.equipo e WHERE e.id = p_responsable), '{}')
  ) x WHERE x IS NOT NULL)
$$;

-- Quien recibe una tarea necesita una etiqueta de persona en GitHub; si no
-- tiene, se le asigna su primer nombre.
CREATE OR REPLACE FUNCTION public.asegurar_label_persona(p_equipo uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.equipo SET github_labels = ARRAY[split_part(trim(nombre), ' ', 1)]
   WHERE id = p_equipo AND cardinality(github_labels) = 0
$$;

CREATE OR REPLACE FUNCTION public.tarea_crear(
  p_proyecto uuid, p_titulo text, p_descripcion text DEFAULT NULL, p_responsable uuid DEFAULT NULL,
  p_prioridad text DEFAULT 'media', p_estado text DEFAULT 'pendiente', p_fecha date DEFAULT NULL,
  p_etiquetas text[] DEFAULT '{}'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_repo   text;
  v_id     uuid;
  v_labels text[];
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'no autorizado'; END IF;
  IF p_estado IN ('completada', 'cancelada') THEN RAISE EXCEPTION 'Una tarea nueva no puede nacer cerrada.'; END IF;
  SELECT github_repo INTO v_repo FROM public.proyectos WHERE id = p_proyecto;
  IF v_repo IS NULL THEN RAISE EXCEPTION 'Ese proyecto no tiene repositorio de GitHub.'; END IF;

  PERFORM public.asegurar_label_persona(p_responsable);
  v_labels := public.github_labels_deseadas(p_etiquetas, p_estado, p_prioridad, p_responsable);

  INSERT INTO public.tareas (proyecto_id, titulo, descripcion, estado, prioridad, responsable_id, fecha_limite,
                             etiquetas, github_labels, sync_estado, sync_desde)
  VALUES (p_proyecto, left(trim(p_titulo), 200), nullif(trim(coalesce(p_descripcion, '')), ''), p_estado, p_prioridad,
          p_responsable, p_fecha, coalesce(p_etiquetas, '{}'), v_labels, 'pendiente', now())
  RETURNING id INTO v_id;

  PERFORM public.github_pedir('POST', '/repos/' || v_repo || '/issues',
    jsonb_strip_nulls(jsonb_build_object(
      'title', left(trim(p_titulo), 200),
      'body', public.github_cuerpo(p_descripcion, p_fecha),
      'labels', to_jsonb(v_labels))),
    'crear', v_id, NULL, jsonb_build_object('repo', v_repo));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.tarea_actualizar(p_tarea uuid, p_cambios jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t          public.tareas;
  v_repo     text;
  n          public.tareas;
  v_labels   text[];
  quitar     text;
  agregar    text[];
  base       text;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'no autorizado'; END IF;
  SELECT * INTO t FROM public.tareas WHERE id = p_tarea;
  IF t.id IS NULL THEN RAISE EXCEPTION 'La tarea no existe.'; END IF;
  IF t.github_numero IS NULL OR t.github_node_id IS NULL THEN
    RAISE EXCEPTION 'La tarea todavía no está sincronizada con GitHub. Espera unos segundos y reintenta.';
  END IF;
  IF p_cambios ? 'proyecto_id' AND (p_cambios ->> 'proyecto_id')::uuid IS DISTINCT FROM t.proyecto_id THEN
    RAISE EXCEPTION 'Para mover una tarea a otro proyecto, transfiere el issue en GitHub.';
  END IF;
  SELECT github_repo INTO v_repo FROM public.proyectos WHERE id = t.proyecto_id;
  base := '/repos/' || v_repo || '/issues/' || t.github_numero;

  n := t;
  IF p_cambios ? 'titulo'         THEN n.titulo := left(trim(p_cambios ->> 'titulo'), 200); END IF;
  IF p_cambios ? 'descripcion'    THEN n.descripcion := nullif(trim(coalesce(p_cambios ->> 'descripcion', '')), ''); END IF;
  IF p_cambios ? 'fecha_limite'   THEN n.fecha_limite := (p_cambios ->> 'fecha_limite')::date; END IF;
  IF p_cambios ? 'estado'         THEN n.estado := p_cambios ->> 'estado'; END IF;
  IF p_cambios ? 'prioridad'      THEN n.prioridad := p_cambios ->> 'prioridad'; END IF;
  IF p_cambios ? 'responsable_id' THEN n.responsable_id := (p_cambios ->> 'responsable_id')::uuid; END IF;
  IF p_cambios ? 'etiquetas'      THEN
    n.etiquetas := coalesce(ARRAY(SELECT jsonb_array_elements_text(p_cambios -> 'etiquetas')), '{}');
  END IF;

  PERFORM public.asegurar_label_persona(n.responsable_id);

  -- Título y cuerpo.
  IF n.titulo IS DISTINCT FROM t.titulo OR n.descripcion IS DISTINCT FROM t.descripcion
     OR n.fecha_limite IS DISTINCT FROM t.fecha_limite THEN
    PERFORM public.github_graphql(
      'mutation($id:ID!,$t:String,$b:String){updateIssue(input:{id:$id,title:$t,body:$b}){issue{id}}}',
      jsonb_build_object('id', t.github_node_id, 't', n.titulo, 'b', coalesce(public.github_cuerpo(n.descripcion, n.fecha_limite), '')),
      t.id);
  END IF;

  -- Abrir / cerrar.
  IF n.estado IN ('completada', 'cancelada') AND (t.estado NOT IN ('completada', 'cancelada') OR n.estado <> t.estado) THEN
    PERFORM public.github_graphql(
      'mutation($id:ID!,$r:IssueClosedStateReason){closeIssue(input:{issueId:$id,stateReason:$r}){issue{id}}}',
      jsonb_build_object('id', t.github_node_id, 'r', CASE n.estado WHEN 'cancelada' THEN 'NOT_PLANNED' ELSE 'COMPLETED' END),
      t.id);
  ELSIF n.estado NOT IN ('completada', 'cancelada') AND t.estado IN ('completada', 'cancelada') THEN
    PERFORM public.github_graphql(
      'mutation($id:ID!){reopenIssue(input:{issueId:$id}){issue{id}}}',
      jsonb_build_object('id', t.github_node_id), t.id);
  END IF;

  -- Etiquetas: las libres que el usuario dejó + las administradas nuevas.
  v_labels := public.github_labels_deseadas(
    n.etiquetas
      || coalesce((SELECT array_agg(l) FROM unnest(t.github_labels) l
                    WHERE public.github_es_label_administrada(l) IS FALSE
                      AND lower(l) NOT IN (SELECT lower(x) FROM unnest(t.etiquetas) x)
                      AND lower(l) NOT IN ('bug')), '{}')
      || CASE WHEN EXISTS (SELECT 1 FROM unnest(t.github_labels) l WHERE lower(l) = 'bug')
                AND (NOT (p_cambios ? 'etiquetas') OR 'bug' = ANY (n.etiquetas)) THEN ARRAY['bug'] ELSE '{}'::text[] END,
    CASE WHEN n.estado IN ('completada', 'cancelada') THEN 'pendiente' ELSE n.estado END,
    n.prioridad, n.responsable_id,
    CASE WHEN n.responsable_id IS NOT DISTINCT FROM t.responsable_id THEN t.github_labels ELSE '{}' END);
  -- Las de estado intermedio no se dejan en un issue cerrado.
  IF n.estado IN ('completada', 'cancelada') THEN
    v_labels := ARRAY(SELECT l FROM unnest(v_labels) l WHERE public.github_label_estado(n.estado) IS DISTINCT FROM l);
  END IF;
  -- Sin prioridad explícita previa y sin cambio de prioridad: no ensuciar el issue.
  IF NOT (p_cambios ? 'prioridad') AND NOT EXISTS (SELECT 1 FROM unnest(t.github_labels) l WHERE lower(l) LIKE 'prioridad:%') THEN
    v_labels := ARRAY(SELECT l FROM unnest(v_labels) l WHERE lower(l) NOT LIKE 'prioridad:%')
             || ARRAY(SELECT l FROM unnest(t.github_labels) l WHERE lower(l) = 'urgenteee');
  END IF;

  agregar := ARRAY(SELECT l FROM unnest(v_labels) l WHERE lower(l) NOT IN (SELECT lower(x) FROM unnest(t.github_labels) x));
  IF cardinality(agregar) > 0 THEN
    PERFORM public.github_pedir('POST', base || '/labels', jsonb_build_object('labels', to_jsonb(agregar)), 'actualizar', t.id);
  END IF;
  FOR quitar IN SELECT l FROM unnest(t.github_labels) l WHERE lower(l) NOT IN (SELECT lower(x) FROM unnest(v_labels) x) LOOP
    PERFORM public.github_pedir('DELETE', base || '/labels/' || public.github_urlencode(quitar), NULL, 'actualizar', t.id);
  END LOOP;

  -- Copia optimista (dispara historial y aviso de WhatsApp como siempre).
  UPDATE public.tareas SET
    titulo = n.titulo, descripcion = n.descripcion, fecha_limite = n.fecha_limite, estado = n.estado,
    prioridad = n.prioridad, responsable_id = n.responsable_id,
    etiquetas = coalesce((SELECT array_agg(l) FROM unnest(v_labels) l WHERE NOT public.github_es_label_administrada(l)), '{}'),
    github_labels = v_labels, sync_estado = 'pendiente', sync_error = NULL, sync_desde = now()
  WHERE id = t.id;
END $$;

CREATE OR REPLACE FUNCTION public.tarea_comentar(p_tarea uuid, p_texto text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t       record;
  v_id    uuid;
  v_autor text;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'no autorizado'; END IF;
  IF length(trim(coalesce(p_texto, ''))) = 0 THEN RAISE EXCEPTION 'El comentario está vacío.'; END IF;
  SELECT ta.id, ta.github_numero, pr.github_repo INTO t
    FROM public.tareas ta JOIN public.proyectos pr ON pr.id = ta.proyecto_id WHERE ta.id = p_tarea;
  IF t.github_numero IS NULL THEN RAISE EXCEPTION 'La tarea todavía no está en GitHub.'; END IF;
  SELECT nombre INTO v_autor FROM public.equipo WHERE id = public.mi_equipo_id();

  INSERT INTO public.tarea_comentarios (tarea_id, autor_id, texto)
  VALUES (p_tarea, public.mi_equipo_id(), left(trim(p_texto), 5000))
  RETURNING id INTO v_id;

  PERFORM public.github_pedir('POST', '/repos/' || t.github_repo || '/issues/' || t.github_numero || '/comments',
    jsonb_build_object('body', '**' || coalesce(v_autor, 'Equipo NexCommit') || '** (desde el panel de NexCommit):' || E'\n\n' || trim(p_texto)),
    'comentar', p_tarea, v_id);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.tarea_resincronizar(p_tarea uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record;
BEGIN
  IF NOT public.es_equipo() THEN RAISE EXCEPTION 'no autorizado'; END IF;
  SELECT ta.*, pr.github_repo INTO t FROM public.tareas ta JOIN public.proyectos pr ON pr.id = ta.proyecto_id WHERE ta.id = p_tarea;
  IF t.github_numero IS NULL THEN
    -- Nunca llegó a GitHub: se borra la copia local para que se cree de nuevo desde el panel.
    DELETE FROM public.tareas WHERE id = p_tarea;
    RETURN;
  END IF;
  UPDATE public.tareas SET sync_estado = 'pendiente', sync_desde = NULL WHERE id = p_tarea;
  PERFORM public.github_pedir('GET', '/repos/' || t.github_repo || '/issues/' || t.github_numero, NULL, 'leer_issue',
                              p_tarea, NULL, jsonb_build_object('repo', t.github_repo));
  PERFORM public.github_pedir('GET', '/repos/' || t.github_repo || '/issues/' || t.github_numero || '/comments?per_page=100',
                              NULL, 'leer_comentarios', p_tarea);
END $$;

-- ─── Permisos de las funciones ─────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.github_pedir(text, text, jsonb, text, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.github_graphql(text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.github_aplicar_issue(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.github_aplicar_comentarios(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.github_sync_tick() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.asegurar_label_persona(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tarea_crear(uuid, text, text, uuid, text, text, date, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tarea_actualizar(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tarea_comentar(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tarea_resincronizar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.github_sync_tick() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tarea_crear(uuid, text, text, uuid, text, text, date, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tarea_actualizar(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tarea_comentar(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tarea_resincronizar(uuid) TO authenticated;

-- ─── Cron ──────────────────────────────────────────────────────────────────
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'sync-github-tareas';
  PERFORM cron.schedule('sync-github-tareas', '* * * * *', 'SELECT public.github_sync_tick()');
END $$;

-- Primera pasada: relee todo GitHub para alinear las 70 tareas importadas.
UPDATE public.github_sync_estado SET cursor = NULL, ultimo_poll = NULL WHERE id;

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261007150000', 'tareas_desde_github')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
