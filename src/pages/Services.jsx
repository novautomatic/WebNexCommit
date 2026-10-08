import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import SEO from '../components/SEO';
import { WhatsAppLink } from '../components/ContactButtons';
import Breadcrumbs from '../components/Breadcrumbs';
import KdsDemo from '../components/KdsDemo';
import { getServicePage } from '../data/SERVICE_PAGES';

export default function Services() {
  const { slug } = useParams();
  const record = getServicePage(slug);

  if (!record) {
    return <Navigate to="/servicios" replace />;
  }

  const url = `https://www.nexcommit.com/servicios/${record.slug}`;
  const topic = record.topic || record.title.toLowerCase();

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: record.title,
    description: record.metaDescription,
    url,
    areaServed: { '@type': 'Country', name: 'Chile' },
    provider: { '@id': 'https://www.nexcommit.com/#organization' },
  };

  const faqJsonLd = record.faqs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: record.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      }
    : null;

  return (
    <>
      <SEO
        title={record.metaTitle}
        description={record.metaDescription}
        canonicalUrl={url}
        noIndex={record.noIndex}
        jsonLd={record.noIndex ? null : [serviceJsonLd, ...(faqJsonLd ? [faqJsonLd] : [])]}
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
            <h1 className="text-4xl md:text-6xl font-semibold mb-6 leading-tight bg-gradient-to-r from-white via-white to-brand-light bg-clip-text text-transparent">
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

            {record.visual === 'kds' && (
              <div className="mb-12">
                <KdsDemo />
                <p className="text-sm text-brand-muted mt-3 text-center">
                  Ejemplo de pantalla de cocina: cada pedido muestra su canal, su tiempo y cambia de color si se demora.
                </p>
              </div>
            )}

            {record.sections?.length > 0 && (
              <div className="flex flex-col gap-6 mb-12">
                {record.sections.map((section) => (
                  <section key={section.title} className="glass-dark rounded-3xl p-7 md:p-8">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
                      {section.badge && (
                        <span className="text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1 border border-brand-light/40 text-brand-light">
                          {section.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-brand-muted leading-relaxed">{section.text}</p>
                    {section.bullets?.length > 0 && (
                      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {section.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2 text-white/90 text-sm">
                            <Check className="w-4 h-4 text-brand-light flex-shrink-0 mt-0.5" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            )}

            {record.faqs?.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl md:text-3xl font-semibold text-white mb-6">Preguntas frecuentes</h2>
                <div className="flex flex-col gap-4">
                  {record.faqs.map((faq) => (
                    <details key={faq.question} className="glass-dark rounded-2xl p-6 group">
                      <summary className="text-lg font-semibold text-white cursor-pointer list-none flex items-center justify-between gap-4">
                        {faq.question}
                        <span className="text-brand-muted transition-transform group-open:rotate-45 text-2xl leading-none">+</span>
                      </summary>
                      <p className="mt-4 leading-relaxed text-brand-muted">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-dark rounded-3xl p-8 md:p-10 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">¿Hablamos de tu proyecto?</h2>
              <p className="text-brand-muted mb-8 max-w-xl mx-auto leading-relaxed">
                Cuéntanos qué necesitas y te ayudamos a definir el alcance, el plazo y la mejor forma de resolverlo.
              </p>
              <WhatsAppLink topic={topic} placement={`servicio_${record.slug}`} className="btn btn-brand group px-10 py-4">
                Hablar con un experto
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </WhatsAppLink>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
