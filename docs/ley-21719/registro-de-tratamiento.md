# Registro de actividades de tratamiento

**Responsable:** NexCommit · **Última revisión:** 19 de octubre de 2026
**Fuente:** el esquema real (`supabase/migrations/`), no la memoria de nadie. Cuando se agregue una
tabla con datos de personas, se agrega aquí.

En el Supabase de NexCommit (proyecto `rhifvtrzetamrfhflfzw`) todas las tablas tienen RLS. El
equipo accede con `es_equipo()` y los clientes solo mediante funciones `portal_*`.

## Clientes y portal

| Tabla | Personas | Datos | Finalidad | Base | Plazo y quién lo aplica |
|---|---|---|---|---|---|
| `clientes` | Clientes (persona o representante de la empresa) | nombre, empresa, correo, teléfono, notas | Gestionar la relación comercial, proyectos y facturación | Contrato | ⚠️ Sin plazo automático: «mientras dure la relación» |
| `cliente_consentimientos` | Clientes | qué aceptaron o retiraron, fecha, hash de IP | Prueba del consentimiento | Obligación legal (demostrar consentimiento) | Se borra con el cliente |
| `cliente_correos`, `campanas_correo` | Clientes | correo, tipo y estado del envío | Registro de envíos | Interés legítimo / prueba | 180 días (cron `limpiar-correos-clientes`) |
| `cliente_contactos` | Personas de contacto de cada cliente | nombre, correo, teléfono, cargo, último ingreso | Acceso al portal y coordinación de tareas | Contrato (con la empresa cliente) | Se anonimiza 12 meses después de desactivado (`tcliente_retencion`) |
| `tareas_cliente`, `_entregables`, `_notas`, `_historial` | Contactos y equipo | lo que se pide, notas, quién hizo qué | Coordinar entregas del proyecto | Contrato | 24 meses tras cerrar (`tcliente_retencion`) |
| `tareas_cliente_archivos` + bucket `tareas-clientes` | Contactos | archivos que suben (imágenes, documentos) | Entregas del proyecto | Contrato | 180 días tras cerrar la tarea (cron + Edge Function `portal-clientes`) |
| `cliente_solicitudes` | Contactos | lo que piden a NexCommit | Atender solicitudes | Contrato | Con el cliente |
| `derechos_solicitudes` | Contactos | derecho ejercido, respuesta, fechas | Prueba de cumplimiento (art. 11) | Obligación legal | No se borra automáticamente |
| `tareas_cliente_avisos` | Contactos y equipo | correo destinatario, tipo, estado | Registro de envíos | Interés legítimo / prueba | 180 días; los de derechos, 6 años |
| `portal_enlaces`, `portal_claves` | Contactos | hash del enlace; clave inicial cifrada | Acceso al portal | Contrato | 7 días después de vencer; la clave, al verla o a las 72 h |
| `auth.users` (Supabase Auth) | Equipo y contactos | correo, hash de la contraseña, último login | Autenticación | Contrato | Se borra al eliminar los datos del contacto |

## Reseñas de clientes

Migraciones `20261021130100`–`20261021130500_resenas_*.sql`. Panel → Reseñas; formulario público `/resena`.

| Tabla | Personas | Datos | Finalidad | Base | Plazo |
|---|---|---|---|---|---|
| `resena_solicitudes` | Clientes y contactos | nombre, correo, cargo, servicio, fechas y estado del envío | Pedir la reseña por correo (1 recordatorio) | Contrato (relación vigente) | Vence a los 30 días; se borra 90 días después de cerrada (cron `resenas-diario`) |
| `resenas` | Ídem | texto, nombre, cargo, empresa, `publicar_nombre` | Publicar la opinión en nexcommit.com tras revisión del equipo | Publicar el nombre: **consentimiento** (casilla sin marcar); sin él firma solo la empresa | Publicada: hasta que el autor pida retirarla (botón «Borrar»); rechazada: 90 días |
| `resena_bloqueos` | Quienes pidieron no recibir más solicitudes | solo `sha256(lower(email))` | Respetar la oposición | Obligación legal | Indefinido (no identifica sin el correo) |

## Formulario de cotización del sitio

| Tabla | Personas | Datos | Finalidad | Base | Plazo |
|---|---|---|---|---|---|
| `contactos_web` | Quienes piden una cotización en el formulario «Cotiza en 1 minuto» | nombre, correo, WhatsApp (opcional), servicio, mensaje libre, página de origen, si vino de Google Ads, hash de IP | Responder y preparar la cotización; acuse de recibo por correo | Medidas precontractuales a pedido del titular (sin casilla; se informa junto al formulario). Sin marketing | 12 meses salvo estado `ganado` (cron `contactos-web-retencion`). El mensaje libre puede traer datos sensibles: el formulario pide no incluirlos |

## Creador de páginas (crea-tu-web)

| Tabla | Personas | Datos | Finalidad | Base | Plazo |
|---|---|---|---|---|---|
| `creador_leads` | Quienes crean una página | nombre, correo, teléfono, hashes, hash de IP, advertencias o bloqueo | Crear y publicar la página; evitar abuso | Ejecución del servicio | Anonimización a los 12 meses salvo conversión (cron `creador-retencion`) |
| `creador_paginas`, `creador_mensajes` | Ídem | contenido de la página y pedidos de edición | Ídem | Ídem | Página: 30 días después de vencer (plan base pagado: 90 días, para renovar) |
| `creador_contactos` | **Visitas** de las páginas de nuestros clientes | nombre, correo, teléfono, mensaje, hash de IP | Reenviar el mensaje al dueño de la página | NexCommit es **encargado** | 30 días |
| `creador_pedidos` | **Compradores** de las tiendas | nombre (opcional), nota, productos, hash de IP | Avisar el pedido a la tienda | NexCommit es **encargado** | 90 días |
| `creador_infracciones` | Quienes crean páginas | infracciones detectadas | Moderación (**decisión automatizada**, art. 14 ter l) | Interés legítimo | 12 meses |

## Equipo interno

| Tabla | Personas | Datos | Finalidad | Plazo |
|---|---|---|---|---|
| `equipo` | Integrantes de NexCommit | nombre, correo, WhatsApp, rol | Acceso al panel y avisos | Mientras sea parte del equipo |
| `tareas`, `tarea_comentarios`, `tarea_historial` | Equipo (y lo que se escriba de clientes) | contenido de tareas | Gestión interna (espejo de GitHub Issues) | ⚠️ Sin plazo: no escribir datos personales de clientes en issues |
| `avisos_whatsapp` | Equipo | teléfono, estado del aviso | Registro de avisos | Cron `limpiar-avisos-tareas` |
| `mcp_registro` | Equipo | acciones vía MCP | Auditoría | — |
| `boveda_*` | Equipo y cuentas de clientes | credenciales cifradas en el navegador (AES-GCM) | Operar cuentas de clientes | Mientras dure el servicio |

## Fuera de esta base

- **Google Analytics 4 / Google Ads**: navegación, con consentimiento (Consent Mode v2, denegado por
  defecto). No recibe los tokens de `/mi-espacio` ni de `/confirmar-datos`.
- **Agente-Next** (otra base): conversaciones de los chatbots de clientes (`trazas`). Ahí NexCommit es
  **encargado** de cada cliente. ⚠️ Sin plazo automático documentado.
- **WhatsApp (Meta)**: conversaciones comerciales.
- **GitHub (`novautomatic/dashboard-tareas`, privado)**: tareas internas.
