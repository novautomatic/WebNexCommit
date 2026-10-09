import React from 'react';
import { Check, Gift } from 'lucide-react';
import SEO from '../components/SEO';
import Creador from './creador/Creador';
import { WhatsAppLink } from '../components/ContactButtons';
import './home.css';
import './creador/creador.css';

const FAQS = [
  {
    q: '¿De verdad es gratis?',
    a: 'Sí. La página de prueba no cuesta nada y no pedimos tarjeta. Es nuestra forma de mostrarte lo que podemos hacer por tu negocio.',
  },
  {
    q: '¿Cuánto dura mi página?',
    a: 'La página de prueba queda publicada 5 días en tu link nexcommit.com/tu-empresa. Si te gusta, te ayudamos a dejarla permanente, con tu propio dominio y todo lo que necesites.',
  },
  {
    q: '¿Puedo hacerle cambios?',
    a: 'Sí. Después de crearla tienes un chat con el asistente para pedirle ajustes: cambiar textos, colores, servicios o datos de contacto.',
  },
  {
    q: '¿Por qué solo una página por persona?',
    a: 'Cada página usa recursos reales (inteligencia artificial, fotos y hosting). Para que alcance para todos, es una página de prueba por correo y por celular.',
  },
  {
    q: '¿Qué pasa con mis datos?',
    a: 'Los usamos para crear tu página y contactarte sobre ella. Las ofertas de NexCommit solo te llegan si marcas la casilla. Puedes pedir acceso, corrección o eliminación cuando quieras; el detalle está en la política de privacidad.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};

export default function CreaTuWeb() {
  return (
    <div className="nh">
      <SEO
        title="Crea tu página web gratis con IA en 2 minutos | NexCommit"
        description="Crea gratis la página web de tu negocio con inteligencia artificial. Cuéntanos qué haces, elige tu link nexcommit.com/tu-empresa y publícala en minutos."
        keywords="crear página web gratis, página web con IA, crear sitio web gratis Chile, página web para mi negocio, creador de páginas web"
        canonicalUrl="https://www.nexcommit.com/crea-tu-web"
        jsonLd={[faqJsonLd]}
      />

      <section className="ctw-hero">
        <div className="nh-wrap ctw-grid">
          <div>
            <div className="ctw-badge"><Gift aria-hidden="true" /> Gratis · sin tarjeta</div>
            <h1>Tu página web, creada con IA en <em>2 minutos</em>.</h1>
            <p className="nh-lead">
              Cuéntanos qué hace tu negocio y nuestro asistente escribe los textos, elige los colores y busca fotos
              de tu rubro. Te queda publicada en tu propio link: <b style={{ color: '#fff' }}>nexcommit.com/tu-empresa</b>.
            </p>
            <ul className="ctw-lista">
              <li><Check aria-hidden="true" /> Textos profesionales escritos para tu negocio</li>
              <li><Check aria-hidden="true" /> Botón de WhatsApp y formulario de contacto que te llega al correo</li>
              <li><Check aria-hidden="true" /> Tu logo, tus colores y fotos de tu rubro</li>
              <li><Check aria-hidden="true" /> Chat para pedir cambios después de crearla</li>
            </ul>
          </div>
          <Creador />
        </div>
      </section>

      <section className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">Cómo funciona</div>
          <h2>Tres pasos y tu negocio está en internet.</h2>
          <div className="ctw-pasos">
            <div className="ctw-paso">
              <b>PASO 01</b>
              <h3>Déjanos tus datos</h3>
              <p>Nombre, empresa, correo y celular. Te mandamos un código al correo para confirmar que eres tú.</p>
            </div>
            <div className="ctw-paso">
              <b>PASO 02</b>
              <h3>Cuéntanos de tu negocio</h3>
              <p>Qué haces, qué ofreces y cómo te contactan. Elige tu link y sube tu logo si tienes.</p>
            </div>
            <div className="ctw-paso">
              <b>PASO 03</b>
              <h3>Publícala y compártela</h3>
              <p>La IA arma tu página en segundos. Ajústala por chat y compártela por WhatsApp o redes.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="nh-block">
        <div className="nh-wrap">
          <div className="nh-kicker">Preguntas frecuentes</div>
          <h2>Lo que nos preguntan antes de crear su página.</h2>
          <div className="ctw-faq">
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <div className="nh-ctas">
            <a className="nh-btn cr-btn" style={{ width: 'auto' }} href="#creador">Crear mi página gratis</a>
            <WhatsAppLink topic="una página web" placement="crea_tu_web" className="nh-btn nh-btn-ghost">
              Prefiero hablar con alguien
            </WhatsAppLink>
          </div>
        </div>
      </section>
    </div>
  );
}
