// Landing pages de Google Ads (/lp/:slug), con el mismo diseño que la home
// (clases nh-* de home.css y piezas de components/NhPiezas). El buscador del hero
// escribe las búsquedas reales del anuncio (`queries` en ADS_LANDINGS).
// Orden pensado para quien llega desde un anuncio: qué es y cuánto cuesta (hero),
// prueba de que es real (proyectos + reseñas), precios, cómo es el proceso,
// quiénes somos y contacto. Nada de jerga técnica en los textos.
import { useParams, Navigate, Link } from 'react-router-dom';
import { ArrowRight, Check, MessageCircle, Phone, Tag } from 'lucide-react';
import SEO from '../components/SEO';
import { WhatsAppLink, CallLink } from '../components/ContactButtons';
import { BuildingBrowser, QuienesSomos, SearchTyper, ShowcaseMarquee } from '../components/NhPiezas';
import { ContactoSeccion, CtaFranja, IrACotizar, PlanesGrid } from '../components/Conversion';
import { PHONE_DISPLAY } from '../config/contact';
import { getAdLanding, PROCESS_STEPS, LANDING_FAQS } from '../data/ADS_LANDINGS';
import { PLANES, PLANES_FOCO, SERVICIOS_FOCO } from '../data/PRECIOS';
import { SHOWCASE } from '../data/HOME';
import ResenasSeccion from '../components/Resenas';
import { LANDING_SERVICIO } from '../data/RESENAS';
import './home.css';

const clp = (n) => '$' + n.toLocaleString('es-CL');

export default function AdLanding() {
  const { slug } = useParams();
  const landing = getAdLanding(slug);
  if (!landing) return <Navigate to="/" replace />;
  const planes = landing.planes || [];
  // Si la landing solo ofrece planes del foco, el formulario también (menos opciones).
  const soloFoco = planes.length > 0 && planes.every((s) => PLANES_FOCO.includes(s));
  const faqs = landing.faqs || LANDING_FAQS;
  const precios = PLANES.filter((p) => planes.includes(p.slug)).map((p) => p.precio);
  const desde = precios.length ? Math.min(...precios) : null;

  return (
    <div className="nh">
      <SEO
        title={`${landing.title.replace(/,$/, '')} | NexCommit`}
        description={landing.subtitle}
        canonicalUrl={`https://www.nexcommit.com/lp/${landing.slug}`}
        noIndex
      />

      {/* Hero: qué es, cuánto cuesta y cómo escribirnos */}
      <section id="top" className="nh-hero">
        <div className="nh-wrap nh-hero-grid">
          <div>
            {landing.queries?.length ? <SearchTyper queries={landing.queries} /> : <SearchTyper />}
            <h1 className="nh-h1-lp">{landing.title} <em>{landing.highlight}</em>.</h1>
            <p className="nh-lead">{landing.subtitle}</p>
            {desde && (
              <a href="#precios" className="nh-desde">
                <Tag aria-hidden="true" />
                <span>Desde <b>{clp(desde)}</b> + IVA · precio cerrado por escrito</span>
                <ArrowRight aria-hidden="true" />
              </a>
            )}
            <ul className="nh-checks">
              {landing.bullets.map((b) => <li key={b}><Check aria-hidden="true" /><span>{b}</span></li>)}
            </ul>
            <div className="nh-ctas">
              <WhatsAppLink topic={landing.topic} placement={`lp_hero_${landing.slug}`} className="nh-btn nh-btn-wa">
                <MessageCircle aria-hidden="true" /> Cotizar por WhatsApp
              </WhatsAppLink>
              {desde ? (
                <a href="#precios" className="nh-btn nh-btn-ghost">Ver precios</a>
              ) : (
                <IrACotizar servicio={planes[0]} placement={`lp_hero_${landing.slug}`} className="nh-btn nh-btn-ghost">Cotizar por formulario</IrACotizar>
              )}
            </div>
            <p className="nh-hero-mini">
              o llama al <CallLink placement={`lp_hero_${landing.slug}`}><Phone aria-hidden="true" style={{ display: 'inline', width: 14, height: 14 }} /> {PHONE_DISPLAY}</CallLink>
            </p>
            <div className="nh-trust">
              <span><i />Respondemos el mismo día hábil</span>
              {desde && <span><i />Pagas 50% al partir y 50% al publicar</span>}
              <span><i />{SHOWCASE.length} proyectos publicados</span>
              <span><i />Empresa chilena, clientes en todo Chile</span>
            </div>
          </div>
          {/* En celular se omite: la prueba real (proyectos) viene justo debajo. */}
          <div className="nh-solo-pc"><BuildingBrowser /></div>
        </div>
      </section>

      {/* Prueba: proyectos reales */}
      <section id="proyectos" className="nh-block">
        <div className="nh-wrap nh-head-row">
          <div>
            <div className="nh-kicker">Proyectos reales</div>
            <h2>Negocios chilenos que ya trabajan con nosotros.</h2>
          </div>
          <p className="nh-sub" style={{ maxWidth: '26em' }}>
            Toca cualquier tarjeta para ver el sitio publicado, funcionando hoy.
          </p>
        </div>
        <ShowcaseMarquee />
      </section>

      <ResenasSeccion servicio={LANDING_SERVICIO[landing.slug]} limite={3} />

      {/* Precios */}
      {planes.length > 0 && (
        <section id="precios" className="nh-block">
          <div className="nh-wrap">
            <div className="nh-kicker">Precios</div>
            <h2>Cuánto cuesta, sin rodeos.</h2>
            <p className="nh-sub">Valores + IVA. Antes de empezar te mandamos por escrito qué incluye, el plazo y el precio final: el que acordamos es el que pagas.</p>
            <PlanesGrid slugs={planes} placement={`lp_${landing.slug}`} />
            <p className="nh-sub" style={{ marginTop: 18 }}>
              <Link to="/precios" className="nh-service-more">Ver todo lo que incluye cada plan <ArrowRight aria-hidden="true" /></Link>
            </p>
          </div>
        </section>
      )}

      {/* Qué incluye: solo en los servicios sin tarjetas de precio (chatbot, sistemas) */}
      {landing.includes?.length > 0 && (
        <section id="incluye" className="nh-block">
          <div className="nh-wrap">
            <div className="nh-kicker">Qué incluye</div>
            <h2>Lo que recibes.</h2>
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
      )}

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

      <QuienesSomos />

      <ContactoSeccion
        placement={`lp_${landing.slug}`}
        topic={landing.topic}
        servicio={planes.length === 1 ? planes[0] : ''}
        titulo={`Cotiza ${landing.topic} hoy.`}
        {...(desde ? { desde } : {})}
        {...(soloFoco ? { servicios: SERVICIOS_FOCO } : {})}
      />

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
          <p>Escríbenos y hoy mismo te mandamos el precio y el plazo por escrito. Sin compromiso.</p>
          <div className="nh-ctas">
            <WhatsAppLink topic={landing.topic} placement={`lp_final_${landing.slug}`} className="nh-btn nh-btn-wa">
              <MessageCircle aria-hidden="true" /> Escribir por WhatsApp
            </WhatsAppLink>
            <IrACotizar servicio={planes[0]} placement={`lp_final_${landing.slug}`} className="nh-btn nh-btn-ghost">Cotizar por formulario</IrACotizar>
          </div>
          <div className="nh-phone">
            o llama al <CallLink placement={`lp_final_${landing.slug}`}>{PHONE_DISPLAY}</CallLink>
          </div>
        </div>
      </section>
    </div>
  );
}
