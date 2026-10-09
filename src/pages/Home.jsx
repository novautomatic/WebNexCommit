import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Check,
  CreditCard,
  Globe,
  GraduationCap,
  LayoutDashboard,
  Lock,
  MessageCircle,
  Plug,
  Search,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Workflow,
} from 'lucide-react';
import SEO from '../components/SEO';
import KdsDemo from '../components/KdsDemo';
import { WhatsAppLink, CallLink } from '../components/ContactButtons';
import { PHONE_DISPLAY } from '../config/contact';
import {
  SHOWCASE,
  PLAZOS,
  PLAZOS_MAX_WEEKS,
  STEPS,
  SEARCH_QUERIES,
  SERVICE_GRID,
  HOME_FAQS,
} from '../data/HOME';
import './home.css';

const ICONS = { Globe, ShoppingBag, UtensilsCrossed, Bot, CreditCard, Plug, GraduationCap, Workflow, LayoutDashboard };

const faqs = HOME_FAQS;

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
              <Link className="nh-btn nh-btn-ghost" to="/crea-tu-web">
                <Sparkles aria-hidden="true" /> Crea tu página gratis con IA
              </Link>
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

      {/* Todo lo que hacemos */}
      <section id="servicios" className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">Todo lo que hacemos</div>
          <h2>Una web, un chatbot o todo tu negocio conectado.</h2>
          <p className="nh-sub">
            Elige un servicio o combínalos: diseñamos, programamos e integramos todo para que funcione junto.
          </p>
          <div className="nh-services">
            {SERVICE_GRID.map((item) => {
              const Icon = ICONS[item.icon];
              return (
                <Link key={item.slug} to={`/servicios/${item.slug}`} className="nh-service">
                  <span className="nh-service-icon"><Icon aria-hidden="true" /></span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <span className="nh-service-more">Ver más <ArrowRight aria-hidden="true" /></span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Restaurantes */}
      <section id="restaurantes" className="nh-block nh-resto">
        <div className="nh-wrap nh-resto-grid">
          <div>
            <div className="nh-kicker">Para restaurantes</div>
            <h2>Lleva tu restaurante a Uber Eats y ordena tu cocina.</h2>
            <p className="nh-sub">
              Con un KDS, los pedidos del salón, tu web y el delivery aparecen al instante en una pantalla de cocina:
              cada estación ve lo suyo, el color avisa si algo se demora y con un toque se marca listo.
            </p>
            <ul className="nh-checks">
              <li><Check aria-hidden="true" />Alta y configuración de tu local en Uber Eats</li>
              <li><Check aria-hidden="true" />Pantallas de cocina (KDS) en vez de comandas de papel</li>
              <li><Check aria-hidden="true" />Delivery desde tu web con la flota de Uber</li>
              <li><Check aria-hidden="true" />Carta online, punto de venta, inventario y pagos</li>
              <li><Check aria-hidden="true" />Pedidos de Uber Eats directo a cocina <span className="nh-soon">Próximamente</span></li>
            </ul>
            <div className="nh-ctas">
              <Link to="/servicios/restaurantes" className="nh-btn nh-btn-ghost">Ver solución para restaurantes</Link>
              <WhatsAppLink topic="un sistema para mi restaurante" placement="home_restaurantes" className="nh-btn nh-btn-wa">
                <MessageCircle aria-hidden="true" /> Cotizar
              </WhatsAppLink>
            </div>
          </div>
          <div>
            <KdsDemo />
            <p className="nh-kds-caption">Ejemplo de pantalla de cocina (KDS) con pedidos del salón, la web y Uber Eats.</p>
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
