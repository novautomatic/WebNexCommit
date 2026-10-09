import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function Privacy() {
  return (
    <>
      <SEO
        title="Política de Privacidad | NexCommit"
        description="Conoce cómo NexCommit recopila, utiliza y protege los datos personales de clientes y visitantes en sus formularios, plataformas y servicios."
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
            <h1 className="text-4xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-white via-white to-[#9cdcff] bg-clip-text text-transparent">
              Política de Privacidad
            </h1>

            <p className="text-lg text-brand-muted mb-10 leading-relaxed">
              En NexCommit respetamos la privacidad de nuestros usuarios, clientes y potenciales clientes. La presente Política de Privacidad explica cómo recopilamos, utilizamos, almacenamos y protegemos los datos personales obtenidos a través de nuestros formularios, plataformas, comunicaciones y servicios.
            </p>

            <div className="space-y-10">
              <section>
                <h2 className="text-2xl font-bold text-white mb-4">1. Responsable del tratamiento de datos</h2>
                <p className="text-brand-muted leading-relaxed mb-3">
                  NexCommit es responsable del tratamiento de los datos personales recopilados mediante su sitio web, formularios comerciales, servicios tecnológicos, soporte técnico y otros canales de contacto.
                </p>
                <p className="text-brand-muted leading-relaxed">
                  Para consultas relacionadas con privacidad y protección de datos, puede escribir a:
                  <br />
                  <strong className="text-white">Correo de privacidad:</strong>{' '}
                  <a href="mailto:privacidad@nexcommit.com" className="text-brand-light hover:underline">
                    privacidad@nexcommit.com
                  </a>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">2. Datos que recopilamos</h2>
                <p className="text-brand-muted leading-relaxed mb-3">Podemos recopilar las siguientes categorías de datos:</p>
                <ul className="list-disc list-inside space-y-2 text-brand-muted">
                  <li>Nombre y apellido</li>
                  <li>Correo electrónico</li>
                  <li>Número telefónico</li>
                  <li>Empresa y cargo</li>
                  <li>Información asociada a requerimientos técnicos o comerciales</li>
                  <li>Datos de facturación</li>
                  <li>Registros de soporte y comunicaciones</li>
                  <li>Datos técnicos básicos de navegación (IP, navegador, dispositivo)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">3. Finalidad del tratamiento de datos</h2>
                <p className="text-brand-muted leading-relaxed mb-3">Utilizamos los datos personales para:</p>
                <ul className="list-disc list-inside space-y-2 text-brand-muted">
                  <li>Contactar interesados en nuestros servicios</li>
                  <li>Elaborar propuestas comerciales y cotizaciones</li>
                  <li>Gestionar proyectos tecnológicos</li>
                  <li>Proporcionar soporte técnico</li>
                  <li>Emitir documentación administrativa y tributaria</li>
                  <li>Mejorar la calidad de nuestros servicios</li>
                  <li>Enviar comunicaciones comerciales, cuando exista autorización</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">4. Base de uso de datos</h2>
                <p className="text-brand-muted leading-relaxed">
                  Los datos serán tratados únicamente para los fines informados al usuario y bajo consentimiento cuando corresponda.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">5. Compartición de información</h2>
                <p className="text-brand-muted leading-relaxed mb-3">
                  Podremos utilizar proveedores tecnológicos necesarios para operar nuestros servicios, tales como:
                </p>
                <ul className="list-disc list-inside space-y-2 text-brand-muted">
                  <li>Servicios de correo corporativo</li>
                  <li>Plataformas cloud</li>
                  <li>Herramientas de analítica</li>
                  <li>CRM</li>
                  <li>Servicios de hosting</li>
                  <li>Plataformas de videoconferencia</li>
                </ul>
                <p className="text-brand-muted leading-relaxed mt-3">
                  NexCommit procura trabajar con proveedores que mantengan estándares adecuados de seguridad.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">6. Seguridad de la información</h2>
                <p className="text-brand-muted leading-relaxed">
                  Implementamos medidas razonables de seguridad para proteger la información frente a accesos no autorizados, pérdida, alteración o divulgación indebida.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">7. Derechos del titular</h2>
                <p className="text-brand-muted leading-relaxed mb-3">El usuario podrá solicitar:</p>
                <ul className="list-disc list-inside space-y-2 text-brand-muted">
                  <li>Acceso a sus datos</li>
                  <li>Corrección de datos inexactos</li>
                  <li>Eliminación cuando corresponda</li>
                  <li>Oposición a comunicaciones comerciales</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">8. Conservación de datos</h2>
                <p className="text-brand-muted leading-relaxed">
                  Los datos serán almacenados durante el tiempo necesario para cumplir las finalidades informadas y obligaciones legales.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">9. Cookies y medición</h2>
                <p className="text-brand-muted leading-relaxed mb-3">
                  Con tu consentimiento usamos Google Analytics 4 para medir visitas y Google Ads para saber qué anuncios generan contactos. Estas herramientas guardan cookies en tu navegador y envían datos de navegación a Google, que puede tratarlos fuera de Chile.
                </p>
                <p className="text-brand-muted leading-relaxed">
                  No se activan hasta que aceptas el aviso de cookies. Puedes cambiar tu decisión en cualquier momento desde el enlace «Cookies» al pie de cada página.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">10. Creador de páginas (crea-tu-web)</h2>
                <p className="text-brand-muted leading-relaxed mb-3">
                  Si creas una página de prueba en nexcommit.com/crea-tu-web, tratamos tu nombre, empresa, correo y celular para
                  verificar tu correo, crear y publicar tu página, evitar que se cree más de una por persona y contactarte sobre ella
                  (por ejemplo, para ofrecerte dejarla permanente). La base es la ejecución del servicio que solicitas. Solo te enviamos
                  ofertas generales de NexCommit si marcas la casilla correspondiente, y puedes retirar ese consentimiento cuando quieras.
                </p>
                <ul className="list-disc list-inside space-y-2 text-brand-muted mb-3">
                  <li>Los textos de tu página se generan con OpenAI (Estados Unidos) a partir de la descripción de tu negocio; no le enviamos tu nombre, correo ni celular.</li>
                  <li>Las fotos provienen de bancos de imágenes con licencia libre (Unsplash o Pexels); el correo se envía por Google (Gmail) y los datos se guardan en Supabase.</li>
                  <li>La página queda publicada durante el plazo informado y se elimina 30 días después de vencer.</li>
                  <li>Tus datos de registro se anonimizan a los 12 meses, salvo que pases a ser cliente. Guardamos solo una huella cifrada (hash) del correo y del celular para no repetir la promoción.</li>
                  <li>Los mensajes que dejan las visitas en el formulario de tu página se reenvían a tu correo y se borran a los 30 días. En ese tratamiento NexCommit actúa por cuenta tuya.</li>
                </ul>
                <p className="text-brand-muted leading-relaxed">
                  Para ejercer tus derechos de acceso, rectificación, supresión, oposición, portabilidad o bloqueo, escribe a nexcommit@gmail.com.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">11. Modificaciones</h2>
                <p className="text-brand-muted leading-relaxed">
                  NexCommit podrá actualizar esta política para reflejar cambios regulatorios o mejoras operativas.
                </p>
              </section>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
