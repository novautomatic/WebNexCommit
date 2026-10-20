import { Check, MessageCircle, ShieldCheck, Timer, MapPin } from 'lucide-react';
import SEO from '../components/SEO';
import { WhatsAppLink } from '../components/ContactButtons';
import { FAQ_PRECIOS, NOTA_PRECIOS, PLANES } from '../data/PRECIOS';

const clp = (n) => '$' + n.toLocaleString('es-CL');
const URL = 'https://www.nexcommit.com/precios';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'Planes de páginas web NexCommit',
    url: URL,
    itemListElement: PLANES.map((p) => ({
      '@type': 'Offer',
      name: p.nombre,
      description: p.para,
      price: p.precio,
      priceCurrency: 'CLP',
      priceSpecification: { '@type': 'PriceSpecification', price: p.precio, priceCurrency: 'CLP', valueAddedTaxIncluded: false },
      seller: { '@type': 'Organization', name: 'NexCommit' },
    })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_PRECIOS.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  },
];

export default function Precios() {
  return (
    <>
      <SEO
        title="Precios de Páginas Web en Chile 2026 | NexCommit"
        description="Precios claros: landing page $300.000, e-commerce $800.000, sistema de reservas y citas $1.000.000 y página empresarial a medida $1.200.000 (+ IVA). Cotiza por WhatsApp."
        keywords="precio página web chile, cuánto cuesta una página web, precio landing page, precio tienda online, sistema de reservas, página web empresa"
        canonicalUrl={URL}
        jsonLd={jsonLd}
      />

      <section className="relative pb-12 md:pb-16">
        <div className="hero-grid absolute inset-0 z-0 pointer-events-none" />
        <div className="container relative z-10 text-center">
          <div className="eyebrow mb-6 mx-auto"><span>Precios 2026</span></div>
          <h1 className="text-4xl md:text-6xl font-semibold mb-5 leading-tight text-white">
            ¿Cuánto cuesta tu <span className="text-gradient">página web</span>?
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto text-brand-muted">
            Precios claros desde el primer día. Elige el plan que se parece a lo que necesitas y te enviamos la propuesta con alcance, plazo y precio cerrado.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-brand-muted">
            <span className="flex items-center gap-2"><Timer className="w-4 h-4" /> Respondemos el mismo día hábil</span>
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Precio cerrado, sin letra chica</span>
            <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Clientes en todo Chile</span>
          </div>
        </div>
      </section>

      <section className="pb-16 md:pb-20">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {PLANES.map((p) => (
              <article key={p.slug} id={p.slug} className="glass-dark rounded-2xl p-6 flex flex-col">
                {/* Alto fijo para título + descripción: los precios quedan alineados entre tarjetas. */}
                <div className="xl:min-h-[8.5rem]">
                  <h2 className="text-xl font-semibold text-white">{p.nombre}</h2>
                  <p className="text-sm text-brand-muted mt-1">{p.para}</p>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-white">{clp(p.precio)}</span>
                  <span className="text-brand-muted text-sm"> + IVA</span>
                </div>
                <p className="text-xs text-brand-muted mt-1">Plazo: {p.plazo}</p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {p.incluye.map((i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-white/90">
                      <Check className="w-4 h-4 text-brand-light shrink-0 mt-0.5" /> {i}
                    </li>
                  ))}
                </ul>
                <WhatsAppLink
                  topic={p.topic}
                  placement={`precios_${p.slug}`}
                  className="btn text-white mt-6 justify-center whitespace-nowrap"
                  style={{ backgroundColor: '#1faa53' }}
                >
                  <MessageCircle className="w-5 h-5" /> Cotizar este plan
                </WhatsAppLink>
              </article>
            ))}
          </div>
          <p className="text-xs text-brand-muted text-center max-w-3xl mx-auto mt-8 leading-relaxed">{NOTA_PRECIOS}</p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-10 text-center">
            Preguntas <span className="text-gradient">frecuentes</span>
          </h2>
          <div className="flex flex-col gap-4">
            {FAQ_PRECIOS.map((faq) => (
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
      </section>

      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none cta-glow" />
        <div className="container relative z-10 text-center">
          <div className="max-w-3xl mx-auto p-10 md:p-12 rounded-[32px] glass-dark">
            <h2 className="text-3xl md:text-5xl font-semibold text-white mb-5">
              ¿No sabes cuál <span className="text-gradient">elegir</span>?
            </h2>
            <p className="text-lg text-brand-muted mb-8">Cuéntanos qué necesitas y te recomendamos el plan justo, sin pagar de más.</p>
            <WhatsAppLink
              topic="una página web"
              placement="precios_final"
              className="btn text-white px-8 py-4 inline-flex"
              style={{ backgroundColor: '#1faa53' }}
            >
              <MessageCircle className="w-5 h-5" /> Escríbenos por WhatsApp
            </WhatsAppLink>
          </div>
        </div>
      </section>
    </>
  );
}
