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
    q: '¿Qué pasa después de crear mi maqueta?',
    a: 'Queda publicada 5 días en tu link nexcommit.com/tu-empresa para que la veas y la compartas. Si quieres seguir, nuestro equipo toma esa maqueta como base y la convierte en tu página definitiva: diseño a medida, tu propio dominio y todo lo que necesites.',
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
            <h1>Vive la experiencia NexCommit y mira cómo sería <em>tu página web</em>.</h1>
            <p className="nh-lead">
              Cuéntanos de tu negocio y en 2 minutos armamos con IA una maqueta de tu sitio, publicada en
              {' '}<b style={{ color: '#fff', whiteSpace: 'nowrap' }}>nexcommit.com/tu-empresa</b>. Es tu punto de partida: si te gusta,
              nuestro equipo la convierte en tu página definitiva, con tu dominio y todo lo que tu negocio necesite.
            </p>
            <ul className="ctw-lista">
              <li><Check aria-hidden="true" /> Una maqueta real de tu página, lista para ver y compartir</li>
              <li><Check aria-hidden="true" /> Textos, colores y fotos pensados para tu rubro</li>
              <li><Check aria-hidden="true" /> Ajústala por chat y mira los cambios al instante</li>
              <li><Check aria-hidden="true" /> Si quieres seguir, nuestro equipo avanza contigo desde ahí</li>
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
