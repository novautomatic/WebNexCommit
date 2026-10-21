// Landing pages de Google Ads (/lp/:slug), con el mismo diseño que la home
// (clases nh-* de home.css y piezas de components/NhPiezas). El buscador del hero
// escribe las búsquedas reales del anuncio (`queries` en ADS_LANDINGS).
import { useParams, Navigate, Link } from 'react-router-dom';
import { ArrowRight, Check, ClipboardList, MessageCircle, Phone } from 'lucide-react';
import SEO from '../components/SEO';
import { WhatsAppLink, CallLink } from '../components/ContactButtons';
import { BuildingBrowser, PlazosChart, SearchTyper, ShowcaseMarquee } from '../components/NhPiezas';
import { ContactoSeccion, CtaFranja, IrACotizar, PlanBaseCard, PlanesGrid } from '../components/Conversion';
import { PHONE_DISPLAY } from '../config/contact';
import { getAdLanding, PROCESS_STEPS, LANDING_FAQS } from '../data/ADS_LANDINGS';
import './home.css';

export default function AdLanding() {
  const { slug } = useParams();
  const landing = getAdLanding(slug);
  if (!landing) return <Navigate to="/" replace />;
  const planes = landing.planes || [];
  // El producto base (página con IA) solo compite con las páginas simples.
  const conBase = planes.includes('landing-page');
  const faqs = landing.faqs || LANDING_FAQS;

  return (
    <div className="nh">
      <SEO
        title={`${landing.title} | NexCommit`}
        description={landing.subtitle}
        canonicalUrl={`https://www.nexcommit.com/lp/${landing.slug}`}
        noIndex
      />

      {/* Hero */}
      <section id="top" className="nh-hero">
        <div className="nh-wrap nh-hero-grid">
          <div>
            {landing.queries?.length ? <SearchTyper queries={landing.queries} /> : <SearchTyper />}
            <h1 className="nh-h1-lp">{landing.title} <em>{landing.highlight}</em>.</h1>
            <p className="nh-lead">{landing.subtitle}</p>
            <ul className="nh-checks">
              {landing.bullets.map((b) => <li key={b}><Check aria-hidden="true" />{b}</li>)}
            </ul>
            <div className="nh-ctas">
              <WhatsAppLink topic={landing.topic} placement={`lp_hero_${landing.slug}`} className="nh-btn nh-btn-wa">
                <MessageCircle aria-hidden="true" /> Cotizar por WhatsApp
              </WhatsAppLink>
              <IrACotizar servicio={planes[0]} placement={`lp_hero_${landing.slug}`} className="nh-btn nh-btn-ghost">
                <ClipboardList aria-hidden="true" /> Cotizar en 1 minuto
              </IrACotizar>
            </div>
            <p className="nh-hero-mini">
              o llama al <CallLink placement={`lp_hero_${landing.slug}`}><Phone aria-hidden="true" style={{ display: 'inline', width: 14, height: 14 }} /> {PHONE_DISPLAY}</CallLink>
            </p>
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
        <ShowcaseMarquee />
      </section>

      {/* Precios */}
      {planes.length > 0 && (
        <section id="precios" className="nh-block">
          <div className="nh-wrap">
            <div className="nh-kicker">Precios</div>
            <h2>Precios claros desde el primer mensaje.</h2>
            <p className="nh-sub">Valores + IVA del plan base. Te enviamos la propuesta con alcance, plazo y precio cerrado antes de partir.</p>
            <PlanesGrid slugs={planes} placement={`lp_${landing.slug}`} />
            {conBase && <PlanBaseCard placement={`lp_${landing.slug}`} />}
            <p className="nh-sub" style={{ marginTop: 18 }}>
              <Link to="/precios" className="nh-service-more">Ver qué incluye cada plan <ArrowRight aria-hidden="true" /></Link>
            </p>
          </div>
        </section>
      )}

      {/* Qué incluye */}
      <section id="incluye" className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">Qué incluye</div>
          <h2>Todo lo que tu página necesita para traer clientes.</h2>
          <div className="nh-services">
            {landing.includes.map((item) => (
              <div key={item.title} className="nh-service">
                <span className="nh-service-icon"><Check aria-hidden="true" /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
          <CtaFranja placement={`lp_${landing.slug}`} topic={landing.topic} servicio={planes[0]} />
        </div>
      </section>

      {/* Plazos */}
      <section id="plazos" className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">Plazos</div>
          <h2>Sabrás cuándo está listo antes de empezar.</h2>
          <p className="nh-sub">Plazos habituales desde que apruebas la propuesta. La fecha exacta va por escrito.</p>
          <PlazosChart prefix={`lp_${landing.slug}`} />
        </div>
      </section>

      {/* Cómo trabajamos */}
      <section id="como" className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">Cómo trabajamos</div>
          <h2>Tres pasos, sin letra chica.</h2>
          <div className="nh-steps">
            {PROCESS_STEPS.map((step, i) => (
              <div key={step.title} className="nh-step">
                <span className="num" aria-hidden="true">{`0${i + 1}`}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ContactoSeccion placement={`lp_${landing.slug}`} topic={landing.topic} servicio={planes[0]} titulo={`Cotiza ${landing.topic} hoy.`} />

      {/* Preguntas frecuentes */}
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
          <h2>Cotiza {landing.topic} hoy.</h2>
          <p>Escríbenos o llámanos y en una conversación corta definimos alcance, plazo y precio.</p>
          <div className="nh-ctas">
            <WhatsAppLink topic={landing.topic} placement={`lp_final_${landing.slug}`} className="nh-btn nh-btn-wa">
              <MessageCircle aria-hidden="true" /> Escribir por WhatsApp
            </WhatsAppLink>
            <IrACotizar servicio={planes[0]} placement={`lp_final_${landing.slug}`} className="nh-btn nh-btn-ghost">
              <ClipboardList aria-hidden="true" /> Cotizar por formulario
            </IrACotizar>
          </div>
          <div className="nh-phone">
            o llama al <CallLink placement={`lp_final_${landing.slug}`}>{PHONE_DISPLAY}</CallLink>
          </div>
        </div>
      </section>
    </div>
  );
}
