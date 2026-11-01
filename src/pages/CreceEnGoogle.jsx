// /crece_en_google: servicio de gestión del perfil de empresa en Google (Maps + reseñas).
// Página corta y visual: mapa con el negocio primero, antes/después, 4 datos, 3 pasos,
// planes y WhatsApp. Usa las piezas nh-* de home.css + crece-google.css (prefijo cg-).
// Contenido y precios en src/data/CRECE_GOOGLE.js.
import { useEffect, useState } from 'react';
import { MessageCircle, Search, MapPinCheck, Star } from 'lucide-react';
import SEO from '../components/SEO';
import { WhatsAppLink } from '../components/ContactButtons';
import { PHONE_DISPLAY } from '../config/contact';
import { BUSQUEDAS, DATOS_RESENAS, FAQ_GOOGLE, FUENTE_DATOS, PLANES_GOOGLE } from '../data/CRECE_GOOGLE';
import './home.css';
import './crece-google.css';

const clp = (n) => '$' + n.toLocaleString('es-CL');
const URL = 'https://www.nexcommit.com/crece_en_google';
const TEMA = 'la gestión de mi perfil de Google (auditoría gratis)';

function BusquedaRotativa() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % BUSQUEDAS.length), 2600);
    return () => clearInterval(id);
  }, []);
  return <span className="cg-q">{BUSQUEDAS[i]}</span>;
}

function MapaResultados() {
  return (
    <div className="cg-mapa" role="img" aria-label="Ejemplo: tu negocio aparece primero en el mapa">
      <div className="cg-barra">
        <Search aria-hidden="true" />
        <BusquedaRotativa />
      </div>
      <svg className="cg-svg" viewBox="0 0 400 170" aria-hidden="true">
        <rect width="400" height="170" fill="#0d2a47" />
        <path d="M250 0 C 300 30, 330 60, 400 70 L400 0 Z" fill="#12395a" />
        <ellipse cx="70" cy="140" rx="60" ry="30" fill="#12395a" />
        <g stroke="#173e63" strokeWidth="10" fill="none" strokeLinecap="round">
          <path d="M-10 55 L410 38" /><path d="M-10 118 L410 104" /><path d="M90 -10 L118 180" />
          <path d="M230 -10 L248 180" /><path d="M330 -10 L344 180" />
        </g>
        <g fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600" textAnchor="middle">
          <g transform="translate(300 50)"><circle r="12" fill="#3d5a78" /><text y="4" fill="#cfe0f0">3</text></g>
          <g transform="translate(110 86)"><circle r="12" fill="#3d5a78" /><text y="4" fill="#cfe0f0">2</text></g>
          <g transform="translate(205 108)"><path d="M0 18 L-14 -2 A17 17 0 1 1 14 -2 Z" fill="#248bde" /><text y="-4" fill="#fff" fontSize="12">1</text></g>
        </g>
      </svg>
      <ol className="cg-res">
        <li className="tu"><span className="n">1</span><div><b>Tu negocio</b><small><i>★★★★★</i> 4,8 · 126 reseñas</small></div><span className="tag">Llamar</span></li>
        <li><span className="n">2</span><div><b>Competidor A</b><small><i>★★★★</i> 4,3 · 41 reseñas</small></div><span className="tag">Ruta</span></li>
        <li><span className="n">3</span><div><b>Competidor B</b><small><i>★★★★</i> 3,9 · 12 reseñas</small></div><span className="tag">Sitio</span></li>
      </ol>
    </div>
  );
}

function Perfil({ tipo }) {
  const bueno = tipo === 'bueno';
  return (
    <div className={`cg-perfil ${bueno ? 'bueno' : 'malo'}`}>
      <span className="cg-etq">{bueno ? 'Perfil gestionado' : 'Perfil abandonado'}</span>
      <div className="cg-biz">
        <b>Ferretería X</b>
        <span><i>{bueno ? '★★★★★' : '★★★'}</i> {bueno ? '4,8 · 126 reseñas' : '3,6 · 9 reseñas'}</span>
      </div>
      <div className="cg-fotos" aria-hidden="true"><span /><span /><span /><span /></div>
      <ul className="cg-ticks">
        {(bueno
          ? ['Fotos reales del local', 'Abierto ahora · horario al día', 'Responde cada reseña']
          : ['Sin fotos', 'Horario equivocado', 'Reseñas sin responder']
        ).map((t) => <li key={t}>{t}</li>)}
      </ul>
    </div>
  );
}

const PASOS = [
  { icono: <Search aria-hidden="true" />, cuando: 'Gratis · 48 h', titulo: '1. Auditoría', texto: 'Te mostramos dónde apareces frente a 3 competidores.' },
  { icono: <MapPinCheck aria-hidden="true" />, cuando: 'Semanas 1 a 3', titulo: '2. Perfil al 100%', texto: 'Lo creamos o lo arreglamos, con fotos, horarios y servicios.' },
  { icono: <Star aria-hidden="true" />, cuando: 'Cada mes', titulo: '3. Reseñas y publicaciones', texto: 'Conseguimos reseñas, respondemos todas y te enviamos un informe.' },
];

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Gestión de perfil de empresa en Google',
    provider: { '@type': 'Organization', name: 'NexCommit', url: 'https://www.nexcommit.com' },
    areaServed: 'Santiago, Chile',
    url: URL,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_GOOGLE.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  },
];

export default function CreceEnGoogle() {
  return (
    <div className="nh cg">
      <SEO
        title="Aparece primero en Google Maps | NexCommit"
        description="Gestionamos tu perfil de empresa en Google y tus reseñas para que te encuentren primero en el mapa. Auditoría gratis en 48 horas. Santiago, Chile."
        keywords="perfil de empresa google, google maps negocio, reseñas google, aparecer en google maps, seo local santiago"
        canonicalUrl={URL}
        jsonLd={jsonLd}
      />

      <section className="nh-hero">
        <div className="nh-wrap nh-hero-grid">
          <div>
            <div className="nh-kicker">Perfil de empresa en Google · Santiago</div>
            <h1>Que te encuentren <em>primero</em> en Google Maps</h1>
            <p className="nh-lead">Nos hacemos cargo de tu perfil y tus reseñas. Tú atiendes a los clientes nuevos.</p>
            <div className="nh-ctas">
              <WhatsAppLink topic={TEMA} placement="crece_google_hero" className="nh-btn nh-btn-wa">
                <MessageCircle aria-hidden="true" /> Ver dónde aparezco hoy · gratis
              </WhatsAppLink>
            </div>
            <p className="nh-hero-mini">Te respondemos en 48 horas por WhatsApp.</p>
          </div>
          <MapaResultados />
        </div>
      </section>

      <section className="nh-block">
        <div className="nh-wrap">
          <h2 className="cg-centro">¿A cuál llamarías tú?</h2>
          <div className="cg-vs">
            <Perfil tipo="malo" />
            <div className="cg-flecha" aria-hidden="true">→</div>
            <Perfil tipo="bueno" />
          </div>
          <p className="cg-nota-vs">El mismo negocio. Solo cambia cómo se ve en Google.</p>
        </div>
      </section>

      <section className="nh-block">
        <div className="nh-wrap">
          <h2 className="cg-centro">Lo que hacen tus clientes antes de llamarte</h2>
          <div className="cg-datos">
            {DATOS_RESENAS.map((d) => (
              <div key={d.valor} className="cg-dato"><b>{d.valor}</b><span>{d.texto}</span></div>
            ))}
          </div>
          <p className="cg-fuente">
            Fuente: <a href={FUENTE_DATOS} target="_blank" rel="noopener noreferrer">BrightLocal, Local Consumer Review Survey 2026</a> (consumidores de EE.UU.).
          </p>
        </div>
      </section>

      <section className="nh-block">
        <div className="nh-wrap">
          <h2 className="cg-centro">Así de simple</h2>
          <div className="cg-pasos">
            {PASOS.map(({ icono, cuando, titulo, texto }) => (
              <div key={titulo} className="cg-paso">
                <div className="cg-icono">{icono}</div>
                <span className="cg-cuando">{cuando}</span>
                <h3>{titulo}</h3>
                <p>{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planes" className="nh-block">
        <div className="nh-wrap">
          <h2 className="cg-centro">Planes</h2>
          <p className="cg-sub">Valores mensuales + IVA, por local</p>
          <div className="cg-planes">
            {PLANES_GOOGLE.map((p) => (
              <article key={p.slug} className={`cg-plan${p.destacado ? ' pick' : ''}`}>
                {p.destacado && <span className="cg-badge">Más elegido</span>}
                <h3>{p.nombre}</h3>
                <div className="cg-precio"><b>{clp(p.mensual)}</b><span>+ implementación {clp(p.implementacion)}</span></div>
                <ul>{p.incluye.map((x) => <li key={x}>{x}</li>)}</ul>
                <WhatsAppLink
                  topic={`el plan ${p.nombre} de Google Maps`}
                  placement={`crece_google_plan_${p.slug}`}
                  className={`nh-btn ${p.destacado ? 'nh-btn-wa' : 'nh-btn-ghost'}`}
                >
                  Elegir
                </WhatsAppLink>
              </article>
            ))}
          </div>
          <p className="cg-sub">Mínimo 3 meses. Después, mes a mes.</p>
        </div>
      </section>

      <section className="nh-block">
        <div className="nh-wrap">
          <h2 className="cg-centro">Sin trucos</h2>
          <div className="cg-pills">
            {['Solo reseñas reales', 'El perfil sigue siendo tuyo', 'Informe cada mes', 'Sin contrato anual'].map((t) => (
              <span key={t} className="cg-pill">{t}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="nh-block">
        <div className="nh-wrap">
          <h2 className="cg-centro">Preguntas</h2>
          <div className="nh-faq cg-faq">
            {FAQ_GOOGLE.map((f) => (
              <details key={f.question}>
                <summary>{f.question}<span aria-hidden="true">+</span></summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="nh-final">
        <div className="nh-wrap">
          <h2>¿Dónde apareces hoy?</h2>
          <p>Mándanos el nombre de tu negocio y te lo mostramos gratis.</p>
          <div className="nh-ctas">
            <WhatsAppLink topic={TEMA} placement="crece_google_final" className="nh-btn nh-btn-wa">
              <MessageCircle aria-hidden="true" /> Escribir por WhatsApp
            </WhatsAppLink>
          </div>
          <p className="nh-phone">{PHONE_DISPLAY}</p>
          <p className="cg-legal">No afiliado a Google. Google Maps es marca de Google LLC.</p>
        </div>
      </section>
    </div>
  );
}
