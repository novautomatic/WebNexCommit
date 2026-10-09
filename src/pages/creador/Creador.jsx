// Asistente del Creador de páginas: registro → código → formulario → página + chat.
// Se prerenderiza (paso "registro"): nada de window/localStorage durante el render.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Check, Copy, ExternalLink, ImagePlus, Loader2, Lock, MessageCircle, RefreshCw, Send, Sparkles, Trash2, X,
} from 'lucide-react';
import {
  api, ESTILOS, guardarToken, leerToken, TURNSTILE_SITE_KEY, urlVistaPrevia, SITIO,
} from '../../config/creador';
import { WHATSAPP_NUMBER } from '../../config/contact';

const MAX_LOGO = 500 * 1024;
const TIPOS_LOGO = ['image/png', 'image/jpeg', 'image/webp'];

function slugificar(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

function restante(expira) {
  const ms = new Date(expira).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  if (d >= 2) return `${d} días`;
  if (d === 1) return h % 24 ? `1 día y ${h % 24} h` : '1 día';
  if (h >= 1) return `${h} h`;
  return `${Math.max(1, Math.ceil(ms / 60000))} min`;
}

function evento(nombre, params = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') window.gtag('event', nombre, params);
}

const waNexcommit = (texto) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;

// ─── Captcha (Cloudflare Turnstile) ─────────────────────────────────────────
let cargaTurnstile;
function cargarTurnstile() {
  if (!cargaTurnstile) {
    cargaTurnstile = new Promise((resolve, reject) => {
      if (window.turnstile) return resolve(window.turnstile);
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => {
        cargaTurnstile = null;
        reject(new Error('captcha'));
      };
      document.head.appendChild(s);
    });
  }
  return cargaTurnstile;
}

function Captcha({ onToken, version }) {
  const ref = useRef(null);
  const cb = useRef(onToken);
  useEffect(() => {
    cb.current = onToken;
  });

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return undefined;
    let id;
    let vivo = true;
    cargarTurnstile()
      .then((ts) => {
        if (!vivo || !ref.current) return;
        id = ts.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          language: 'es',
          callback: (t) => cb.current(t),
          'expired-callback': () => cb.current(''),
          'error-callback': () => cb.current(''),
        });
      })
      .catch(() => cb.current(''));
    return () => {
      vivo = false;
      if (id !== undefined && window.turnstile) window.turnstile.remove(id);
    };
  }, [version]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className="cr-captcha" />;
}

function Aviso({ error, tipo = 'error' }) {
  if (!error) return null;
  return <div className={`cr-aviso ${tipo}`} role="alert">{error}</div>;
}

function Contador({ valor, max }) {
  return <span className={`cr-cont ${valor.length > max * 0.9 ? 'casi' : ''}`}>{valor.length}/{max}</span>;
}

// ─── Paso 1: registro ───────────────────────────────────────────────────────
function PasoRegistro({ inicial, onListo }) {
  const [f, setF] = useState(inicial);
  const [captcha, setCaptcha] = useState('');
  const [version, setVersion] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.acepta_terminos) return setError('Para continuar acepta los términos y la política de privacidad.');
    if (TURNSTILE_SITE_KEY && !captcha) return setError('Confirma que eres una persona (casilla de verificación).');
    setEnviando(true);
    try {
      const r = await api('/registro', { metodo: 'POST', cuerpo: { ...f, captcha } });
      evento('creador_registro', { reingreso: r.reingreso });
      onListo(f, r.reingreso);
    } catch (err) {
      setError(err.message);
      setCaptcha('');
      setVersion((v) => v + 1);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="cr-form" onSubmit={enviar} noValidate>
      <div className="cr-paso-tit">
        <span className="cr-num">1</span>
        <div><h3>Tus datos</h3><p>Te enviaremos un código a tu correo para continuar.</p></div>
      </div>
      <div className="cr-grid2">
        <label>Tu nombre<input value={f.nombre} onChange={set('nombre')} required maxLength={80} autoComplete="name" /></label>
        <label>Empresa o emprendimiento<input value={f.empresa} onChange={set('empresa')} required maxLength={80} autoComplete="organization" /></label>
        <label>Correo<input type="email" value={f.email} onChange={set('email')} required maxLength={120} autoComplete="email" /></label>
        <label>Celular<input type="tel" value={f.telefono} onChange={set('telefono')} required maxLength={20} placeholder="9 1234 5678" autoComplete="tel" /></label>
      </div>

      <p className="cr-info">
        Usamos estos datos para crear tu página de prueba, enviarte el código y contactarte <b>sobre tu página</b>
        (por ejemplo, para ofrecerte dejarla permanente). Solo una página de prueba por correo y por celular.
        Más detalle en la <Link to="/privacy">política de privacidad</Link>.
      </p>

      <label className="cr-check">
        <input type="checkbox" checked={f.acepta_terminos} onChange={set('acepta_terminos')} />
        <span>Acepto los <Link to="/terms">términos</Link> y la <Link to="/privacy">política de privacidad</Link>. <em>(obligatorio)</em></span>
      </label>
      <label className="cr-check">
        <input type="checkbox" checked={f.acepta_marketing} onChange={set('acepta_marketing')} />
        <span>Quiero recibir novedades y ofertas de NexCommit. <em>(opcional, puedes darte de baja cuando quieras)</em></span>
      </label>

      <Captcha onToken={setCaptcha} version={version} />
      <Aviso error={error} />
      <button className="nh-btn cr-btn" type="submit" disabled={enviando}>
        {enviando ? <Loader2 className="cr-gira" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        {enviando ? 'Enviando código…' : 'Recibir mi código'}
      </button>
    </form>
  );
}

// ─── Paso 2: código ─────────────────────────────────────────────────────────
function PasoCodigo({ email, reingreso, onListo, onVolver }) {
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const verificar = useCallback(async (valor) => {
    setEnviando(true);
    setError('');
    try {
      const r = await api('/verificar', { metodo: 'POST', cuerpo: { email, codigo: valor } });
      onListo(r.token);
    } catch (err) {
      setError(err.message);
      setCodigo('');
    } finally {
      setEnviando(false);
    }
  }, [email, onListo]);

  const cambiar = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCodigo(v);
    if (v.length === 6 && !enviando) verificar(v);
  };

  return (
    <form className="cr-form" onSubmit={(e) => { e.preventDefault(); if (codigo.length === 6) verificar(codigo); }}>
      <div className="cr-paso-tit">
        <span className="cr-num">2</span>
        <div>
          <h3>{reingreso ? 'Bienvenido de vuelta' : 'Revisa tu correo'}</h3>
          <p>Enviamos un código de 6 dígitos a <b>{email}</b>. Vence en 10 minutos.</p>
        </div>
      </div>
      <input
        className="cr-codigo"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={codigo}
        onChange={cambiar}
        placeholder="••••••"
        aria-label="Código de 6 dígitos"
        autoFocus
      />
      <Aviso error={error} />
      <button className="nh-btn cr-btn" type="submit" disabled={enviando || codigo.length !== 6}>
        {enviando ? <Loader2 className="cr-gira" aria-hidden="true" /> : <Lock aria-hidden="true" />}
        {enviando ? 'Verificando…' : 'Verificar'}
      </button>
      <p className="cr-info">¿No llegó? Revisa la carpeta de spam o <button type="button" className="cr-link" onClick={onVolver}>vuelve atrás para reenviarlo</button>.</p>
    </form>
  );
}

// ─── Paso 3: formulario ─────────────────────────────────────────────────────
function SelectorSlug({ valor, onCambio, ciudad, rubro, onEstado }) {
  const [estado, setEstado] = useState({ tipo: 'vacio' });

  useEffect(() => {
    const slug = slugificar(valor);
    if (slug.length < 3) {
      setEstado({ tipo: 'invalido', motivo: 'Mínimo 3 letras o números.' });
      onEstado(false);
      return undefined;
    }
    setEstado({ tipo: 'revisando' });
    onEstado(false);
    const t = setTimeout(async () => {
      try {
        const q = new URLSearchParams({ valor: slug, ciudad, rubro });
        const r = await api(`/slug?${q}`);
        setEstado(r.disponible ? { tipo: 'libre' } : { tipo: 'tomado', motivo: r.motivo, sugerencias: r.sugerencias });
        onEstado(r.disponible);
      } catch {
        setEstado({ tipo: 'error', motivo: 'No pudimos revisar el link ahora.' });
      }
    }, 450);
    return () => clearTimeout(t);
    // ciudad/rubro solo mejoran las sugerencias: no vuelven a consultar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <div className="cr-slug">
      <label htmlFor="cr-slug">Tu link</label>
      <div className={`cr-slug-campo ${estado.tipo}`}>
        <span>nexcommit.com/</span>
        <input
          id="cr-slug"
          value={valor}
          onChange={(e) => onCambio(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40))}
          maxLength={40}
          autoComplete="off"
          spellCheck={false}
        />
        <i aria-hidden="true">
          {estado.tipo === 'libre' && <Check />}
          {estado.tipo === 'revisando' && <Loader2 className="cr-gira" />}
          {(estado.tipo === 'tomado' || estado.tipo === 'invalido') && <X />}
        </i>
      </div>
      <div className="cr-slug-msg" aria-live="polite">
        {estado.tipo === 'libre' && <span className="ok">¡Disponible!</span>}
        {estado.motivo && <span className="mal">{estado.motivo}</span>}
        {estado.sugerencias?.length > 0 && (
          <span className="cr-sugerencias">
            Prueba con:{' '}
            {estado.sugerencias.map((s) => (
              <button key={s} type="button" onClick={() => onCambio(s)}>{s}</button>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

function SubirLogo({ valor, onCambio, onError }) {
  const elegir = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!TIPOS_LOGO.includes(file.type)) return onError('El logo debe ser PNG, JPG o WEBP.');
    if (file.size > MAX_LOGO) return onError('El logo pesa más de 500 KB. Prueba con una versión más liviana.');
    const lector = new FileReader();
    lector.onload = () => onCambio(String(lector.result));
    lector.readAsDataURL(file);
    return undefined;
  };
  return (
    <div className="cr-logo">
      {valor ? (
        <>
          <img src={valor} alt="Vista previa del logo" />
          <button type="button" className="cr-link" onClick={() => onCambio('')}><Trash2 aria-hidden="true" /> Quitar</button>
        </>
      ) : (
        <label className="cr-logo-btn">
          <ImagePlus aria-hidden="true" />
          <span>Subir logo <em>(opcional · PNG, JPG o WEBP · máx. 500 KB)</em></span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={elegir} hidden />
        </label>
      )}
    </div>
  );
}

// ?slug=… llega desde la página "este link está disponible" del backend.
// Este paso nunca se prerenderiza (requiere sesión), así que leer la URL aquí es seguro.
function slugDeUrl() {
  try {
    return slugificar(new URLSearchParams(window.location.search).get('slug') || '');
  } catch {
    return '';
  }
}

function PasoFormulario({ lead, limites, onCreada }) {
  const [f, setF] = useState(() => ({
    slug: slugDeUrl() || slugificar(lead.empresa),
    rubro: '',
    descripcion: '',
    servicios: '',
    ciudad: '',
    estilo: '',
    colores: '',
    whatsapp: lead.telefono ? `+${lead.telefono}` : '',
    telefono: '',
    email_contacto: lead.email || '',
    instagram: '',
    direccion: '',
    horario: '',
    pedido: '',
    logo: '',
  }));
  const [slugOk, setSlugOk] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const max = limites?.max_caracteres || 300;

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!slugOk) return setError('Elige un link disponible para tu página.');
    if (!f.rubro.trim() || f.descripcion.trim().length < 10) return setError('Cuéntanos tu rubro y qué hace tu negocio (al menos una frase).');
    onCreada(f, setError);
    return undefined;
  };

  return (
    <form className="cr-form" onSubmit={enviar} noValidate>
      <div className="cr-paso-tit">
        <span className="cr-num">3</span>
        <div><h3>Cuéntanos de {lead.empresa}</h3><p>Mientras más claro, mejor queda. La IA escribe los textos, elige colores y busca fotos de tu rubro.</p></div>
      </div>

      <SelectorSlug valor={f.slug} onCambio={(v) => setF((p) => ({ ...p, slug: v }))} ciudad={f.ciudad} rubro={f.rubro} onEstado={setSlugOk} />

      <div className="cr-grid2">
        <label>Rubro<input value={f.rubro} onChange={set('rubro')} maxLength={80} placeholder="Cafetería, peluquería, gasfitería…" /></label>
        <label>Ciudad o comuna<input value={f.ciudad} onChange={set('ciudad')} maxLength={60} placeholder="Ej: Viña del Mar" /></label>
      </div>
      <label>¿Qué hace tu negocio? <Contador valor={f.descripcion} max={300} />
        <textarea value={f.descripcion} onChange={set('descripcion')} maxLength={300} rows={3} placeholder="Ej: Cafetería de especialidad con pastelería casera, desayunos y espacio para trabajar." />
      </label>
      <label>Servicios o productos principales <Contador valor={f.servicios} max={300} />
        <textarea value={f.servicios} onChange={set('servicios')} maxLength={300} rows={2} placeholder="Ej: café de grano, desayunos, tortas por encargo, catering para oficinas" />
      </label>
      <div className="cr-grid2">
        <label>Estilo
          <select value={f.estilo} onChange={set('estilo')}>
            {ESTILOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label>Colores <em>(opcional)</em><input value={f.colores} onChange={set('colores')} maxLength={60} placeholder="Ej: café y crema" /></label>
      </div>

      <fieldset className="cr-fieldset">
        <legend>Contacto que aparecerá en tu página</legend>
        <div className="cr-grid2">
          <label>WhatsApp<input value={f.whatsapp} onChange={set('whatsapp')} maxLength={20} inputMode="tel" /></label>
          <label>Correo<input value={f.email_contacto} onChange={set('email_contacto')} maxLength={120} type="email" /></label>
          <label>Instagram <em>(opcional)</em><input value={f.instagram} onChange={set('instagram')} maxLength={60} placeholder="@tunegocio" /></label>
          <label>Teléfono fijo <em>(opcional)</em><input value={f.telefono} onChange={set('telefono')} maxLength={20} inputMode="tel" /></label>
          <label>Dirección <em>(opcional)</em><input value={f.direccion} onChange={set('direccion')} maxLength={140} /></label>
          <label>Horario <em>(opcional)</em><input value={f.horario} onChange={set('horario')} maxLength={120} placeholder="Lun a vie 9:00 a 19:00" /></label>
        </div>
      </fieldset>

      <SubirLogo valor={f.logo} onCambio={(v) => setF((p) => ({ ...p, logo: v }))} onError={setError} />

      <label>Pídele algo especial a la IA <em>(opcional)</em> <Contador valor={f.pedido} max={max} />
        <textarea value={f.pedido} onChange={set('pedido')} maxLength={max} rows={3} placeholder="Ej: que se sienta acogedor, destacar que tenemos opciones veganas y que hacemos envíos." />
      </label>

      <Aviso error={error} />
      <button className="nh-btn cr-btn" type="submit">
        <Sparkles aria-hidden="true" /> Crear mi página
      </button>
      <p className="cr-info">Se crea una sola vez. Después tendrás un chat para hacerle ajustes.</p>
    </form>
  );
}

// ─── Paso 4: generando ──────────────────────────────────────────────────────
const FRASES = [
  'Leyendo lo que nos contaste…',
  'Escribiendo los textos de tu página…',
  'Eligiendo colores para tu marca…',
  'Buscando fotos de tu rubro…',
  'Armando tu link…',
  'Dando los últimos retoques…',
];

function PasoGenerando() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, FRASES.length - 1)), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="cr-generando" role="status" aria-live="polite">
      <div className="cr-orbe"><Sparkles aria-hidden="true" /></div>
      <h3>Creando tu página</h3>
      <p>{FRASES[i]}</p>
      <div className="cr-barra"><i style={{ width: `${((i + 1) / FRASES.length) * 100}%` }} /></div>
    </div>
  );
}

// ─── Paso 5: página + chat ──────────────────────────────────────────────────
function PasoPagina({ token, estado, onActualizar, onSalir }) {
  const { pagina, mensajes: iniciales, limites, lead } = estado;
  const [mensajes, setMensajes] = useState(iniciales);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const [quedan, setQuedan] = useState(() => restante(pagina.expira_at));
  const chatRef = useRef(null);
  const max = limites?.max_caracteres || 300;
  const disponibles = pagina.ediciones_max - pagina.ediciones_usadas;
  const activa = !pagina.vencida && pagina.estado === 'activa';

  useEffect(() => setMensajes(iniciales), [iniciales]);
  useEffect(() => {
    const t = setInterval(() => setQuedan(restante(pagina.expira_at)), 30000);
    return () => clearInterval(t);
  }, [pagina.expira_at]);
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensajes, enviando]);

  const enviar = async (e) => {
    e.preventDefault();
    const m = texto.trim();
    if (m.length < 3 || enviando) return;
    setEnviando(true);
    setError('');
    setMensajes((p) => [...p, { rol: 'usuario', texto: m, created_at: new Date().toISOString() }]);
    setTexto('');
    try {
      const r = await api('/editar', { metodo: 'POST', cuerpo: { mensaje: m }, token });
      setMensajes((p) => [...p, { rol: 'asistente', texto: r.respuesta || 'Listo.', created_at: new Date().toISOString() }]);
      onActualizar({ ...estado, pagina: r.pagina });
      setRecarga((n) => n + 1);
      evento('creador_edicion');
    } catch (err) {
      setError(err.message);
      setMensajes((p) => p.slice(0, -1));
      setTexto(m);
      if (err.status === 401) onSalir();
    } finally {
      setEnviando(false);
    }
  };

  const cambiarLogo = (dataUrl) => {
    setError('');
    api('/logo', { metodo: 'POST', cuerpo: { imagen: dataUrl || null }, token })
      .then((r) => {
        onActualizar({ ...estado, pagina: r.pagina });
        setRecarga((n) => n + 1);
      })
      .catch((err) => setError(err.message));
  };

  const elegirLogo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!TIPOS_LOGO.includes(file.type)) return setError('El logo debe ser PNG, JPG o WEBP.');
    if (file.size > MAX_LOGO) return setError('El logo pesa más de 500 KB.');
    const lector = new FileReader();
    lector.onload = () => cambiarLogo(String(lector.result));
    lector.readAsDataURL(file);
    return undefined;
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(pagina.url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* clipboard blocked: the link is visible to copy by hand */
    }
  };

  const compartir = `https://wa.me/?text=${encodeURIComponent(`¡Mira la página de ${pagina.contenido?.nombre || lead.empresa}! ${pagina.url}`)}`;
  const permanente = waNexcommit(`Hola! Creé mi página ${pagina.url.replace('https://www.', '')} con el Creador y quiero dejarla permanente.`);

  return (
    <div className="cr-panel">
      <div className="cr-lado">
        <div className="cr-link-box">
          <div className="cr-link-top">
            <span className={`cr-estado ${activa ? 'on' : 'off'}`}>{activa ? 'Publicada' : 'Vencida'}</span>
            {activa && quedan && <span className="cr-quedan">Vence en <b>{quedan}</b></span>}
          </div>
          <a className="cr-url" href={pagina.url} target="_blank" rel="noopener noreferrer">
            {pagina.url.replace('https://www.', '')} <ExternalLink aria-hidden="true" />
          </a>
          <div className="cr-acciones">
            <button type="button" className="cr-chip" onClick={copiar}>{copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copiado ? 'Copiado' : 'Copiar link'}</button>
            <a className="cr-chip" href={compartir} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" />Compartir</a>
            {activa && (
              <label className="cr-chip">
                <ImagePlus aria-hidden="true" />{pagina.logo_url ? 'Cambiar logo' : 'Subir logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={elegirLogo} hidden />
              </label>
            )}
          </div>
        </div>

        <div className="cr-chat">
          <div className="cr-chat-head">
            <Sparkles aria-hidden="true" />
            <div><b>Asistente de tu página</b><small>{activa ? `${disponibles} de ${pagina.ediciones_max} ediciones disponibles` : 'Página vencida'}</small></div>
          </div>
          <div className="cr-msgs" ref={chatRef}>
            {mensajes.map((m, i) => (
              <div key={i} className={`cr-msg ${m.rol}`}>{m.texto}</div>
            ))}
            {enviando && <div className="cr-msg asistente escribiendo"><i /><i /><i /></div>}
          </div>
          {activa && disponibles > 0 ? (
            <form className="cr-chat-form" onSubmit={enviar}>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value.slice(0, max))}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) enviar(e); }}
                placeholder="Ej: cambia el color a verde y agrega que hacemos envíos a domicilio"
                rows={2}
                maxLength={max}
                disabled={enviando}
                aria-label="Pedido de cambio"
              />
              <div className="cr-chat-pie">
                <Contador valor={texto} max={max} />
                <button type="submit" className="cr-enviar" disabled={enviando || texto.trim().length < 3} aria-label="Enviar">
                  {enviando ? <Loader2 className="cr-gira" /> : <Send />}
                </button>
              </div>
            </form>
          ) : (
            <div className="cr-sin-ediciones">
              {activa ? 'Usaste todas tus ediciones.' : 'Tu página de prueba terminó.'} ¿Quieres más cambios, tu propio dominio o que quede permanente?
            </div>
          )}
          <Aviso error={error} />
        </div>

        <a className="nh-btn nh-btn-wa cr-btn" href={permanente} target="_blank" rel="noopener noreferrer" onClick={() => evento('creador_click_permanente')}>
          <MessageCircle aria-hidden="true" /> Quiero mi página permanente
        </a>
        <button type="button" className="cr-link cr-salir" onClick={onSalir}>Cerrar sesión</button>
      </div>

      <div className="cr-preview">
        <div className="cr-chrome">
          <div className="nh-dots"><i /><i /><i /></div>
          <div className="nh-url"><Lock aria-hidden="true" /><span>{pagina.url.replace('https://', '')}</span></div>
          <button type="button" className="cr-recargar" onClick={() => setRecarga((n) => n + 1)} aria-label="Recargar vista previa"><RefreshCw /></button>
        </div>
        <iframe key={recarga} src={`${urlVistaPrevia(pagina.slug)}?v=${recarga}`} title="Vista previa de tu página" loading="lazy" />
      </div>
    </div>
  );
}

// ─── Orquestador ────────────────────────────────────────────────────────────
const REG_VACIO = { nombre: '', empresa: '', email: '', telefono: '', acepta_terminos: false, acepta_marketing: false };

export default function Creador() {
  const [paso, setPaso] = useState('registro');
  const [token, setToken] = useState('');
  const [reg, setReg] = useState(REG_VACIO);
  const [reingreso, setReingreso] = useState(false);
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState('');
  const raiz = useRef(null);

  const cargarEstado = useCallback(async (t) => {
    const e = await api('/estado', { token: t });
    setEstado(e);
    setPaso(e.pagina ? 'pagina' : 'formulario');
    return e;
  }, []);

  // Al volver con una sesión guardada, se retoma donde quedó.
  useEffect(() => {
    const t = leerToken();
    if (!t) return;
    (async () => {
      setPaso('cargando');
      setToken(t);
      try {
        await cargarEstado(t);
      } catch {
        guardarToken('');
        setToken('');
        setPaso('registro');
      }
    })();
  }, [cargarEstado]);

  useEffect(() => {
    if (paso === 'registro' || paso === 'cargando') return;
    raiz.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [paso]);

  const salir = useCallback(() => {
    guardarToken('');
    setToken('');
    setEstado(null);
    setPaso('registro');
  }, []);

  const verificado = useCallback(async (t) => {
    guardarToken(t);
    setToken(t);
    try {
      await cargarEstado(t);
    } catch (err) {
      setError(err.message);
      setPaso('registro');
    }
  }, [cargarEstado]);

  const crear = useCallback(async (f, setErrorForm) => {
    setPaso('generando');
    setError('');
    try {
      const { slug, ...resto } = f;
      await api('/generar', { metodo: 'POST', cuerpo: { slug: slugificar(slug), ...resto, logo: resto.logo || null }, token });
      evento('generate_lead', { method: 'creador' });
      evento('creador_pagina_creada');
      await cargarEstado(token);
    } catch (err) {
      if (err.status === 401) return salir();
      setPaso('formulario');
      setErrorForm(err.message);
    }
    return undefined;
  }, [token, cargarEstado, salir]);

  const pasos = useMemo(() => ['Tus datos', 'Código', 'Tu negocio', 'Tu página'], []);
  const indice = { registro: 0, codigo: 1, formulario: 2, generando: 3, pagina: 3, cargando: 0 }[paso];

  return (
    <div className={`cr ${paso === 'pagina' ? 'cr-ancho' : ''}`} ref={raiz} id="creador">
      {paso !== 'pagina' && (
        <ol className="cr-pasos" aria-label="Progreso">
          {pasos.map((p, i) => (
            <li key={p} className={i < indice ? 'hecho' : i === indice ? 'actual' : ''}>
              <span>{i < indice ? <Check aria-hidden="true" /> : i + 1}</span>{p}
            </li>
          ))}
        </ol>
      )}

      <Aviso error={error} />

      {paso === 'cargando' && (
        <div className="cr-generando"><Loader2 className="cr-gira" aria-hidden="true" /><p>Recuperando tu página…</p></div>
      )}
      {paso === 'registro' && (
        <PasoRegistro
          inicial={reg}
          onListo={(datos, re) => {
            setReg(datos);
            setReingreso(re);
            setPaso('codigo');
          }}
        />
      )}
      {paso === 'codigo' && (
        <PasoCodigo email={reg.email.trim().toLowerCase()} reingreso={reingreso} onListo={verificado} onVolver={() => setPaso('registro')} />
      )}
      {paso === 'formulario' && estado && (
        <PasoFormulario lead={estado.lead} limites={estado.limites} onCreada={crear} />
      )}
      {paso === 'generando' && <PasoGenerando />}
      {paso === 'pagina' && estado?.pagina && (
        <PasoPagina token={token} estado={estado} onActualizar={setEstado} onSalir={salir} />
      )}
      {paso === 'registro' && (
        <p className="cr-info cr-ya">¿Ya creaste tu página? Escribe el mismo correo y celular: te enviamos un código para entrar a editarla.</p>
      )}
      <noscript><p className="cr-info">Activa JavaScript para usar el creador, o escríbenos a <a href={`${SITIO}`}>NexCommit</a>.</p></noscript>
    </div>
  );
}
