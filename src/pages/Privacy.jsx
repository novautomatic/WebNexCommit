import { useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { POLITICA, RESPONSABLE } from '../config/legal';
import { CLARITY_ID } from '../lib/clarity';
import { cambiarMedicion, medicionActiva } from '../lib/medicion';

// Follows the law in force today: Ley 19.628 (vida privada) + Ley 19.496 (consumidor).
// Ley 21.719 is NOT in force yet (bill to postpone it to 1-dic-2027, boletín 18.623-07,
// still in Congress as of 26-oct-2026): review this page before 1-dic-2026.
// Responsible-party data lives in src/config/legal.js.

/** Botón para dejar de ser medido (o volver a serlo) en este navegador. Solo en el navegador. */
const sinSuscripcion = () => () => {};
function PreferenciaMedicion() {
  // null en el HTML prerenderizado (no hay navegador); el valor real al hidratar.
  const activa = useSyncExternalStore(sinSuscripcion, medicionActiva, () => null);
  if (activa === null) return null;
  return (
    <p className="text-brand-muted leading-relaxed mt-3">
      {activa ? 'Hoy medimos tus visitas en este navegador. ' : 'Pediste que no midamos tus visitas en este navegador. '}
      <button type="button" onClick={() => cambiarMedicion(!activa)} className="text-brand-light underline underline-offset-2">
        {activa ? 'No medir mis visitas' : 'Volver a medir mis visitas'}
      </button>
    </p>
  );
}

const p = 'text-brand-muted leading-relaxed';
const ul = 'list-disc list-inside space-y-2 text-brand-muted';
const h2 = 'text-2xl font-bold text-white mb-4';

const TRATAMIENTOS = [
  {
    quien: 'Visitantes del sitio',
    datos: `Datos de navegación que no te identifican (páginas vistas, dispositivo, origen de la visita) mediante cookies de Google${CLARITY_ID ? ' y cómo se usa la página (clics y desplazamiento, con textos y formularios ocultos) con Microsoft Clarity' : ''}. Nunca tu nombre, correo, teléfono ni RUT`,
    para: 'Medir visitas y saber qué anuncios generan contactos',
    base: 'Medición del sitio con datos que no te identifican; puedes pedir que no te midamos (sección 10)',
    plazo: 'El que tenga configurado Google Analytics (como máximo 14 meses)',
  },
  {
    quien: 'Personas que nos escriben por WhatsApp o correo',
    datos: 'Nombre, número o correo y lo que nos cuentas de tu proyecto',
    para: 'Responderte y preparar una propuesta',
    base: 'Medidas precontractuales pedidas por ti',
    plazo: 'Mientras dure la conversación comercial; puedes pedir que la borremos cuando quieras',
  },
  {
    quien: 'Personas que piden una cotización en el formulario del sitio',
    datos: 'Nombre, correo, WhatsApp (opcional), el servicio que te interesa, lo que nos cuentas y la página desde la que escribiste',
    para: 'Responderte, preparar tu cotización y enviarte una copia de tu solicitud. Nunca para publicidad',
    base: 'Medidas precontractuales pedidas por ti',
    plazo: '12 meses desde la solicitud; si pasas a ser cliente, se conserva como parte de la relación comercial',
  },
  {
    quien: 'Clientes y personas de contacto de nuestros clientes',
    datos: 'Nombre, correo, teléfono, cargo, empresa; tareas, archivos y notas del portal «Mi espacio»',
    para: 'Ejecutar el servicio contratado: coordinar tareas y entregas, soporte y facturación',
    base: 'Ejecución del contrato',
    plazo: 'Archivos: 180 días tras cerrar cada tarea · tareas y notas: 24 meses tras cerrarlas · acceso al portal: se anonimiza 12 meses después de desactivado · ficha del cliente: mientras dure la relación comercial · facturación: 6 años (Código Tributario)',
  },
  {
    quien: 'Clientes que aceptaron recibir novedades',
    datos: 'Nombre y correo',
    para: 'Enviar novedades y promociones de NexCommit',
    base: 'Consentimiento, que puedes retirar en cualquier momento',
    plazo: 'Hasta que retires el consentimiento; el registro de envíos se borra a los 180 días',
  },
  {
    quien: 'Clientes que dejan una reseña',
    datos: 'Nombre y correo (para pedírtela); lo que escribes, tu nombre, cargo y empresa',
    para: 'Pedirte tu opinión sobre el proyecto y, una vez revisada, publicarla en nexcommit.com',
    base: 'Pedirla: ejecución del contrato. Publicar tu nombre y cargo: consentimiento (casilla opcional); sin él se publica solo con la empresa',
    plazo: 'Solicitud: 90 días después de cerrada · reseña publicada: hasta que pidas retirarla · reseña rechazada: 90 días',
  },
  {
    quien: 'Personas que crean una página en «Crea tu web»',
    datos: 'Nombre, empresa, correo, celular y la descripción de tu negocio',
    para: 'Crear, publicar y administrar tu página de prueba y contactarte sobre ella',
    base: 'Ejecución del servicio que solicitas',
    plazo: 'Se anonimizan a los 12 meses, salvo que pases a ser cliente',
  },
];

export default function Privacy() {
  const r = RESPONSABLE;
  return (
    <>
      <SEO
        title="Política de Privacidad | NexCommit"
        description="Cómo NexCommit trata los datos personales de visitantes, clientes y usuarios de sus servicios, y cómo ejercer tus derechos según la Ley 19.628."
        canonicalUrl="https://www.nexcommit.com/privacy"
      />

      <div className="pb-20">
        <div className="container">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-brand-muted hover:text-white transition-colors mb-8 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Volver al inicio
          </Link>

          <article className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-white to-[#9cdcff] bg-clip-text text-transparent">
              Política de Privacidad
            </h1>
            <p className="text-sm text-brand-muted mb-8">Versión {POLITICA.version} · vigente desde el {POLITICA.vigenteDesde}</p>

            <p className="text-lg text-brand-muted mb-10 leading-relaxed">
              En NexCommit cuidamos los datos personales de quienes visitan nuestro sitio, nos contactan, usan nuestras plataformas o
              trabajan con nosotros. Esta política explica qué datos tratamos, para qué, con quién los compartimos, cuánto tiempo los
              guardamos y cómo puedes ejercer tus derechos, conforme a la Ley N° 19.628 sobre protección de la vida privada y la Ley N° 19.496 sobre protección de los
              derechos de los consumidores.
            </p>

            <div className="space-y-10">
              <section>
                <h2 className={h2}>1. Quién es responsable de tus datos</h2>
                <p className={`${p} mb-3`}>
                  {r.razonSocial ? <><strong className="text-white">{r.razonSocial}</strong> ({r.marca})</> : <strong className="text-white">{r.marca}</strong>}
                  {r.rut && <>, RUT {r.rut}</>}
                  {r.representanteLegal && <>, representada legalmente por {r.representanteLegal}</>}
                  {r.domicilio && <>, con domicilio en {r.domicilio}</>}.
                </p>
                <p className={p}>
                  Para cualquier consulta o para ejercer tus derechos, escríbenos a{' '}
                  <a href={`mailto:${r.correo}`} className="text-brand-light hover:underline">{r.correo}</a>. Si eres cliente, también
                  puedes hacerlo desde la sección «Mis datos» de tu espacio en{' '}
                  <Link to="/mi-espacio" className="text-brand-light hover:underline">nexcommit.com/mi-espacio</Link>.
                </p>
              </section>

              <section>
                <h2 className={h2}>2. Qué datos tratamos, para qué y por cuánto tiempo</h2>
                <div className="space-y-4">
                  {TRATAMIENTOS.map((t) => (
                    <div key={t.quien} className="rounded-2xl border border-white/10 p-5">
                      <h3 className="text-white font-semibold mb-2">{t.quien}</h3>
                      <dl className="grid sm:grid-cols-[140px_1fr] gap-x-4 gap-y-1.5 text-sm text-brand-muted">
                        <dt className="text-white/70">Datos</dt><dd>{t.datos}</dd>
                        <dt className="text-white/70">Para qué</dt><dd>{t.para}</dd>
                        <dt className="text-white/70">Base legal</dt><dd>{t.base}</dd>
                        <dt className="text-white/70">Conservación</dt><dd>{t.plazo}</dd>
                      </dl>
                    </div>
                  ))}
                </div>
                <p className={`${p} mt-4`}>
                  No usamos tus datos para fines distintos de los indicados ni los vendemos. Los plazos con un número los aplica un
                  proceso automático; lo que la ley obliga a guardar (por ejemplo, documentos tributarios) se conserva solo el tiempo
                  exigido.
                </p>
              </section>

              <section>
                <h2 className={h2}>3. De dónde vienen los datos</h2>
                <p className={p}>
                  Casi siempre nos los entregas tú. Los datos de las personas de contacto de un cliente pueden venir de la empresa
                  cliente, que nos los entrega para coordinar el servicio; en ese caso te informamos al darte acceso al portal. No
                  obtenemos datos de fuentes de acceso público.
                </p>
              </section>

              <section>
                <h2 className={h2}>4. Con quién los compartimos y transferencias internacionales</h2>
                <p className={`${p} mb-3`}>Usamos proveedores tecnológicos que tratan los datos por cuenta nuestra y solo para prestarnos su servicio:</p>
                <ul className={ul}>
                  <li><strong className="text-white">Supabase</strong>: base de datos, archivos y acceso al portal (Estados Unidos).</li>
                  <li><strong className="text-white">Vercel</strong>: alojamiento del sitio y del servidor que envía los correos (Estados Unidos).</li>
                  <li><strong className="text-white">Google</strong>: envío de correos, Google Analytics y Google Ads, que miden visitas sin datos que te identifiquen (Estados Unidos).</li>
                  {CLARITY_ID && <li><strong className="text-white">Microsoft</strong>: Microsoft Clarity para ver de forma agregada cómo se navega el sitio, con textos y formularios ocultos (Estados Unidos).</li>}
                  <li><strong className="text-white">OpenAI</strong>: genera los textos de las páginas de «Crea tu web» a partir de la descripción del negocio; no le enviamos datos de contacto (Estados Unidos).</li>
                  <li><strong className="text-white">Meta (WhatsApp)</strong>: avisos y conversaciones por WhatsApp cuando corresponda (Estados Unidos).</li>
                </ul>
                <p className={`${p} mt-3`}>
                  Estos proveedores procesan los datos fuera de Chile, principalmente en Estados Unidos, país que a la fecha no cuenta
                  con una declaración de nivel adecuado de protección. La transferencia se ampara en las condiciones de protección de
                  datos que cada proveedor ofrece contractualmente a sus clientes. No cedemos datos a terceros para sus propios fines.
                </p>
              </section>

              <section>
                <h2 className={h2}>5. Cómo protegemos los datos</h2>
                <ul className={ul}>
                  <li>Las comunicaciones viajan cifradas (HTTPS) y el acceso a la base está restringido por reglas por usuario (RLS).</li>
                  <li>Las contraseñas las guarda el sistema de autenticación de forma cifrada; nadie del equipo puede verlas.</li>
                  <li>Los enlaces personales que enviamos por correo vencen y en la base solo guardamos una huella (hash), igual que con las direcciones IP.</li>
                  <li>Los archivos del portal están en un almacenamiento privado y se descargan con enlaces temporales.</li>
                  <li>Solo el equipo de NexCommit, con cuentas personales, accede a los datos de clientes.</li>
                </ul>
              </section>

              <section>
                <h2 className={h2}>6. Tus derechos</h2>
                <p className={`${p} mb-3`}>Según la Ley 19.628 puedes pedirnos en cualquier momento, sin costo:</p>
                <ul className={ul}>
                  <li><strong className="text-white">Acceso</strong>: saber qué datos tenemos de ti, de dónde vienen, para qué los usamos y a quién se los entregamos.</li>
                  <li><strong className="text-white">Rectificación</strong>: corregir datos erróneos, inexactos o incompletos.</li>
                  <li><strong className="text-white">Eliminación</strong>: que borremos tus datos cuando no haya razón legal para guardarlos o cuando los entregaste voluntariamente.</li>
                  <li><strong className="text-white">Bloqueo</strong>: que suspendamos su uso mientras se resuelve una solicitud.</li>
                  <li><strong className="text-white">Oposición a promociones</strong>: que dejemos de usarlos para enviarte publicidad.</li>
                  <li><strong className="text-white">Copia de tus datos</strong>: además, te entregamos una copia en un formato de uso común (JSON o CSV).</li>
                </ul>
                <p className={`${p} mt-3`}>
                  Escríbenos a <a href={`mailto:${r.correo}`} className="text-brand-light hover:underline">{r.correo}</a> o, si
                  eres cliente, usa «Mis datos» en tu espacio, donde además puedes descargar tus datos y corregirlos al instante. Te
                  responderemos por escrito dentro de 2 días hábiles (art. 16 de la Ley 19.628). Si no respondemos a tiempo o
                  rechazamos tu solicitud, puedes recurrir al juez de letras en lo civil de nuestro domicilio.
                </p>
                <p className={`${p} mt-3`}>
                  Cuando el tratamiento se basa en tu autorización (promociones, publicar tu nombre en una reseña), puedes retirarla cuando
                  quieras, sin que eso afecte lo hecho antes de retirarlo.
                </p>
              </section>

              <section>
                <h2 className={h2}>7. Decisiones automatizadas</h2>
                <p className={p}>
                  En «Crea tu web», un sistema automático revisa que el contenido de las páginas no infrinja nuestras reglas (por
                  ejemplo, contenido ofensivo o engañoso). Si encuentra una infracción, avisa; a la tercera, suspende la página y el
                  acceso al creador. Puedes pedir que una persona del equipo revise la decisión escribiendo a {r.correo}. No tomamos
                  otras decisiones automatizadas ni elaboramos perfiles sobre ti.
                </p>
              </section>

              <section>
                <h2 className={h2}>8. Datos sensibles</h2>
                <p className={p}>
                  No pedimos datos sensibles (salud, origen, creencias, biometría, entre otros). Te pedimos no incluirlos en
                  formularios, notas ni archivos. Si tu proyecto los requiere, lo acordamos por escrito antes.
                </p>
              </section>

              <section>
                <h2 className={h2}>9. Portal de clientes «Mi espacio»</h2>
                <p className={`${p} mb-3`}>
                  Si eres cliente, puedes tener una cuenta en nexcommit.com/mi-espacio para ver tus tareas, subir archivos, dejarnos
                  notas y hacernos solicitudes. Tu usuario es tu correo.
                </p>
                <ul className={ul}>
                  <li>Te enviamos correos con tus tareas pendientes de lunes a viernes, mientras tengas algo por entregar. Son parte del servicio, no promociones.</li>
                  <li>El botón de esos correos te deja entrar durante 1 día sin contraseña; después, entra con tu correo y contraseña.</li>
                  <li>Tu contraseña inicial se muestra una sola vez desde el correo de bienvenida; puedes cambiarla en «Mis datos».</li>
                  <li>En «Mis datos» puedes descargar todo lo que tenemos de ti, corregir tus datos y pedir la supresión, oposición o bloqueo.</li>
                </ul>
              </section>

              <section>
                <h2 id="cookies" className={h2}>10. Cookies y medición</h2>
                <p className={`${p} mb-3`}>
                  Usamos Google Analytics 4 para medir visitas y Google Ads para saber qué anuncios generan contactos. Estas
                  herramientas guardan cookies en tu navegador y envían a Google datos de navegación que no te identifican (páginas
                  vistas, dispositivo, de dónde llegaste), que puede tratar fuera de Chile. Nunca les enviamos tu nombre, correo,
                  teléfono ni RUT, ni los usamos para mostrarte publicidad personalizada.
                  {CLARITY_ID && ' También usamos Microsoft Clarity para ver dónde se hace clic y hasta dónde se baja en cada página (mapas de calor y grabaciones con todos los textos y formularios ocultos); Microsoft puede tratar esos datos fuera de Chile.'}
                </p>
                <p className={p}>
                  Las páginas con datos personales (portal de clientes, confirmación de datos y reseñas) no envían sus enlaces
                  personales a Google y no usan Microsoft Clarity. También puedes bloquear las cookies desde tu navegador.
                </p>
                <PreferenciaMedicion />
              </section>

              <section>
                <h2 className={h2}>11. Creador de páginas (crea-tu-web)</h2>
                <p className={`${p} mb-3`}>
                  Si creas una página de prueba en nexcommit.com/crea-tu-web, tratamos tu nombre, empresa, correo y celular para
                  verificar tu correo, crear y publicar tu página, evitar que se cree más de una por persona y contactarte sobre ella
                  (por ejemplo, para ofrecerte dejarla permanente). La base es la ejecución del servicio que solicitas. Solo te enviamos
                  ofertas generales de NexCommit si marcas la casilla correspondiente, y puedes retirar ese consentimiento cuando quieras.
                </p>
                <ul className={`${ul} mb-3`}>
                  <li>Los textos de tu página se generan con OpenAI (Estados Unidos) a partir de la descripción de tu negocio; no le enviamos tu nombre, correo ni celular.</li>
                  <li>Las fotos provienen de bancos de imágenes con licencia libre (Unsplash o Pexels); el correo se envía por Google (Gmail) y los datos se guardan en Supabase.</li>
                  <li>La página queda publicada durante el plazo informado y se elimina 30 días después de vencer.</li>
                  <li>Tus datos de registro se anonimizan a los 12 meses, salvo que pases a ser cliente. Guardamos solo una huella cifrada (hash) del correo y del celular para no repetir la promoción.</li>
                  <li>Los mensajes que dejan las visitas en el formulario de tu página se reenvían a tu correo y se borran a los 30 días. En ese tratamiento NexCommit actúa por cuenta tuya.</li>
                  <li>Si creas una tienda online, te enviamos por correo un usuario y una contraseña para tu panel (guardamos solo una versión cifrada de la contraseña). Los pedidos que hacen tus compradores (productos, total y, si lo escriben, su nombre y una nota) se envían por WhatsApp a tu número, quedan en tu panel y se borran a los 90 días. En ese tratamiento NexCommit actúa por cuenta tuya.</li>
                </ul>
              </section>

              <section>
                <h2 className={h2}>12. Clientes de NexCommit y correos</h2>
                <p className={`${p} mb-3`}>
                  Si eres cliente, guardamos tu nombre, empresa, correo y teléfono para coordinar tus proyectos, el soporte y la
                  facturación. La base es la ejecución del contrato. Antes de escribirte por correo te pedimos que aceptes estos
                  términos, ya sea al registrarte en nuestro sitio o desde el enlace personal que te enviamos para confirmar tus datos.
                </p>
                <ul className={ul}>
                  <li>Las novedades y promociones de nuestros servicios son opcionales: solo te llegan si marcas esa casilla.</li>
                  <li>Cada correo promocional trae un enlace para darte de baja, y el mismo enlace personal te deja corregir tus datos o cambiar tu decisión.</li>
                  <li>Guardamos la fecha en que aceptaste o retiraste tu consentimiento como respaldo; la dirección IP solo como una huella cifrada (hash).</li>
                  <li>El registro de correos enviados se borra a los 180 días, salvo las respuestas a solicitudes de derechos, que guardamos como constancia.</li>
                  <li>
                    Cuando terminamos un proyecto podemos pedirte una reseña por correo, con un enlace personal que vence en 30 días y
                    a lo más un recordatorio. Cada correo trae un enlace para no recibir más solicitudes. Tu reseña la revisa el equipo
                    antes de publicarla, no la editamos, y la retiramos cuando nos lo pidas.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className={h2}>13. Cambios a esta política</h2>
                <p className={p}>
                  Podemos actualizar esta política por cambios legales o en nuestros servicios. Cada versión indica su número y la
                  fecha desde la que rige; si el cambio es importante, te avisaremos por correo.
                </p>
              </section>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
