// Piezas de conversión de las páginas públicas (estilos en contacto.css):
//   <ContactoSeccion>  sección #contacto con el formulario «Cotiza en 1 minuto»
//   <IrACotizar>       botón/enlace que baja al formulario (y elige el servicio)
//   <CtaFranja>        franja de CTA a mitad de página
//   <PlanesGrid>       tarjetas de precio (src/data/PRECIOS.js)
//   <PlanBaseCard>     producto base: página hecha con IA, publicada por $150.000
// Se prerenderizan: window solo dentro de efectos y manejadores.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, ClipboardList, Loader2, MessageCircle, Phone, Sparkles } from 'lucide-react';
import { WhatsAppLink, CallLink } from './ContactButtons';
import Turnstile from './Turnstile';
import { CONTACTO_API, PHONE_DISPLAY, trackForm, vinoDeAds } from '../config/contact';
import { TURNSTILE_SITE_KEY } from '../config/creador';
import { RESPONSABLE } from '../config/legal';
import { PLAN_BASE, PLANES, SERVICIOS_FORM } from '../data/PRECIOS';
import './contacto.css';

const clp = (n) => '$' + n.toLocaleString('es-CL');
const EVENTO = 'nc:cotizar';

/**
 * Lleva al formulario de la página (si hay uno) y lo deja con `servicio`
 * elegido; si la página no tiene formulario, abre el de la home.
 */
export function IrACotizar({ servicio, placement, className = 'cx-btn cx-btn-brand', children }) {
  const navigate = useNavigate();
  const ir = (e) => {
    e.preventDefault();
    if (typeof window.gtag === 'function') window.gtag('event', 'cta_click', { placement, destino: 'formulario' });
    const destino = document.getElementById('contacto');
    if (!destino) {
      navigate('/#contacto');
      return;
    }
    destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: { servicio } }));
  };
  return (
    <a href="#contacto" className={className} onClick={ir} data-tracked="1">
      {children}
    </a>
  );
}

const VACIO = { nombre: '', email: '', telefono: '', servicio: '', mensaje: '', sitio: '' };

export function ContactoForm({ servicio = '', placement }) {
  const [f, setF] = useState({ ...VACIO, servicio });
  const [captcha, setCaptcha] = useState('');
  const [version, setVersion] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const primero = useRef(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    const alPedir = (e) => {
      if (e.detail?.servicio) setF((p) => ({ ...p, servicio: e.detail.servicio }));
      setListo(false);
      setTimeout(() => primero.current?.focus({ preventScroll: true }), 450);
    };
    window.addEventListener(EVENTO, alPedir);
    return () => window.removeEventListener(EVENTO, alPedir);
  }, []);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (f.nombre.trim().length < 2) return setError('Escribe tu nombre.');
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(f.email.trim())) return setError('Revisa tu correo: parece que tiene un error.');
    if (TURNSTILE_SITE_KEY && !captcha) return setError('Marca la casilla «Verifica que eres humano».');
    setEnviando(true);
    try {
      const r = await fetch(CONTACTO_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f,
          servicio: f.servicio || 'otro',
          captcha,
          pagina: window.location.pathname,
          desde_ads: vinoDeAds(),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No pudimos enviar tu solicitud. Escríbenos por WhatsApp.');
      trackForm(f.servicio || 'otro', placement);
      setListo(true);
      setF({ ...VACIO, servicio: f.servicio });
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Sin conexión. Revisa tu internet o escríbenos por WhatsApp.' : err.message);
      setCaptcha('');
      setVersion((v) => v + 1);
    } finally {
      setEnviando(false);
    }
    return undefined;
  };

  if (listo) {
    return (
      <div className="cx-form" role="status">
        <div className="cx-ok">
          <span className="cx-ok-ic"><CheckCircle2 aria-hidden="true" /></span>
          <h3>¡Listo! Recibimos tu solicitud</h3>
          <p>Te respondemos el mismo día hábil. Te mandamos una copia a tu correo.</p>
          <div className="cx-btns" style={{ justifyContent: 'center' }}>
            <WhatsAppLink topic="una página web" placement={`${placement}_post_form`} className="cx-btn cx-btn-wa">
              <MessageCircle aria-hidden="true" /> ¿Te urge? WhatsApp
            </WhatsAppLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="cx-form" onSubmit={enviar} noValidate>
      <h3>Cotiza en 1 minuto</h3>
      <p className="cx-mini">Déjanos tus datos y te enviamos precio y plazo el mismo día hábil.</p>
      <div className="cx-campos">
        <label><span>Nombre</span><input ref={primero} value={f.nombre} onChange={set('nombre')} maxLength={80} autoComplete="name" required /></label>
        <label><span>Correo</span><input type="email" value={f.email} onChange={set('email')} maxLength={120} autoComplete="email" required /></label>
        <label><span>WhatsApp <em>(opcional)</em></span><input type="tel" value={f.telefono} onChange={set('telefono')} maxLength={20} inputMode="tel" placeholder="9 1234 5678" autoComplete="tel" /></label>
        <label><span>¿Qué necesitas?</span>
          <select value={f.servicio} onChange={set('servicio')}>
            <option value="">Elige una opción</option>
            {SERVICIOS_FORM.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <label><span>Cuéntanos de tu negocio <em>(opcional)</em></span>
        <textarea value={f.mensaje} onChange={set('mensaje')} maxLength={1000} rows={3}
          placeholder="Ej: tengo una pastelería en Concepción y quiero vender por internet." />
      </label>
      {/* Honeypot: invisible para personas. */}
      <label className="cx-trampa" aria-hidden="true">Sitio<input tabIndex={-1} autoComplete="off" value={f.sitio} onChange={set('sitio')} /></label>
      <Turnstile onToken={setCaptcha} version={version} className="cx-captcha" />
      {error && <p className="cx-error" role="alert">{error}</p>}
      <button type="submit" className="cx-btn cx-btn-brand" disabled={enviando}>
        {enviando ? <Loader2 className="cx-gira" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        {enviando ? 'Enviando…' : 'Quiero mi cotización'}
      </button>
      <p className="cx-info">
        Usamos tus datos solo para responderte y preparar tu cotización, nunca para publicidad. Los guardamos hasta 12 meses
        con nuestros proveedores de hosting y correo (Supabase, Vercel y Google). No incluyas datos de salud ni de otras personas.
        Puedes pedir verlos, corregirlos o borrarlos escribiendo a {RESPONSABLE.correo}. Detalle en la <Link to="/privacy">política de privacidad</Link>.
      </p>
    </form>
  );
}

/** Sección completa con id="contacto" (destino de todos los botones «Cotizar»). */
export function ContactoSeccion({
  placement,
  topic = 'una página web',
  titulo = '¿Cuánto cuesta lo que necesitas? Te respondemos hoy.',
  servicio = '',
}) {
  return (
    <section id="contacto" className="cx cx-seccion">
      <div className="cx-wrap cx-grid">
        <div>
          <div className="cx-kicker">Cotiza sin compromiso</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>{titulo}</h2>
          <p className="cx-sub">Elige cómo prefieres hablar: deja tus datos en el formulario o escríbenos directo.</p>
          <ul className="cx-lista">
            <li><Check aria-hidden="true" />Precio y plazo cerrados, por escrito, antes de partir</li>
            <li><Check aria-hidden="true" />Respuesta el mismo día hábil, sin llamadas de venta insistentes</li>
            <li><Check aria-hidden="true" />Planes desde {clp(PLAN_BASE.precio)} + IVA</li>
          </ul>
          <div className="cx-alt">
            <p>¿Prefieres conversarlo?</p>
            <div className="cx-btns">
              <WhatsAppLink topic={topic} placement={`${placement}_contacto`} className="cx-btn cx-btn-wa">
                <MessageCircle aria-hidden="true" /> WhatsApp
              </WhatsAppLink>
              <CallLink placement={`${placement}_contacto`} className="cx-btn cx-btn-ghost">
                <Phone aria-hidden="true" /> {PHONE_DISPLAY}
              </CallLink>
            </div>
          </div>
        </div>
        <ContactoForm servicio={servicio} placement={placement} />
      </div>
    </section>
  );
}

/** Franja de CTA para poner entre secciones. */
export function CtaFranja({
  placement,
  topic = 'una página web',
  servicio = '',
  titulo = '¿Te hace sentido? Cotiza en 1 minuto.',
  texto = 'Te enviamos precio y plazo el mismo día hábil, sin compromiso.',
  conPrecios = true,
}) {
  return (
    <div className="cx">
      <div className="cx-franja">
        <div>
          <h3>{titulo}</h3>
          <p>{texto}</p>
        </div>
        <div className="cx-btns">
          <IrACotizar servicio={servicio} placement={`${placement}_franja`}>
            <ClipboardList aria-hidden="true" /> Cotizar ahora
          </IrACotizar>
          <WhatsAppLink topic={topic} placement={`${placement}_franja`} className="cx-btn cx-btn-wa">
            <MessageCircle aria-hidden="true" /> WhatsApp
          </WhatsAppLink>
          {conPrecios && <Link to="/precios" className="cx-btn cx-btn-ghost">Ver precios</Link>}
        </div>
      </div>
    </div>
  );
}

/** Tarjetas de precio. `slugs` elige y ordena los planes (por defecto, todos). */
export function PlanesGrid({ placement, slugs, detalle = true }) {
  const planes = slugs ? slugs.map((s) => PLANES.find((p) => p.slug === s)).filter(Boolean) : PLANES;
  return (
    <div className="cx">
      <div className="cx-planes" style={planes.length < 4 ? { gridTemplateColumns: `repeat(${planes.length}, minmax(0, 1fr))` } : undefined}>
        {planes.map((p) => (
          <article key={p.slug} className="cx-plan">
            <h3>{p.nombre}</h3>
            <p className="cx-para">{p.para}</p>
            <div className="cx-precio"><b>{clp(p.precio)}</b> <span>+ IVA</span></div>
            <p className="cx-plazo">Plazo: {p.plazo}</p>
            {detalle && (
              <ul>
                {p.incluye.slice(0, 4).map((i) => <li key={i}><Check aria-hidden="true" />{i}</li>)}
              </ul>
            )}
            <div className="cx-btns">
              <IrACotizar servicio={p.slug} placement={`${placement}_plan_${p.slug}`}>Cotizar</IrACotizar>
              <WhatsAppLink topic={p.topic} placement={`${placement}_plan_${p.slug}`} className="cx-btn cx-btn-ghost" aria-label={`Cotizar ${p.nombre} por WhatsApp`}>
                <MessageCircle aria-hidden="true" /> WhatsApp
              </WhatsAppLink>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/** Producto base: la persona crea su página gratis con IA y la publicamos por $150.000 + IVA. */
export function PlanBaseCard({ placement }) {
  const p = PLAN_BASE;
  return (
    <div className="cx">
      <article className="cx-base" id={p.slug}>
        <div>
          <span className="cx-base-tag"><Sparkles aria-hidden="true" /> ¿Prefieres hacerla tú?</span>
          <h3>{p.nombre}: {clp(p.precio)} <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--cx-muted)' }}>+ IVA · 1 año incluido</span></h3>
          <p className="cx-para">
            Crea tu página gratis con nuestra IA en 2 minutos. Si te gusta, la publicamos tal como la dejaste, en tu link
            de NexCommit o en tu propio dominio, y la sigues editando tú con el editor visual.
          </p>
          <div className="cx-btns">
            <Link to="/crea-tu-web" className="cx-btn cx-btn-wa" data-placement={`${placement}_base_crear`}>
              <Sparkles aria-hidden="true" /> Crear mi página gratis
            </Link>
            <IrACotizar servicio={p.slug} placement={`${placement}_base`} className="cx-btn cx-btn-ghost">
              Tengo dudas, cotizar
            </IrACotizar>
          </div>
        </div>
        <ul>
          {p.incluye.map((i) => <li key={i}><Check aria-hidden="true" />{i}</li>)}
        </ul>
      </article>
    </div>
  );
}
