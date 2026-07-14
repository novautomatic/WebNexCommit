import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';
import { SERVICE_PAGES } from '../data/SERVICE_PAGES';

export default function ServicesIndex() {
  return (
    <>
      <SEO
        title="Servicios | NexCommit"
        description="Desarrollo web, automatización de procesos, integraciones, dashboards e inteligencia artificial aplicada a tu negocio. Conoce todos los servicios de NexCommit."
        canonicalUrl="https://nexcommit.com/servicios"
      />

      <div className="pb-20">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-brand-light to-brand-accent bg-clip-text text-transparent">
              Servicios
            </h1>
            <p className="text-lg text-brand-muted leading-relaxed">
              Tecnología a medida para cada etapa de tu negocio: desde tu primer sitio web hasta automatizaciones e inteligencia artificial aplicada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {SERVICE_PAGES.map((service) => (
              <Link
                key={service.slug}
                to={`/servicios/${service.slug}`}
                className="glass-dark rounded-3xl p-8 group block"
              >
                <h2 className="text-2xl font-semibold mb-3 text-white group-hover:text-brand-light transition-colors">
                  {service.navLabel}
                </h2>
                <p className="text-brand-muted leading-relaxed mb-6">{service.intro}</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-light transition-colors">
                  Ver más <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
