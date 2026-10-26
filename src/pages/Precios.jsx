// /precios: la página que más clics recibe desde Google Ads (grupo «Precios»).
// Mismo diseño que la home y las landings (clases nh-* de home.css). Orden: precio
// de entrada, planes, ayuda para elegir, prueba (proyectos + reseñas), quiénes
// somos, preguntas y contacto. Los precios viven solo en src/data/PRECIOS.js.
import { Check, MessageCircle, Phone } from 'lucide-react';
import SEO from '../components/SEO';
import { CallLink, WhatsAppLink } from '../components/ContactButtons';
import { ContactoSeccion, IrACotizar, PlanBaseCard, PlanesGrid } from '../components/Conversion';
import { QuienesSomos, ShowcaseMarquee } from '../components/NhPiezas';
import ResenasSeccion from '../components/Resenas';
import { PHONE_DISPLAY } from '../config/contact';
import { SHOWCASE } from '../data/HOME';
import { FAQ_PRECIOS, NOTA_PRECIOS, PLAN_BASE, PLANES } from '../data/PRECIOS';
import './home.css';

const clp = (n) => '$' + n.toLocaleString('es-CL');
const URL = 'https://www.nexcommit.com/precios';
const precio = (slug) => clp(PLANES.find((p) => p.slug === slug).precio);

// «¿Cuál me conviene?»: cada fila lleva al plan que corresponde.
const GUIA = [
  { si: 'Vendes un servicio y quieres que te escriban o te llamen', plan: 'landing-page', nombre: 'Landing page' },
  { si: 'Vendes productos y quieres cobrar en línea', plan: 'ecommerce', nombre: 'E-commerce' },
  { si: 'Trabajas con horas agendadas (consulta, clínica, estética)', plan: 'reservas-y-citas', nombre: 'Reservas y citas' },
  { si: 'Eres una empresa con varios servicios que mostrar', plan: 'web-empresarial', nombre: 'Página empresarial' },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'Planes de páginas web NexCommit',
    url: URL,
    itemListElement: [PLAN_BASE, ...PLANES].map((p) => ({
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
    <div className="nh">
      <SEO
        title="Precios de Páginas Web en Chile 2026 | NexCommit"
        description="Precios claros: tu página hecha con IA y publicada $150.000, landing page $300.000, e-commerce $800.000, sistema de reservas y citas $1.000.000 y página empresarial a medida $1.200.000 (+ IVA). Cotiza por WhatsApp."
        keywords="precio página web chile, cuánto cuesta una página web, precio landing page, precio tienda online, sistema de reservas, página web empresa"
        canonicalUrl={URL}
        jsonLd={jsonLd}
      />

      {/* Hero: la respuesta a «cuánto cuesta», en la primera pantalla */}
      <section className="nh-hero nh-hero-centro">
        <div className="nh-wrap">
          <div className="nh-kicker">Precios 2026 · valores + IVA</div>
          <h1 className="nh-h1-lp">¿Cuánto cuesta tu <em>página web</em>?</h1>
          <p className="nh-lead">
            Landing page {precio('landing-page')}, tienda online {precio('ecommerce')}, reservas y citas {precio('reservas-y-citas')} y
            página empresarial {precio('web-empresarial')}. Antes de empezar te mandamos por escrito qué incluye, el plazo y el
            precio final: el que acordamos es el que pagas.
          </p>
          <div className="nh-ctas">
            <WhatsAppLink topic="una página web" placement="precios_hero" className="nh-btn nh-btn-wa">
              <MessageCircle aria-hidden="true" /> Cotizar por WhatsApp
            </WhatsAppLink>
            <a href="#cual" className="nh-btn nh-btn-ghost">¿Cuál me conviene?</a>
          </div>
          <p className="nh-hero-mini">
            o llama al <CallLink placement="precios_hero"><Phone aria-hidden="true" style={{ display: 'inline', width: 14, height: 14 }} /> {PHONE_DISPLAY}</CallLink>
          </p>
          <div className="nh-trust">
            <span><i />Respondemos el mismo día hábil</span>
            <span><i />{SHOWCASE.length} proyectos publicados</span>
            <span><i />Empresa chilena, clientes en todo Chile</span>
          </div>
        </div>
      </section>

      {/* Planes */}
      <section id="planes" className="nh-block nh-block-pegado">
        <div className="nh-wrap">
          {/* Producto base primero: es el precio de entrada ($150.000). */}
          <PlanBaseCard placement="precios" />
          <PlanesGrid placement="precios" detalle="todo" />
          <p className="nh-sub nh-nota">{NOTA_PRECIOS}</p>
        </div>
      </section>

      {/* Ayuda para elegir */}
      <section id="cual" className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">¿Cuál me conviene?</div>
          <h2>Elige por lo que haces, no por la tecnología.</h2>
          <div className="nh-guia">
            {GUIA.map((g) => (
              <a key={g.plan} href={`#${g.plan}`} className="nh-guia-fila">
                <span>{g.si}</span>
                <b><Check aria-hidden="true" />{g.nombre} · {precio(g.plan)}</b>
              </a>
            ))}
          </div>
          <p className="nh-sub">
            ¿No calzas en ninguna?{' '}
            <IrACotizar servicio="otro" placement="precios_guia" className="nh-service-more">Cuéntanos y te recomendamos el plan justo →</IrACotizar>
          </p>
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

      <QuienesSomos />

      {/* Preguntas frecuentes */}
      <section id="faq" className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">Preguntas frecuentes</div>
          <h2>Lo que nos preguntan sobre precios.</h2>
          <div className="nh-faq">
            {FAQ_PRECIOS.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}<span aria-hidden="true">+</span></summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <ContactoSeccion placement="precios" titulo="¿No sabes cuál elegir? Te recomendamos el plan justo." />
    </div>
  );
}
