# Tareas de clientes y portal «Mi espacio»

Sistema **aparte** de las tareas internas (que viven en GitHub). Sirve para lo que un cliente tiene
que entregarnos y para lo que hacemos nosotros con eso.

- **Equipo:** `/admin?tab=clientes-tareas`, en el menú Tareas → «De clientes». Pestañas Tareas,
  Solicitudes, Recurrentes y Contactos. `?tarea=<n>` abre una tarea (los correos usan ese enlace).
- **Clientes:** `https://www.nexcommit.com/mi-espacio`.

## Cómo funciona

Cada tarea tiene **todos los campos obligatorios**: objetivo, cliente, quién del cliente entrega,
encargado de NexCommit y **dos partes con fecha propia**:

| Parte | Qué tiene | Quién la cierra |
|---|---|---|
| Cliente | Qué hacer + lista de entregables + fecha | El cliente marca cada entregable y pulsa «Listo, entregué». El encargado **aprueba** o **devuelve** con una nota |
| NexCommit | Qué hará el encargado + fecha | El encargado la pasa a «Lista» |

La tarea se cierra sola cuando la entrega está aprobada y la parte de NexCommit está lista. Todo
queda en el historial (quién y cuándo). Las notas pueden ser **internas**: el cliente no las ve.

### Correos

| A quién | Cuándo |
|---|---|
| Cliente | Al crear la tarea («Nueva tarea») |
| Cliente | **Lunes a viernes, 10:00**, un solo correo con todas sus tareas pendientes, hasta que entregue. Si venció, el tono cambia, pero sigue siendo amable |
| Cliente | Cuando el encargado devuelve la entrega, con su nota |
| Encargado | Al asignársela (salvo que se la asigne él mismo), cuando el cliente entrega y cuando el cliente deja una nota |
| Encargado | **Cada 2 días** desde 5 días antes del plazo del cliente, y **a diario** si ya venció |
| Dueños | **El día que vence** el plazo del cliente sin entrega (una vez por tarea) |
| Dueños | Solicitudes nuevas del portal y solicitudes de derechos (Ley 21.719) |

Los correos salen por el back de Agente-Next (`POST /avisos/tareas-cliente`, plantillas en
`src/lib/correosTareasCliente.js` de `novautomatic/back_chat_next`). Cada envío queda en
`tareas_cliente_avisos` y se ve en el detalle de la tarea («Correos enviados»).

### Acceso del cliente

1. En **Contactos** se crea a la persona (un cliente puede tener varias) y se pulsa **Dar acceso**.
2. La Edge Function `portal-clientes` crea su usuario con una **contraseña fácil**
   (`Palabra-Palabra-NN`) y le llega la bienvenida. **El correo no trae la contraseña**: trae un
   botón que la muestra **una sola vez**, válido 72 horas.
3. **Cada correo trae un enlace que abre el portal completo durante 1 día sin contraseña.** Se
   guarda solo como hash; la Edge Function lo canjea por una sesión real de Supabase.
4. «Nueva contraseña» en Contactos genera otra y manda otra bienvenida.

### Portal

Pestañas **Mis tareas** (marcar entregables, subir archivos de hasta 50 MB por entregable, notas,
«Listo, entregué», y ver qué hará NexCommit), **Historial**, **Pedir algo** (crea una solicitud que el
equipo convierte en tarea o rechaza con una respuesta) y **Mis datos** (los seis derechos de la Ley
21.719: ver [ley-21719/README.md](ley-21719/README.md)).

### Recurrentes

Plantillas semanales (día lunes a viernes) o mensuales (día 1 a 28). A las 07:00 el cron crea la
tarea: el plazo del cliente es la fecha de creación más N días, y el del encargado, el del cliente
más M días.

### Retención

Archivos: 180 días tras cerrar la tarea. Tareas: 24 meses. Contactos desactivados: se anonimizan a
los 12 meses. Correos: 180 días, salvo los de derechos (6 años). Lo aplica `tcliente_retencion()`, a
las 04:45 UTC; Storage lo borra la Edge Function.

---

## Puesta en marcha

### 1. SQL: 14 partes, en orden, en el editor SQL de Supabase

`supabase/migrations/20261019120100_tareas_clientes_01_tablas.sql` …
`20261019121400_tareas_clientes_14_retencion.sql`. Cada una mide menos de 7.400 caracteres, porque
el editor corta lo que se pega en ~8.000. Son idempotentes y cada una se anota sola en
`supabase_migrations.schema_migrations`.

Las 14 partes se probaron completas en un Postgres local (PGlite), con imitaciones de auth, storage,
vault, pg_net y pg_cron, y con los permisos por defecto de Supabase: dos corridas seguidas y 30
comprobaciones del flujo y de la seguridad.

Requisitos que ya existían: `equipo`, `clientes`, `es_equipo()`, `es_dueno()`, `fecha_larga()`,
`avisos_url()` y los secretos de Vault `avisos_tareas_url` y `avisos_tareas_secret`. La parte 2
crea sola `portal_claves_secreto` y `portal_cron_secreto`.

**Verificación:**

```sql
SELECT count(*) FROM pg_tables WHERE schemaname = 'public'
   AND tablename LIKE ANY (ARRAY['tareas_cliente%', 'cliente_contactos', 'cliente_solicitudes', 'derechos_solicitudes', 'portal_%']);  -- 13
SELECT jobname, schedule FROM cron.job WHERE jobname LIKE '%tareas-cliente%';                      -- 4
SELECT name FROM vault.secrets WHERE name IN ('portal_claves_secreto', 'portal_cron_secreto');      -- 2
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'tareas-clientes';               -- false, 52428800
SELECT policyname FROM pg_policies WHERE tablename = 'posts' AND cmd = 'INSERT';                    -- posts_crear_equipo
SELECT public.tcliente_avisos(true);   -- prueba: manda ya los avisos del día
```

### 2. Edge Function (no sale por SQL)

```bash
npx supabase functions deploy portal-clientes --no-verify-jwt --project-ref rhifvtrzetamrfhflfzw
```

Necesita un access token de Supabase (`sbp_…`, en Account → Access Tokens) en `SUPABASE_ACCESS_TOKEN`.
No hay que cargarle secretos: usa los que Supabase inyecta (`SUPABASE_URL`, `SUPABASE_ANON_KEY` y
`SUPABASE_SERVICE_ROLE_KEY`). Sin ella **no funcionan** «Dar acceso», el enlace de 1 día de los
correos ni el borrado de archivos vencidos. El resto del sistema funciona igual.

### 3. Back de Agente-Next

Publicar `novautomatic/back_chat_next`: la ruta `/avisos/tareas-cliente` y `mi-espacio` en los
slugs reservados del Creador. Sin eso, los correos quedan en «error» (404) en el registro.

### 4. Supabase Auth (recomendado)

Authentication → Sign In / Providers → **desactivar «Allow new users to sign up»**. Los usuarios de
clientes los crea la Edge Function, y el registro abierto deja que cualquiera tenga sesión.
