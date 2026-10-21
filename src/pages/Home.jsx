import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Check,
  ClipboardList,
  CreditCard,
  Globe,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  Plug,
  ShoppingBag,
  UtensilsCrossed,
  Workflow,
} from 'lucide-react';
import SEO from '../components/SEO';
import KdsDemo from '../components/KdsDemo';
import { WhatsAppLink, CallLink } from '../components/ContactButtons';
import { PHONE_DISPLAY } from '../config/contact';
import { STEPS, SERVICE_GRID, HOME_FAQS } from '../data/HOME';
import { BuildingBrowser, PlazosChart, SearchTyper, ShowcaseMarquee } from '../components/NhPiezas';
import { ContactoSeccion, CtaFranja, IrACotizar, PlanBaseCard, PlanesGrid } from '../components/Conversion';
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

export default function Home() {
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
              <IrACotizar placement="home_hero" className="nh-btn nh-btn-ghost">
                <ClipboardList aria-hidden="true" /> Cotizar en 1 minuto
              </IrACotizar>
            </div>
            <p className="nh-hero-mini">
              Planes desde $150.000 + IVA · <Link to="/crea-tu-web">o crea tu página gratis con IA <ArrowRight aria-hidden="true" /></Link>
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

      {/* Precios (src/data/PRECIOS.js) + producto base con IA */}
      <section id="precios" className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">Precios</div>
          <h2>Precios claros desde el primer mensaje.</h2>
          <p className="nh-sub">
            Valores + IVA del plan base. Si necesitas algo adicional, la propuesta llega con alcance, plazo y precio cerrado antes de partir.
            {' '}<Link to="/precios" className="text-[#67c8f3] underline underline-offset-2">Ver todo lo que incluye cada plan</Link>.
          </p>
          <PlanesGrid placement="home" />
          <PlanBaseCard placement="home" />
        </div>
      </section>

      {/* Servicios y plazos */}
      <section id="plazos" className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">Servicios y plazos</div>
          <h2>Elige lo que necesitas. Sabrás cuándo está listo.</h2>
          <p className="nh-sub">
            Plazos habituales desde que apruebas la propuesta. El precio y la fecha exacta van por escrito antes de empezar.
            {' '}<Link to="/precios" className="text-[#67c8f3] underline underline-offset-2">Ver precios de cada plan</Link>.
          </p>
          <PlazosChart prefix="home" />
        </div>
      </section>

      {/* Cierre (después de plazos) */}
      <section className="nh-final">
        <div className="nh-wrap">
          <h2>¿Cuánto cuesta tu página web? Te respondemos hoy.</h2>
          <p>Cuéntanos qué necesitas en un mensaje. En una conversación corta definimos alcance, plazo y precio.</p>
          <div className="nh-ctas">
            <WhatsAppLink topic="una página web" placement="home_final" className="nh-btn nh-btn-wa">
              <MessageCircle aria-hidden="true" /> Escribir por WhatsApp
            </WhatsAppLink>
            <IrACotizar placement="home_final" className="nh-btn nh-btn-ghost">
              <ClipboardList aria-hidden="true" /> Cotizar por formulario
            </IrACotizar>
          </div>
          <div className="nh-phone">
            o llama al <CallLink placement="home_final">{PHONE_DISPLAY}</CallLink>
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
          <CtaFranja placement="home_servicios" titulo="¿No sabes qué necesitas? Te ayudamos a elegir." />
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

      <ContactoSeccion placement="home" />

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
    </div>
  );
}
