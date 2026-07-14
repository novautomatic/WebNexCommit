import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import SEO from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import { getServicePage } from '../data/SERVICE_PAGES';

export default function Services() {
  const { slug } = useParams();
  const record = getServicePage(slug);

  if (!record) {
    return <Navigate to="/servicios" replace />;
  }

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: record.title,
    description: record.metaDescription,
    provider: {
      '@type': 'Organization',
      name: 'NexCommit',
    },
  };

  return (
    <>
      <SEO
        title={record.metaTitle}
        description={record.metaDescription}
        canonicalUrl={`https://nexcommit.com/servicios/${record.slug}`}
        noIndex={record.noIndex}
        jsonLd={record.noIndex ? null : [serviceJsonLd]}
      />

      <div className="pb-20">
        <div className="container">
          <Link
            to="/servicios"
            className="inline-flex items-center gap-2 text-brand-muted hover:text-white transition-colors mb-8 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Volver a servicios
          </Link>

          <Breadcrumbs
            items={[
              { label: 'Inicio', path: '/' },
              { label: 'Servicios', path: '/servicios' },
              { label: record.navLabel },
            ]}
          />

          <article className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-brand-light to-brand-accent bg-clip-text text-transparent">
              {record.title}
            </h1>

            <p className="text-lg text-brand-muted mb-10 leading-relaxed">{record.intro}</p>

            {record.benefits.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                {record.benefits.map((benefit) => (
                  <div key={benefit} className="glass-dark rounded-2xl p-5 flex items-start gap-3">
                    <Check className="w-5 h-5 text-brand-light flex-shrink-0 mt-0.5" />
                    <span className="text-brand-muted leading-relaxed">{benefit}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="glass-dark rounded-3xl p-8 md:p-10 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">¿Hablamos de tu proyecto?</h2>
              <p className="text-brand-muted mb-8 max-w-xl mx-auto leading-relaxed">
                Cuéntanos qué necesitas y te ayudamos a definir el alcance, el plazo y la mejor forma de resolverlo.
              </p>
              <a
                href="https://wa.me/56929237511?text=Hola!%20Vengo%20desde%20la%20web%20de%20NexCommit%20y%20me%20gustar%C3%ADa%20m%C3%A1s%20informaci%C3%B3n."
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-brand group px-10 py-4"
              >
                Hablar con un experto
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
