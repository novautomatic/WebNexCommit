import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>Política de Privacidad | NexCommit</title>
        <meta name="description" content="Política de privacidad de NexCommit. Conoce cómo protegemos y tratamos tus datos personales." />
        <meta name="robots" content="index, follow" />
      </Helmet>

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
            <h1 className="text-4xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-white via-brand-light to-brand-accent bg-clip-text text-transparent">
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
                <h2 className="text-2xl font-bold text-white mb-4">9. Modificaciones</h2>
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
