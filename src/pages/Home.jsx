import React, { Suspense, lazy } from 'react';
import { ArrowRight, Globe, RefreshCw, Database, Phone } from 'lucide-react';
const Hero3D = lazy(() => import('../Hero3D'));
import { BrandLogo } from '../components/Brand';
import SEO from '../components/SEO';
import ClientCard from '../components/ClientCard';
import { CLIENTS } from '../data/CLIENTS';
import { WhatsAppLink, CallLink } from '../components/ContactButtons';

const services = [
  {
    icon: Globe,
    tone: 'tone-deep',
    title: 'Sitios web que convierten',
    description: 'Diseñamos y lanzamos tu web a medida: rapida, responsive y pensada para que tus visitas se vuelvan clientes.',
    benefit: 'Beneficio: +15% leads',
    cta: 'Presencia profesional',
  },
  {
    icon: RefreshCw,
    tone: 'tone-brand',
    title: 'Procesos autónomos',
    description: 'Conectamos tus herramientas y automatizamos flujos para que tu operacion gane velocidad y reduzca friccion.',
    benefit: 'Beneficio: -30% tiempo adm.',
    cta: 'Optimiza tus flujos',
  },
  {
    icon: Database,
    tone: 'tone-sky',
    title: 'Apps y datos',
    description: 'Desarrollamos apps web y bases de datos seguras para agenda, inventarios, reportes y operaciones criticas.',
    benefit: 'Beneficio: 100% control',
    cta: 'Operacion ordenada',
  },
];



const faqs = [
  {
    question: '¿Qué servicios ofrece NexCommit?',
    answer:
      'Desarrollamos sitios web a medida, automatizamos procesos comerciales y operativos, y construimos apps y dashboards con bases de datos seguras para agenda, inventario y reportes. Todo se adapta al tamaño y objetivos del negocio, desde una landing hasta una plataforma SaaS completa.',
  },
  {
    question: '¿Cuánto tiempo toma un proyecto?',
    answer:
      'Depende del alcance: una landing page toma alrededor de 1 semana, un sitio corporativo cerca de 3 semanas, un ecommerce cerca de 4 semanas, y proyectos SaaS o enterprise entre 10 y 12 semanas. Definimos el plazo exacto durante la cotización según los módulos y funcionalidades que necesites.',
  },
  {
    question: '¿Cómo funciona el proceso de cotización/inicio de un proyecto?',
    answer:
      'Partimos con una conversación por WhatsApp o formulario para entender tu negocio y objetivos. Con eso armamos una propuesta con alcance, funcionalidades y precio claro antes de empezar, sin letra chica. Una vez aprobada, iniciamos el desarrollo con hitos y comunicación constante.',
  },
  {
    question: '¿Trabajan con empresas fuera de Chile / remoto?',
    answer:
      'Sí, trabajamos 100% remoto con clientes en Chile y fuera del país. La comunicación es por WhatsApp, email y videollamadas, y usamos infraestructura cloud (Vercel, AWS, GCP, Azure) que no depende de ubicación geográfica.',
  },
  {
    question: '¿Qué tecnologías usan?',
    answer:
      'Construimos con stacks modernos como React y bases de datos Supabase/PostgreSQL, con despliegue en Vercel. Integramos pasarelas de pago (Stripe, Flow, Mercado Pago, Transbank), CRMs (HubSpot, ActiveCampaign, GoHighLevel), WhatsApp API y automatizaciones con IA cuando el proyecto lo requiere.',
  },
  {
    question: '¿Ofrecen soporte o mantenimiento después de lanzar el proyecto?',
    answer:
      'Sí, ofrecemos planes de hosting, mantención y soporte prioritario post-lanzamiento para que la plataforma siga funcionando sin fricción. También hacemos monitoreo y backups automáticos como servicios mensuales opcionales.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

export default function Home() {
  const scrollToServices = () => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <SEO 
        title="NexCommit | Páginas web, tiendas online y chatbots con IA en Chile"
        description="Creamos páginas web, landing pages, tiendas online, sistemas a medida y chatbots con IA para empresas en todo Chile. Diseño propio, SEO incluido y cotización por WhatsApp."
        keywords="crear página web, diseño de páginas web Chile, empresa de desarrollo web, landing page, tienda online, chatbot con IA, chatbot WhatsApp, automatización, NexCommit"
        canonicalUrl="https://www.nexcommit.com/"
        jsonLd={[faqJsonLd]}
      />
      <section id="top" className="relative w-full min-h-[640px] overflow-hidden flex pb-20 md:pb-24">
        <div className="hero-grid absolute inset-0 z-0 pointer-events-none" />
        <div
          className="absolute inset-y-0 right-0 z-0 pointer-events-none"
          style={{
            width: '62%',
            background: 'radial-gradient(ellipse at center, rgba(35, 136, 218, 0.18) 0%, rgba(98, 198, 244, 0.08) 35%, transparent 72%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute z-0 pointer-events-none hero-canvas"
          style={{
            top: '-6%',
            right: '-2%',
            width: '56%',
            height: '100%',
          }}
        >
          <Suspense fallback={null}>
            <Hero3D />
          </Suspense>
        </div>
        <div className="relative z-10 w-full h-full flex flex-col pointer-events-none">
          <div className="container pt-10 md:pt-12">
            <div className="max-w-2xl animate-fade-in pointer-events-auto">
              <div className="eyebrow mb-6">
                <BrandLogo compact />
                <span>Tecnologia a medida para crecer con foco comercial</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-semibold mb-5 leading-tight text-white">
                Convertimos ideas en{' '}
                <span className="text-gradient">plataformas con identidad</span>
              </h1>
              <p className="text-lg md:text-xl mb-10 max-w-xl font-normal animate-fade-in delay-100 text-brand-muted">
                Integramos diseno, automatizacion y desarrollo a medida para que tu negocio avance con una marca coherente y una operacion mas solida.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in delay-200">
                <button className="btn btn-brand group" onClick={scrollToServices}>
                  Nuestros servicios
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <WhatsAppLink placement="home_hero" className="btn btn-ghost">
                  Cotizar por WhatsApp
                </WhatsAppLink>
                <CallLink placement="home_hero" className="btn btn-ghost">
                  <Phone className="w-5 h-5" /> Llamar
                </CallLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="py-28 md:py-32 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="container relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-white tracking-tight">
              Servicios diseñados para <span className="text-gradient">escalar</span>
            </h2>
            <p className="text-lg text-brand-muted">
              La paleta, el logo y el sistema visual ya pueden vivir de forma consistente dentro de una experiencia moderna y comercial.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div key={service.title} className={`service-card glass-dark ${service.tone} p-10 rounded-3xl group`}>
                  <div className="service-icon w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 duration-500">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">{service.title}</h3>
                  <p className="mb-8 min-h-[88px] leading-relaxed text-brand-muted">{service.description}</p>
                  <div className="service-pill inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6">
                    {service.benefit}
                  </div>
                  <div className="service-link flex items-center gap-2 text-sm font-semibold transition-colors">
                    {service.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="clients" className="py-28 md:py-32 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="container relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-white tracking-tight">
              Proyectos que <span className="text-gradient">hablan por nosotros</span>
            </h2>
            <p className="text-lg text-brand-muted">
              Cada sitio refleja nuestro compromiso con el diseño, la performance y la identidad de marca.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {CLIENTS.map((client) => (
              <ClientCard key={client.name} {...client} />
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-28 md:py-32 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="container relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-white tracking-tight">
              Preguntas <span className="text-gradient">frecuentes</span>
            </h2>
            <p className="text-lg text-brand-muted">
              Resolvemos las dudas más comunes antes de partir un proyecto con nosotros.
            </p>
          </div>
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="glass-dark rounded-2xl p-6 group"
              >
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

      <section className="py-28 md:py-32 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-full w-full pointer-events-none cta-glow" />
        <div className="container relative z-10 text-center">
          <div className="max-w-4xl mx-auto p-10 md:p-12 rounded-[32px] glass-dark border-white/5 shadow-2xl">
            <div className="flex justify-center mb-8">
              <BrandLogo compact />
            </div>
            <h2 className="text-4xl md:text-5xl font-semibold text-white mb-6 tracking-tight">
              Listo para alinear tu <span className="text-gradient">marca y producto</span>?
            </h2>
            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed text-brand-muted">
              Conversemos sobre tu proyecto y definamos juntos el plan de trabajo, los tiempos y el alcance que necesitas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <WhatsAppLink placement="home_cta" className="btn btn-brand group px-10 py-4">
                Hablar con un experto
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </WhatsAppLink>
              <a href="#services" className="btn btn-ghost px-10 py-4">
                Ver servicios
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
