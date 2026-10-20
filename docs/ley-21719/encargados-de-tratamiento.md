# Encargados de tratamiento y transferencias

**Última revisión:** 19 de octubre de 2026

Un **encargado** trata datos personales por cuenta de NexCommit: quien aloja la base, quien envía
los correos. El art. 15 bis de la Ley 21.719 dice que el encargado solo puede tratar los datos según
el encargo y las instrucciones del responsable; si los usa para otra cosa, pasa a ser responsable
para todos los efectos legales. En la práctica, con cada proveedor tiene que existir un **acuerdo de
tratamiento (DPA)** que lo diga.

**Firmar o aceptar esos acuerdos le corresponde a los dueños de NexCommit, no a este repositorio.**
Este documento existe para saber cuáles faltan.

| Proveedor | Qué hace | Qué datos recibe | Dónde | Acuerdo |
|---|---|---|---|---|
| **Supabase** | Base de datos, Auth, Storage, Edge Functions | Todo | EE. UU. | Ofrece un DPA estándar en el panel de la organización. **Falta aceptarlo** |
| **Vercel** | Sitio, back de Agente-Next (correos, Creador, chatbots) | Todo lo que pasa por el back, incluido el contenido de los correos | EE. UU. | DPA incluido en sus términos. **Verificar** el plan y si hay que aceptarlo aparte |
| **Google, Gmail personal** (`nexcommit@gmail.com`) | Envío de todos los correos | Correo, nombre y contenido | EE. UU. | ⚠️ **Una cuenta de consumidor no tiene DPA.** Migrar a Google Workspace, que sí tiene Cloud Data Processing Addendum, o a un proveedor transaccional con DPA |
| **Google Analytics / Ads** | Medición | Navegación (con consentimiento) | EE. UU. | Aceptar los términos de tratamiento de datos en la cuenta de Analytics y de Ads |
| **OpenAI** | Textos del Creador; chatbots de Agente-Next | Descripción del negocio (Creador); **conversaciones de usuarios finales** (chatbots) | EE. UU. | Ofrece DPA. **Falta firmarlo**, sobre todo por los chatbots |
| **Meta (WhatsApp Cloud API)** | Avisos y chatbots | Teléfono y mensajes | EE. UU. | Términos de WhatsApp Business |
| **GitHub** | Tareas internas (Issues) | Lo que se escriba en las tareas | EE. UU. | DPA en los términos para clientes. No escribir datos personales de clientes en issues |
| **Unsplash / Pexels** | Fotos del Creador | Ningún dato personal | — | No aplica |

## NexCommit como encargado de sus clientes

En estos servicios el **responsable es el cliente** y NexCommit trata los datos por cuenta de él:

- formularios de contacto de las páginas del Creador (`creador_contactos`);
- pedidos de las tiendas del Creador (`creador_pedidos`);
- chatbots de Agente-Next, por ejemplo Dye Tales: conversaciones con sus compradores.

Para cada uno se necesita un **contrato de encargo** con el cliente que diga qué datos se tratan, para
qué, por cuánto tiempo, qué subencargados se usan (Supabase, Vercel, OpenAI, Meta) y qué pasa al
terminar el contrato. Conviene una cláusula estándar en el contrato de servicios.

## Transferencia internacional

Casi todos los proveedores están en Estados Unidos. La política publicada lo informa e indica que,
a la fecha, ese país no cuenta con una declaración de nivel adecuado. Lo que respalda la
transferencia son las garantías contractuales de cada proveedor, es decir, el DPA. Sin él, ese
respaldo es más débil de lo que la política da a entender. Por eso los puntos 2 y 3 de los
pendientes en [README.md](README.md) van primero.

> La sección de la ley sobre transferencias internacionales no venía en la copia del texto oficial
> que se pudo leer. Hay que confirmar los requisitos exactos contra el texto completo antes de
> diciembre.
