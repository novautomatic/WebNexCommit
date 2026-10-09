// Asistente del Creador de páginas: registro → código → formulario → editor
// visual a pantalla completa (editor/Editor.jsx).
// Se prerenderiza (paso "registro"): nada de window/localStorage durante el render.
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Check, ImagePlus, LayoutTemplate, Loader2, Lock, ShoppingBag, Sparkles, Trash2, X,
} from 'lucide-react';
import {
  api, ESTILOS, guardarToken, leerToken, TURNSTILE_SITE_KEY, SITIO,
} from '../../config/creador';

// El editor pesa: se carga recién cuando hay una página que editar.
const Editor = lazy(() => import('./editor/Editor'));

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

function evento(nombre, params = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') window.gtag('event', nombre, params);
}


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
        Usamos estos datos para crear tu maqueta, enviarte el código y contactarte <b>sobre tu página</b>
        (por ejemplo, para avanzar con tu sitio definitivo). Solo una maqueta por correo y por celular.
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
    tipo: '',
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
    if (!f.tipo) return setError('Elige qué tipo de página necesitas: Landing Page o Tienda online.');
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

      <div className="cr-tipo" role="radiogroup" aria-label="Tipo de página">
        <span className="cr-tipo-tit">¿Qué tipo de página necesitas?</span>
        <div className="cr-tipo-op">
          {[
            { v: 'landing', t: 'Landing Page', d: 'Una página para presentar tu negocio y que te contacten por WhatsApp.', i: <LayoutTemplate aria-hidden="true" /> },
            { v: 'ecommerce', t: 'Tienda online', d: 'Muestra hasta 10 productos con carrito y recibe los pedidos por WhatsApp. Incluye panel para administrarla.', i: <ShoppingBag aria-hidden="true" /> },
          ].map((o) => (
            <button key={o.v} type="button" role="radio" aria-checked={f.tipo === o.v} className={f.tipo === o.v ? 'on' : ''}
              onClick={() => setF((p) => ({ ...p, tipo: o.v }))}>
              {o.i}<b>{o.t}</b><small>{o.d}</small>{f.tipo === o.v && <Check className="cr-tipo-ok" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>

      <SelectorSlug valor={f.slug} onCambio={(v) => setF((p) => ({ ...p, slug: v }))} ciudad={f.ciudad} rubro={f.rubro} onEstado={setSlugOk} />

      <div className="cr-grid2">
        <label>Rubro<input value={f.rubro} onChange={set('rubro')} maxLength={80} placeholder="Cafetería, peluquería, gasfitería…" /></label>
        <label>Ciudad o comuna<input value={f.ciudad} onChange={set('ciudad')} maxLength={60} placeholder="Ej: Viña del Mar" /></label>
      </div>
      <label>¿Qué hace tu negocio? <Contador valor={f.descripcion} max={300} />
        <textarea value={f.descripcion} onChange={set('descripcion')} maxLength={300} rows={3} placeholder="Ej: Cafetería de especialidad con pastelería casera, desayunos y espacio para trabajar." />
      </label>
      <label>{f.tipo === 'ecommerce' ? '¿Qué productos vendes?' : 'Servicios o productos principales'} <Contador valor={f.servicios} max={300} />
        <textarea value={f.servicios} onChange={set('servicios')} maxLength={300} rows={2}
          placeholder={f.tipo === 'ecommerce'
            ? 'Ej: tortas de chocolate, cheesecake de frambuesa, galletas de avena, café de grano. Creamos 4 productos de ejemplo y después agregas los tuyos.'
            : 'Ej: café de grano, desayunos, tortas por encargo, catering para oficinas'} />
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
        <Sparkles aria-hidden="true" /> {f.tipo === 'ecommerce' ? 'Crear mi tienda' : 'Crear mi página'}
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
        // Portal al <body>: la landing tiene contenedores animados con transform
        // y, dentro de ellos, un `position: fixed` deja de cubrir la pantalla.
        createPortal(
          <Suspense fallback={<div className="cr-generando"><Loader2 className="cr-gira" aria-hidden="true" /><p>Abriendo tu editor…</p></div>}>
            <Editor token={token} estado={estado} onActualizar={setEstado} onSalir={salir} />
          </Suspense>,
          document.body,
        )
      )}
      {paso === 'registro' && (
        <p className="cr-info cr-ya">¿Ya creaste tu página? Escribe el mismo correo y celular: te enviamos un código para entrar a editarla.</p>
      )}
      <noscript><p className="cr-info">Activa JavaScript para usar el creador, o escríbenos a <a href={`${SITIO}`}>NexCommit</a>.</p></noscript>
    </div>
  );
}
