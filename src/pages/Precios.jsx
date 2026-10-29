// /precios: la página que más clics recibe desde Google Ads (grupo «Precios»).
// Mismo diseño que la home y las landings (clases nh-* de home.css). Desde el
// 2026-10-29 muestra SOLO 3 planes (PLANES_FOCO): menos opciones, decisión más fácil.
// Orden: precios en el hero, planes, prueba (proyectos + reseñas), cómo trabajamos,
// quiénes somos, contacto y preguntas. Los precios viven solo en src/data/PRECIOS.js.
import { MessageCircle, Phone } from 'lucide-react';
import SEO from '../components/SEO';
import { CallLink, WhatsAppLink } from '../components/ContactButtons';
import { ContactoSeccion, PlanesGrid } from '../components/Conversion';
import { QuienesSomos, ShowcaseMarquee } from '../components/NhPiezas';
import ResenasSeccion from '../components/Resenas';
import { PHONE_DISPLAY } from '../config/contact';
import { SHOWCASE } from '../data/HOME';
import { PROCESS_STEPS } from '../data/ADS_LANDINGS';
import { FAQ_PRECIOS, NOTA_PRECIOS, PLANES, PLANES_FOCO, SERVICIOS_FOCO } from '../data/PRECIOS';
import './home.css';

const clp = (n) => '$' + n.toLocaleString('es-CL');
const URL = 'https://www.nexcommit.com/precios';
const FOCO = PLANES_FOCO.map((s) => PLANES.find((p) => p.slug === s));
const precio = (slug) => clp(PLANES.find((p) => p.slug === slug).precio);
// La pregunta del plan con IA ofrece una 4.ª opción: aquí no va.
const FAQ = FAQ_PRECIOS.filter((f) => !f.question.includes('yo mismo'));

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'Planes de páginas web NexCommit',
    url: URL,
    itemListElement: FOCO.map((p) => ({
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
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  },
];

export default function Precios() {
  return (
    <div className="nh">
      <SEO
        title="Precios de Páginas Web en Chile 2026 | NexCommit"
        description={`Precios claros + IVA: landing page ${precio('landing-page')}, tienda online ${precio('ecommerce')} y página empresarial a medida ${precio('web-empresarial')}. Precio cerrado por escrito. Cotiza por WhatsApp hoy.`}
        keywords="precio página web chile, cuánto cuesta una página web, precio landing page, precio tienda online, página web empresa"
        canonicalUrl={URL}
        jsonLd={jsonLd}
      />

      {/* Hero: la respuesta a «cuánto cuesta», en la primera pantalla */}
      <section className="nh-hero nh-hero-centro">
        <div className="nh-wrap">
          <div className="nh-kicker">Precios 2026 · valores + IVA</div>
          <h1 className="nh-h1-lp">¿Cuánto cuesta tu <em>página web</em>?</h1>
          <p className="nh-lead">
            Landing page <b>{precio('landing-page')}</b> · Tienda online <b>{precio('ecommerce')}</b> · Página empresarial{' '}
            <b>{precio('web-empresarial')}</b>. Escríbenos y hoy te mandamos por escrito qué incluye y cuándo está lista:
            el precio que acordamos es el que pagas.
          </p>
          <div className="nh-ctas">
            <WhatsAppLink topic="una página web" placement="precios_hero" className="nh-btn nh-btn-wa">
              <MessageCircle aria-hidden="true" /> Cotizar por WhatsApp
            </WhatsAppLink>
            <a href="#planes" className="nh-btn nh-btn-ghost">Ver los 3 planes</a>
          </div>
          <p className="nh-hero-mini">
            o llama al <CallLink placement="precios_hero"><Phone aria-hidden="true" style={{ display: 'inline', width: 14, height: 14 }} /> {PHONE_DISPLAY}</CallLink>
            {' '}· cotizar no te compromete a nada
          </p>
          <div className="nh-trust">
            <span><i />Respondemos el mismo día hábil</span>
            <span><i />Pagas 50% al partir y 50% al publicar</span>
            <span><i />{SHOWCASE.length} proyectos publicados</span>
            <span><i />Empresa chilena, clientes en todo Chile</span>
          </div>
        </div>
      </section>

      {/* Planes: solo 3 */}
      <section id="planes" className="nh-block nh-block-pegado">
        <div className="nh-wrap">
          <PlanesGrid slugs={PLANES_FOCO} placement="precios" detalle="todo" />
          <p className="nh-sub nh-nota">{NOTA_PRECIOS}</p>
        </div>
      </section>

      {/* Prueba */}
      <section id="proyectos" className="nh-block">
        <div className="nh-wrap nh-head-row">
          <div>
            <div className="nh-kicker">Proyectos reales</div>
            <h2>Lo que ya hicimos por estos precios.</h2>
          </div>
          <p className="nh-sub" style={{ maxWidth: '26em' }}>
            Toca cualquier tarjeta para ver el sitio publicado, funcionando hoy.
          </p>
        </div>
        <ShowcaseMarquee />
      </section>

      <ResenasSeccion limite={3} placement="precios_resenas" />

      {/* Qué pasa cuando escribes: quita el miedo a dar el primer paso */}
      <section id="como" className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">Qué pasa cuando nos escribes</div>
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
        placement="precios"
        titulo="¿No sabes cuál elegir? Te recomendamos el plan justo."
        desde={FOCO[0].precio}
        servicios={SERVICIOS_FOCO}
      />

      {/* Preguntas frecuentes */}
      <section id="faq" className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">Preguntas frecuentes</div>
          <h2>Lo que nos preguntan sobre precios.</h2>
          <div className="nh-faq">
            {FAQ.map((faq) => (
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
