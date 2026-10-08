import React, { useEffect, useRef, useState } from 'react';
import { Lock, MessageCircle, Search } from 'lucide-react';
import SEO from '../components/SEO';
import { WhatsAppLink, CallLink } from '../components/ContactButtons';
import { PHONE_DISPLAY } from '../config/contact';
import {
  SHOWCASE,
  PLAZOS,
  PLAZOS_MAX_WEEKS,
  STEPS,
  SEARCH_QUERIES,
} from '../data/HOME';
import './home.css';

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

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Search pill that types what buyers search for. Starts with a full query so the prerendered HTML is complete. */
function SearchTyper() {
  const [text, setText] = useState(SEARCH_QUERIES[0]);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let qi = 0;
    let ci = SEARCH_QUERIES[0].length;
    let deleting = true;
    let timer;
    const tick = () => {
      const word = SEARCH_QUERIES[qi];
      if (deleting) {
        ci -= 1;
        setText(word.slice(0, ci));
        if (ci <= 0) {
          deleting = false;
          qi = (qi + 1) % SEARCH_QUERIES.length;
        }
        timer = setTimeout(tick, 28);
      } else {
        ci += 1;
        setText(SEARCH_QUERIES[qi].slice(0, ci));
        if (ci >= SEARCH_QUERIES[qi].length) {
          deleting = true;
          timer = setTimeout(tick, 2200);
        } else {
          timer = setTimeout(tick, 55);
        }
      }
    };
    timer = setTimeout(tick, 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="nh-search">
      <Search aria-hidden="true" />
      <span className="q">{text}</span>
      <span className="nh-caret" aria-hidden="true" />
    </div>
  );
}

// Second of the hero video where "NEXCOMMIT.COM" appears on screen.
const PUBLISHED_AT = 6.8;

/**
 * Browser mock playing the NexCommit video (muted, looped): sites being built
 * on screen. The status chip follows the video: "Programando…" while pages are
 * built, "Publicado" once NEXCOMMIT.COM shows, plus an example WhatsApp toast.
 */
function BuildingBrowser() {
  const videoRef = useRef(null);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    if (prefersReducedMotion()) {
      video.pause();
      return;
    }
    video.play().catch(() => {
      /* autoplay blocked: the poster stays visible */
    });
  }, []);

  const onTime = (e) => setPublished(e.currentTarget.currentTime >= PUBLISHED_AT);

  return (
    <div className="nh-stage">
      <div className="nh-browser">
        <div className="nh-chrome">
          <div className="nh-dots"><i /><i /><i /></div>
          <div className="nh-url"><Lock aria-hidden="true" /><span>nexcommit.com</span></div>
        </div>
        <div className="nh-viewport">
          <video
            ref={videoRef}
            className="nh-video"
            src="/home/nexcommit-hero.mp4"
            poster="/home/nexcommit-hero-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label="Video: NexCommit diseña y programa sitios web"
            onTimeUpdate={onTime}
          />
          <div className={`nh-status ${published ? 'is-done' : ''}`}>
            <i />
            <span>{published ? 'Publicado' : 'Programando…'}</span>
          </div>
        </div>
      </div>
      <div className={`nh-toast ${published ? 'is-on' : ''}`} role="status">
        <div className="av"><MessageCircle aria-hidden="true" /></div>
        <div>
          <small><span>Nuevo mensaje desde la web</span><span>ejemplo</span></small>
          <p>Hola! Vengo desde la web y quiero cotizar mi página</p>
        </div>
      </div>
    </div>
  );
}

function ShowcaseCard({ project, hidden = false }) {
  return (
    <a
      className="nh-card"
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
    >
      <div className="mini"><i /><i /><i /></div>
      <div className="img">
        <img src={project.img} alt={hidden ? '' : `Sitio de ${project.name}`} loading="lazy" width="960" height="600" />
      </div>
      <div className="meta"><b>{project.name}</b><span>{project.kind}</span></div>
    </a>
  );
}

export default function Home() {
  const ticks = [];
  for (let t = 0; t <= PLAZOS_MAX_WEEKS; t += 2) ticks.push(t);

  return (
    <div className="nh">
      <SEO
        title="NexCommit | Páginas web, tiendas online y chatbots con IA en Chile"
        description="Creamos páginas web, landing pages, tiendas online, sistemas a medida y chatbots con IA para empresas en todo Chile. Diseño propio, SEO incluido y cotización por WhatsApp."
        keywords="crear página web, diseño de páginas web Chile, empresa de desarrollo web, landing page, tienda online, chatbot con IA, chatbot WhatsApp, automatización, NexCommit"
        canonicalUrl="https://www.nexcommit.com/"
        jsonLd={[faqJsonLd]}
      />

      {/* Hero */}
      <section id="top" className="nh-hero">
        <div className="nh-wrap nh-hero-grid">
          <div>
            <SearchTyper />
            <h1>Tu página web, lista para <em>recibir clientes</em>.</h1>
            <p className="nh-lead">
              Diseñamos y construimos páginas web, tiendas online y chatbots con IA para empresas de todo Chile.
              Sin plantillas, con WhatsApp integrado y preparadas para aparecer en Google.
            </p>
            <div className="nh-ctas">
              <WhatsAppLink topic="una página web" placement="home_hero" className="nh-btn nh-btn-wa">
                <MessageCircle aria-hidden="true" /> Cotizar por WhatsApp
              </WhatsAppLink>
              <a className="nh-btn nh-btn-ghost" href="#proyectos">Ver proyectos reales</a>
            </div>
            <div className="nh-trust">
              <span><i />Respondemos el mismo día hábil</span>
              <span><i />Precio cerrado antes de partir</span>
              <span><i />Clientes en todo Chile</span>
            </div>
          </div>
          <BuildingBrowser />
        </div>
      </section>

      {/* Proyectos reales */}
      <section id="proyectos" className="nh-block">
        <div className="nh-wrap nh-head-row">
          <div>
            <div className="nh-kicker">Proyectos reales</div>
            <h2>Sitios que ya están vendiendo, agendando y respondiendo.</h2>
          </div>
          <p className="nh-sub" style={{ maxWidth: '26em' }}>
            Pasa el cursor para detener el carrusel. Cada tarjeta abre el sitio publicado.
          </p>
        </div>
        <div className="nh-marquee" tabIndex={0} aria-label="Carrusel de proyectos">
          <div className="nh-track">
            {SHOWCASE.map((p) => <ShowcaseCard key={p.name} project={p} />)}
            {SHOWCASE.map((p) => <ShowcaseCard key={`dup-${p.name}`} project={p} hidden />)}
          </div>
        </div>
      </section>

      {/* Servicios y plazos */}
      <section id="plazos" className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">Servicios y plazos</div>
          <h2>Elige lo que necesitas. Sabrás cuándo está listo.</h2>
          <p className="nh-sub">
            Plazos habituales desde que apruebas la propuesta. El precio y la fecha exacta van por escrito antes de empezar.
          </p>
          <div className="nh-plazos">
            <div className="nh-plazos-inner">
              <div className="nh-scale" aria-hidden="true">
                <span />
                <div className="nh-ticks">
                  {ticks.map((t) => (
                    <span key={t} style={{ left: `${(t / PLAZOS_MAX_WEEKS) * 100}%` }}>{t}</span>
                  ))}
                </div>
                <span style={{ textAlign: 'right' }}>semanas</span>
              </div>
              {PLAZOS.map((s) => (
                <WhatsAppLink key={s.slug} topic={s.topic} placement={`home_plazos_${s.slug}`} className="nh-row">
                  <div>
                    <h3>{s.name}</h3>
                    <p>{s.desc}</p>
                  </div>
                  {s.from == null ? (
                    <span className="nh-pill-free">plazo según canales e integraciones</span>
                  ) : (
                    <div className="nh-lane">
                      <div className="nh-fill" style={{ width: `${(s.to / PLAZOS_MAX_WEEKS) * 100}%` }}>
                        {s.to > s.from && <div className="soft" style={{ left: `${(s.from / s.to) * 100}%` }} />}
                      </div>
                    </div>
                  )}
                  <div className="nh-when">{s.label}<small>Cotizar →</small></div>
                </WhatsAppLink>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cómo trabajamos */}
      <section id="como" className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">Cómo trabajamos</div>
          <h2>Tres pasos, sin letra chica.</h2>
          <div className="nh-steps">
            {STEPS.map((step, i) => (
              <div key={step.title} className="nh-step">
                <span className="num" aria-hidden="true">{`0${i + 1}`}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes (also feeds the FAQPage structured data) */}
      <section id="faq" className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">Preguntas frecuentes</div>
          <h2>Lo que nos preguntan antes de partir.</h2>
          <div className="nh-faq">
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}<span aria-hidden="true">+</span></summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Cierre */}
      <section className="nh-final">
        <div className="nh-wrap">
          <h2>¿Cuánto cuesta tu página web? Te respondemos hoy.</h2>
          <p>Cuéntanos qué necesitas en un mensaje. En una conversación corta definimos alcance, plazo y precio.</p>
          <div className="nh-ctas">
            <WhatsAppLink topic="una página web" placement="home_final" className="nh-btn nh-btn-wa">
              <MessageCircle aria-hidden="true" /> Escribir por WhatsApp
            </WhatsAppLink>
          </div>
          <div className="nh-phone">
            o llama al <CallLink placement="home_final">{PHONE_DISPLAY}</CallLink>
          </div>
        </div>
      </section>
    </div>
  );
}
