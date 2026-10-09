import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function Terms() {
  return (
    <>
      <SEO
        title="Términos y Condiciones | NexCommit"
        description="Condiciones de uso de los servicios de NexCommit: cotizaciones, propiedad intelectual, confidencialidad y responsabilidades para clientes y visitantes del sitio."
        canonicalUrl="https://www.nexcommit.com/terms"
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
              Términos y Condiciones
            </h1>

            <div className="space-y-10">
              <section>
                <h2 className="text-2xl font-bold text-white mb-4">1. Objeto</h2>
                <p className="text-brand-muted leading-relaxed">
                  NexCommit presta servicios tecnológicos que pueden incluir desarrollo de software, automatización, integración de sistemas, soporte técnico, consultoría y servicios relacionados.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">2. Uso del sitio web</h2>
                <p className="text-brand-muted leading-relaxed">
                  El usuario se compromete a utilizar el sitio y servicios de forma lícita y sin afectar derechos de terceros.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">3. Cotizaciones y servicios</h2>
                <ul className="list-disc list-inside space-y-2 text-brand-muted">
                  <li>Toda propuesta comercial, presupuesto o cotización tendrá la vigencia expresamente indicada.</li>
                  <li>Los alcances, plazos, entregables y condiciones económicas serán definidos en propuestas o contratos específicos.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">4. Propiedad intelectual</h2>
                <p className="text-brand-muted leading-relaxed">
                  Todo código, documentación, diseños, automatizaciones y entregables desarrollados por NexCommit estarán sujetos a las condiciones acordadas comercialmente.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">5. Confidencialidad</h2>
                <p className="text-brand-muted leading-relaxed">
                  NexCommit procurará mantener confidencial la información técnica, comercial y operativa de sus clientes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">6. Responsabilidad</h2>
                <p className="text-brand-muted leading-relaxed">
                  NexCommit realizará esfuerzos razonables para garantizar continuidad operativa, sin asegurar disponibilidad absoluta o ausencia total de interrupciones.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">7. Protección de datos</h2>
                <p className="text-brand-muted leading-relaxed">
                  El tratamiento de datos personales se regula conforme a nuestra{' '}
                  <Link to="/privacy" className="text-brand-light hover:underline">
                    Política de Privacidad
                  </Link>.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">8. Creador de páginas gratuito</h2>
                <ul className="list-disc list-inside space-y-2 text-brand-muted">
                  <li>La página de prueba es gratuita, se ofrece una sola vez por correo y por celular, y queda publicada durante el plazo informado al crearla.</li>
                  <li>Los textos los genera una inteligencia artificial a partir de lo que describes: revísalos antes de compartir la página. Eres responsable de que la información publicada sea veraz y no infrinja derechos de terceros.</li>
                  <li>No se permite publicar contenido ilegal, engañoso, ofensivo o que suplante a otra persona o empresa. NexCommit puede suspender una página que incumpla estas reglas.</li>
                  <li>El link nexcommit.com/tu-empresa es de NexCommit y se libera después de que la página vence. Para tener un dominio propio y una página permanente se requiere contratar el servicio.</li>
                  <li>El servicio tiene cupos diarios y puede pausarse o terminar en cualquier momento.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">9. Modificaciones</h2>
                <p className="text-brand-muted leading-relaxed">
                  NexCommit podrá modificar estos términos cuando sea necesario.
                </p>
              </section>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
