# NexCommit y la Ley 21.719

**Revisión:** 19 de octubre de 2026 · **Fiscalización desde:** 1 de diciembre de 2026

La Ley 21.719 reemplaza el marco de la 19.628 y crea la Agencia de Protección de Datos Personales.
Según su artículo primero transitorio, entra en vigencia «el día primero del mes vigésimo cuarto
posterior a la publicación», es decir, el **1 de diciembre de 2026**. Las multas llegan a 20.000 UTM.

**Fuente:** texto oficial en BCN (`bcn.cl/leychile/navegar?idNorma=1209272`), leído desde su
servicio XML (`leychile.cl/Consulta/obtxml?opt=7&idNorma=1209272`). Ese XML vino **incompleto**:
no trae las secciones de transferencias internacionales ni de infracciones y sanciones. Lo que se
cita con número de artículo está verificado; lo demás se marca como no verificado.

Documentos de esta carpeta:

- [registro-de-tratamiento.md](registro-de-tratamiento.md): qué datos hay, de quién, para qué,
  con qué base y cuánto tiempo se guardan. Está hecho a partir del esquema real.
- [encargados-de-tratamiento.md](encargados-de-tratamiento.md): proveedores, qué reciben y qué
  contrato falta firmar.
- [procedimiento-brechas.md](procedimiento-brechas.md): qué hacer si se filtran datos.
- [../tareas-clientes.md](../tareas-clientes.md): el portal de clientes, diseñado con la ley en mente.

---

## Lo que la ley exige y cómo está NexCommit

| # | Exigencia | Artículo | Estado |
|---|---|---|---|
| 1 | Base de licitud por tratamiento, sin mezclar contrato con marketing | 12, 13 | ✅ Marketing con consentimiento aparte y apagado por defecto (`clientes.acepta_marketing`). Los correos de tareas son ejecución del contrato |
| 2 | Informar al recoger los datos | 14 ter | ✅ La política se reescribió (v2.0) con todas las letras a) a l). ⚠️ Faltan razón social, RUT, representante legal y domicilio (ver Pendientes) |
| 3 | Seis derechos funcionando en el software | 4 a 9, 11 | ✅ Portal de clientes: acceso y portabilidad (JSON/CSV) y rectificación al instante; supresión, oposición y bloqueo con acuse de recibo, plazo y respuesta por escrito. ⚠️ Quien no es cliente con portal solo puede pedirlo por correo (ver Pendientes) |
| 4 | Plazos de conservación aplicados por algo | 14 ter i) | ✅ Crons para el Creador, los correos a clientes y las tareas de clientes. ⚠️ La tabla `clientes` y las conversaciones de WhatsApp no tienen plazo automático |
| 5 | Reportar vulneraciones de seguridad | 14 sexies | ✅ [Procedimiento escrito](procedimiento-brechas.md) |
| 6 | Registro de lo que se trata | 14 ter d) | ✅ [Registro](registro-de-tratamiento.md) |
| 7 | Contratos con encargados y transferencia internacional | 15 bis, 14 ter h) | ⚠️ [Faltan DPA firmados](encargados-de-tratamiento.md). **Gmail personal no tiene DPA** |
| 8 | Datos sensibles (salud) | 16, 16 bis | ⚠️ No se piden; los campos abiertos y los archivos avisan que no se suban. Ojo con los clientes del área de salud (ver Hallazgos) |
| 9 | Nada de datos personales en logs, URLs ni errores | 14 quinquies | ✅ Corregido: GA recibía los tokens de `/confirmar-datos` en la URL |
| 10 | Banner de cookies cuando hay trackers | — | ✅ GA4 y Ads con Consent Mode v2, denegado por defecto |

### Detalle de los artículos verificados

- **Art. 11, procedimiento ante el responsable.** El titular pide por escrito, a la dirección de
  correo que se fije para eso o por un formulario. El responsable debe **acusar recibo** y responder
  **dentro de 30 días corridos**, que se pueden prorrogar **una vez** por hasta 30 días corridos más.
  La respuesta va **por escrito** al domicilio o correo del titular, y hay que **guardar el respaldo**
  del envío, su fecha y su contenido. Si se deniega, hay que avisar que el titular tiene **30 días
  hábiles** para reclamar ante la Agencia. → Implementado en el portal: correos `derecho_recibido` y
  `derecho_respuesta`, que no se borran a los 180 días.
- **Art. 14 ter, deber de información.** La política publicada debe incluir, entre otros: fecha y
  versión, quién es el responsable y su representante legal, domicilio postal y correo, categorías de
  datos y universo de personas, destinatarios, finalidades y bases, medidas de seguridad, derechos,
  vía de reclamo ante la Agencia, transferencias internacionales y si el país es adecuado, plazos,
  fuente de los datos, derecho a retirar el consentimiento y **decisiones automatizadas**. →
  `src/pages/Privacy.jsx` v2.0, con los datos del responsable en `src/config/legal.js`.
- **Art. 14 quáter, protección desde el diseño y por defecto**: se tratan solo los datos
  estrictamente necesarios. → El portal no lee tablas: todo pasa por funciones que filtran por
  cliente. Los enlaces se guardan como hash, la clave inicial se ve una sola vez y los archivos viven
  en un bucket privado.
- **Art. 14 sexies, vulneraciones.** Hay que reportarlas a la Agencia «por los medios más expeditos
  posibles y **sin dilaciones indebidas**» cuando exista un riesgo razonable para los titulares, y
  registrarlas. La ley **no fija 72 horas**: ese es el plazo interno con el que trabajamos.
- **Art. 15 bis, encargados.** El encargado solo trata los datos según el encargo y las
  instrucciones del responsable. Si los usa para otra cosa, pasa a ser responsable para todos los
  efectos legales.
- **Art. 16 bis, salud.** Los datos de salud solo se tratan para los fines que prevén las leyes
  sanitarias, con excepciones acotadas.

---

## Hallazgos de esta revisión

1. **Corregido: los tokens viajaban a Google Analytics.** `App.jsx` mandaba a GA la URL completa,
   así que el enlace personal de `/confirmar-datos?c=…&t=…` (que permite ver y cambiar los datos de un
   cliente) llegaba a Google. Ahora `/confirmar-datos` y `/mi-espacio` envían solo la ruta.
2. **Corregido: cualquier sesión podía crear posts del blog** si alguna vez se aplicó
   `fix-rls-policy.sql`, que está en la raíz del repo. Con clientes iniciando sesión, «autenticado»
   ya no significa «del equipo». La parte 3 de la migración reemplaza esa política por
   `posts_crear_equipo`.
3. **Corregido: la política prometía cuatro derechos de seis**, no tenía fecha ni versión, y usaba
   dos correos de contacto distintos (`privacidad@nexcommit.com` y `nexcommit@gmail.com`). Se dejó
   uno solo, `nexcommit@gmail.com`, porque es el que usa el resto del sitio. Si `privacidad@` existe
   y se prefiere, se cambia en `src/config/legal.js`.
4. **Decisión automatizada sin informar.** La moderación del Creador advierte y, a la tercera
   infracción, bloquea sola. El art. 14 ter l) exige explicar la lógica: ahora la política lo hace y
   ofrece revisión humana.
5. **Gmail personal como proveedor de correo.** `nexcommit@gmail.com` es una cuenta de consumidor y
   no tiene acuerdo de tratamiento de datos (DPA). Google Workspace sí lo tiene. Por ese correo
   pasan los datos de todos los clientes.
6. **NexCommit también es encargado de sus clientes.** Los formularios de las páginas del Creador,
   las tiendas y el chatbot de Agente-Next (por ejemplo, Dye Tales) tratan datos de los clientes de
   nuestros clientes. Para cada uno se necesita un **contrato de encargo** (art. 15 bis) que diga qué
   se hace con esos datos.
7. **Clientes del área de salud.** Si un proyecto toca fichas o datos de pacientes, son datos
   sensibles (art. 16 bis): necesitan diseño propio, consentimiento expreso y **no** deben pasar por
   el portal de tareas ni por OpenAI. El portal ya avisa que no se suban.

## Pendientes, en orden

| Prioridad | Qué | Quién |
|---|---|---|
| 1 | Completar razón social, RUT, representante legal y domicilio en `src/config/legal.js` (art. 14 ter b y c) | Dueños |
| 2 | Aceptar el DPA de Supabase y de Vercel desde sus paneles | Dueños |
| 3 | Pasar el correo saliente a Google Workspace (o a un proveedor con DPA) | Dueños |
| 4 | Plantilla de contrato de encargo para clientes con formularios, tiendas o chatbot | Dueños + abogado |
| 5 | Definir plazo y cron para la tabla `clientes` (ficha) y para las conversaciones de WhatsApp/Agente-Next | Decidir plazo → Claude implementa |
| 6 | Formulario público de derechos para quien no es cliente con portal (hoy solo por correo, que la ley acepta) | Opcional |
| 7 | Desactivar el registro público en Supabase Auth (Authentication → Sign In / Providers → «Allow new users to sign up»): los usuarios se crean desde el panel | Dueños |
