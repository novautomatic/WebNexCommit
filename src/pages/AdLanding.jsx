import { useParams, Navigate } from 'react-router-dom';
import { Check, MessageCircle, Phone, ShieldCheck, Timer, MapPin } from 'lucide-react';
import SEO from '../components/SEO';
import ClientCard from '../components/ClientCard';
import { WhatsAppLink, CallLink } from '../components/ContactButtons';
import { CLIENTS } from '../data/CLIENTS';
import { PHONE_DISPLAY } from '../config/contact';
import {
  getAdLanding,
  PROCESS_STEPS,
  LANDING_FAQS,
  SHOW_PRICES,
} from '../data/ADS_LANDINGS';

const clp = (n) => '$' + n.toLocaleString('es-CL');

function ContactCtas({ landing, placement, center = false }) {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${center ? 'justify-center items-center' : ''}`}>
      <WhatsAppLink
        topic={landing.topic}
        placement={`${placement}_${landing.slug}`}
        className="btn text-white px-8 py-4 hover:-translate-y-0.5"
        style={{ backgroundColor: '#1faa53', boxShadow: '0 18px 40px rgba(31,170,83,0.28)' }}
      >
        <MessageCircle className="w-5 h-5" /> Cotizar por WhatsApp
      </WhatsAppLink>
      <CallLink placement={`${placement}_${landing.slug}`} className="btn btn-ghost px-8 py-4">
        <Phone className="w-5 h-5" /> Llamar {PHONE_DISPLAY}
      </CallLink>
    </div>
  );
}

export default function AdLanding() {
  const { slug } = useParams();
  const landing = getAdLanding(slug);
  if (!landing) return <Navigate to="/" replace />;

  return (
    <>
      <SEO
        title={`${landing.title} | NexCommit`}
        description={landing.subtitle}
        canonicalUrl={`https://nexcommit.com/lp/${landing.slug}`}
        noIndex
      />

      {/* Hero */}
      <section className="relative pb-20 md:pb-24">
        <div className="hero-grid absolute inset-0 z-0 pointer-events-none" />
        <div className="container relative z-10">
          <div className="max-w-3xl">
            <div className="eyebrow mb-6">
              <span>{landing.eyebrow}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold mb-5 leading-tight text-white">
              {landing.title}{' '}
              <span className="text-gradient">{landing.highlight}</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 max-w-2xl text-brand-muted">{landing.subtitle}</p>

            <ul className="grid sm:grid-cols-2 gap-3 mb-10">
              {landing.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-white/90">
                  <Check className="w-5 h-5 text-brand-light flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>

            {SHOW_PRICES && landing.priceFrom && (
              <p className="mb-6 text-brand-muted">
                Desde <span className="text-white font-semibold text-xl">{clp(landing.priceFrom)}</span>{' '}
                ({landing.priceNote})
              </p>
            )}

            <ContactCtas landing={landing} placement="lp_hero" />

            <div className="flex flex-wrap gap-6 mt-8 text-sm text-brand-muted">
              <span className="flex items-center gap-2"><Timer className="w-4 h-4" /> Respondemos el mismo día hábil</span>
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Propuesta con precio cerrado</span>
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Clientes en todo Chile</span>
            </div>
          </div>
        </div>
      </section>

      {/* Qué incluye */}
      <section className="py-20 md:py-24 relative">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-12 text-center">
            Qué <span className="text-gradient">incluye</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {landing.includes.map((item) => (
              <div key={item.title} className="glass-dark rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-brand-muted leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portafolio */}
      <section className="py-20 md:py-24 relative">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4 text-center">
            Proyectos que <span className="text-gradient">ya lanzamos</span>
          </h2>
          <p className="text-brand-muted text-center mb-12">Algunos de los sitios y plataformas que hemos desarrollado.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {CLIENTS.slice(0, 6).map((c) => (
              <ClientCard key={c.name} {...c} />
            ))}
          </div>
        </div>
      </section>

      {/* Proceso */}
      <section className="py-20 md:py-24 relative">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-12 text-center">
            Cómo <span className="text-gradient">trabajamos</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PROCESS_STEPS.map((step, i) => (
              <div key={step.title} className="glass-dark rounded-2xl p-6">
                <div className="text-brand-light font-bold text-sm mb-3">Paso {i + 1}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-brand-muted leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-24 relative">
        <div className="container max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-10 text-center">
            Preguntas <span className="text-gradient">frecuentes</span>
          </h2>
          <div className="flex flex-col gap-4">
            {LANDING_FAQS.map((faq) => (
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

      {/* CTA final */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none cta-glow" />
        <div className="container relative z-10 text-center">
          <div className="max-w-3xl mx-auto p-10 md:p-12 rounded-[32px] glass-dark">
            <h2 className="text-3xl md:text-5xl font-semibold text-white mb-5">
              Cotiza {landing.topic} <span className="text-gradient">hoy</span>
            </h2>
            <p className="text-lg text-brand-muted mb-10">
              Escríbenos o llámanos y en una conversación corta definimos alcance, plazo y precio.
            </p>
            <ContactCtas landing={landing} placement="lp_final" center />
          </div>
        </div>
      </section>
    </>
  );
}
