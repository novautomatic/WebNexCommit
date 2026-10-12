# MCP del tablero de tareas: qué se hizo y cómo repetirlo

Permite hablar con Claude para **consultar tus tareas y moverlas de columna**
(«¿cuáles son mis tareas?», «mueve la #12 a En revisión»).

> Este documento es público (el repo es público): **nunca escribas aquí un token ni la URL completa del conector.**

## Cómo funciona (en 30 segundos)

```
Claude  ──(URL con token)──▶  Edge Function "mcp-tareas"  ──▶  funciones mcp_* en Postgres
                                                                   │
                                                  reutilizan las mismas funciones del panel
                                                  (tarea_actualizar, tarea_crear…)
                                                                   ▼
                                       áreas: cambio directo · proyectos: GitHub (etiqueta / cierre)
```

- **Edge Function** (`supabase/functions/mcp-tareas/index.ts`): es el «servidor MCP». Recibe la petición de Claude, valida el token y llama a la base de datos.
- **Migraciones SQL** (`supabase/migrations/2026101013*_mcp_tareas_*.sql`, 5 partes): crean las tablas de tokens y auditoría y las funciones `mcp_*`.
- **Token**: una clave secreta por socio. En la base solo se guarda su *hash*; el valor real solo existe en la URL del conector.
- **Auditoría**: tabla `mcp_registro` (quién movió o creó qué, antes/después y cuándo). Además, el historial de cada tarea muestra al socio como autor del cambio.
- **Columnas ↔ GitHub**: Pendiente = issue abierto sin etiqueta · En progreso = etiqueta «en progreso» · En revisión = «en revisión» · Bloqueada = «bloqueada» · Completada = issue cerrado. Las tareas de **áreas** viven solo en el panel; las de **proyectos** se mueven en GitHub y se confirman en ~1 minuto.

## Herramientas disponibles en Claude

| Herramienta | Para qué |
|---|---|
| Listar columnas | Ver las 5 columnas y su equivalente en GitHub |
| Mis tareas | Tus tareas abiertas (filtros: columna, prioridad, vencidas) |
| Ver tarea | Detalle por número (#): descripción, comentarios, historial |
| Buscar tarea | Por texto, número, proyecto, responsable o columna |
| Mover tarea | Cambiar de columna (queda registrado) |
| Crear tarea | Solo en **áreas** (las de proyecto nacen en GitHub) |

---

## Checklist de instalación (primera vez)

### 1. Base de datos (Supabase → SQL Editor)
- [ ] Correr las **5 partes** en orden, **una por pestaña nueva** (`…_mcp_tareas_1_tablas_y_tokens.sql` → `…_5_permisos.sql`).
  - Por qué 5: el editor del Dashboard **corta lo que se pega sobre ~8.000 caracteres**. Cada parte pesa < 6 KB.
  - Cada parte es idempotente: si algo falla, se puede repetir sin romper nada.
  - Antes de ejecutar, revisar que el final de lo pegado sea `END $do$;` (si no, el pegado se cortó).
- [ ] Verificar que no hubo errores rojos en ninguna parte.

### 2. Crear tu token (SQL Editor)
```sql
SELECT public.mcp_crear_token('tu-email@…', 'Claude · Tu nombre');
```
- [ ] Copiar el valor que empieza con `nxc_` **en ese momento** (no se vuelve a mostrar).
- [ ] No pegarlo en chats, capturas, ni en el repo.
- Un token por socio. El email debe ser un integrante activo de la tabla `equipo`.

### 3. Desplegar la función (Supabase → Edge Functions)
- [ ] **Deploy a new function → Via Editor**, nombre exacto `mcp-tareas`.
- [ ] Pegar el contenido de `supabase/functions/mcp-tareas/index.ts` (~10.400 caracteres; confirmar que termina en el cierre de `Deno.serve`).
- [ ] **Desactivar «Enforce JWT Verification»** (el acceso lo controla el token de la URL).
- [ ] Deploy. Debe aparecer en la lista con su URL `https://<ref>.supabase.co/functions/v1/mcp-tareas`.
- Alternativa con CLI: `supabase functions deploy mcp-tareas --no-verify-jwt`.

### 4. Conectar con Claude (claude.ai → Configuración → Conectores → Agregar conector personalizado)
- [ ] Nombre: `Tareas NexCommit`.
- [ ] URL: `https://<ref-del-proyecto>.supabase.co/functions/v1/mcp-tareas?key=<token>`
  - **Un solo** `https://` (se duplicó una vez y por eso no conectaba).
  - El `<ref>` es el del proyecto donde corriste el SQL (Project Settings → General → Reference ID).
- [ ] Autenticación: **«Sin inicio de sesión»** (la clave va en la URL).
- [ ] Debe listar 6 herramientas.
- [ ] Permisos: «Requiere aprobación» está bien. Opcional: «Permitir siempre» solo en las de lectura; dejar **Mover tarea** y **Crear tarea** con aprobación.

### 5. Probar
- [ ] Conversación nueva con el conector activado: «¿cuáles son mis tareas?».
- [ ] «Mueve la tarea #N (de un área) a En progreso» y mirar que cambie en el panel.
- [ ] Opcional: mover una tarea de **proyecto** y confirmar el cambio de etiqueta en GitHub tras ~1 minuto.

---

## Operación diaria

| Quiero… | Cómo |
|---|---|
| **Revocar un token** | `UPDATE public.mcp_tokens SET activo = false WHERE nombre = '…';` |
| **Rotar un token** (si se filtró) | Revocar el viejo → crear uno nuevo con `mcp_crear_token` → quitar y volver a agregar el conector con la URL nueva |
| **Dar acceso a otro socio** | Correr `mcp_crear_token` con su email y que él agregue su propio conector |
| **Ver quién movió qué** | `SELECT * FROM public.mcp_registro ORDER BY created_at DESC;` (solo dueños) o el historial de la tarea en el panel |
| **Ver tokens y último uso** | `SELECT nombre, activo, last_used_at FROM public.mcp_tokens;` |

## Si algo falla

| Síntoma | Causa probable y arreglo |
|---|---|
| «Ningún servidor respondió» al agregar el conector | URL mal escrita (¿`https://` doble?), ref de otro proyecto, o función no desplegada |
| `401 No autorizado` | Token mal copiado, revocado, o la persona no está activa en `equipo` |
| La función responde 401 genérico de Supabase | «Enforce JWT Verification» sigue activo: desactivarlo |
| Error `unterminated dollar-quoted string` al correr el SQL | El texto pegado se cortó: usar las 5 partes, una por pestaña, y revisar el final |
| «Mis tareas» no muestra issues de GitHub | Tu fila en `equipo` necesita `github_login` o `github_labels` para asociar issues a ti |
| Un movimiento en un proyecto «no se ve» en el panel | Se confirma desde GitHub en ~1 min; ver `sync` de la tarea (`pendiente` → `ok`) |
| Falla una sola herramienta | Revisar Edge Functions → mcp-tareas → Logs |

## Seguridad en pocas líneas
- La URL del conector **es una contraseña**: quien la tenga puede mover tus tareas.
- No va en el repo, ni en capturas, ni en chats. Si se expone, **rotar** (ver arriba).
- Los tokens se guardan solo como hash; la tabla `mcp_tokens` no es legible desde el panel ni desde el navegador.
- Todos los cambios quedan auditados.
