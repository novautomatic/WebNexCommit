// Editor visual a pantalla completa del Creador (portado del constructor por
// bloques de acupuntura-mtch): lienzo con la página real, edición de textos en
// el lugar, barra por sección (subir/bajar/duplicar/ocultar/eliminar), agregar
// secciones, inspector con estilo por sección, diseño general, fotos, vista
// escritorio/celular, deshacer/rehacer, autoguardado y el chat con IA.
//
// El lienzo es un iframe en sandbox (sin acceso al sitio) que pinta la página
// con la plantilla del backend; habla con este componente solo por
// postMessage (ver JS_EDITOR en Agente-Next/back/src/creador/plantilla.js).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check, Copy, ExternalLink, LayoutList, Loader2, LogOut, MessageCircle, Monitor, Paintbrush,
  PanelRightOpen, Plus, Redo2, Smartphone, Sparkles, Undo2, X,
} from 'lucide-react';
import { api } from '../../../config/creador';
import { WHATSAPP_NUMBER } from '../../../config/contact';
import { cargarModulos, getRuta, setRuta } from './modulos';
import { Campo, Estructura, PanelDiseno, PanelSeccion, Paleta } from './Inspector';
import SelectorFoto from './SelectorFoto';
import ChatIA from './ChatIA';
import './editor.css';

const CLAVE_AYUDA = 'nc_editor_ayuda_vista';

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

function ayudaVista() {
  try {
    return window.localStorage.getItem(CLAVE_AYUDA) === '1';
  } catch {
    return false;
  }
}

const ESTADO_GUARDADO = {
  guardado: { texto: 'Guardado', clase: 'ok' },
  'sin-guardar': { texto: 'Cambios sin guardar', clase: '' },
  guardando: { texto: 'Guardando…', clase: '' },
  error: { texto: 'No se guardó', clase: 'mal' },
};

export default function Editor({ token, estado, onActualizar, onSalir }) {
  const { pagina, limites } = estado;
  const [mod, setMod] = useState(null);
  const [errorMod, setErrorMod] = useState('');
  const [hist, setHist] = useState(() => ({ actual: pagina.contenido, pasado: [], futuro: [], ultima: null }));
  const contenido = hist.actual;
  const [logo, setLogo] = useState(pagina.logo_url);
  const [sel, setSel] = useState(null);
  const [pestana, setPestana] = useState('editar');
  const [vista, setVista] = useState('escritorio');
  const [guardado, setGuardado] = useState('guardado');
  const [errorGuardar, setErrorGuardar] = useState('');
  const [insertarEn, setInsertarEn] = useState(null);
  const [foto, setFoto] = useState(null);
  const [panelMovil, setPanelMovil] = useState(false);
  const [mensajes, setMensajes] = useState(estado.mensajes);
  const [enviandoIA, setEnviandoIA] = useState(false);
  const [errorIA, setErrorIA] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [quedan, setQuedan] = useState(() => restante(pagina.expira_at));
  const [ayuda, setAyuda] = useState(() => !ayudaVista());

  const iframe = useRef(null);
  const listo = useRef(false);
  const contenidoRef = useRef(contenido);
  const guardadoRef = useRef(pagina.contenido);
  const selRef = useRef(null);
  const htmlRef = useRef('');
  const omitirRef = useRef(null);
  const verRef = useRef(null);

  const activa = !pagina.vencida && pagina.estado === 'activa';
  const disponiblesIA = pagina.ediciones_max - pagina.ediciones_usadas;
  const secciones = contenido.secciones || [];
  const indiceSel = secciones.findIndex((s) => s.id === sel);
  const seccionSel = indiceSel >= 0 ? secciones[indiceSel] : null;

  // ─── Carga de la plantilla ────────────────────────────────────────────────
  useEffect(() => {
    let vivo = true;
    cargarModulos()
      .then((m) => vivo && setMod(m))
      .catch(() => vivo && setErrorMod('No pudimos cargar el editor. Revisa tu conexión y recarga la página.'));
    return () => {
      vivo = false;
    };
  }, []);

  // Pantalla completa: el sitio de fondo no debe scrollear.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setQuedan(restante(pagina.expira_at)), 30000);
    return () => clearInterval(t);
  }, [pagina.expira_at]);

  const html = useMemo(() => {
    if (!mod) return '';
    try {
      return mod.plantilla.renderPagina(
        { ...pagina, logo_url: logo, contenido: mod.esquema.sanearContenido(contenido) },
        { editor: true },
      );
    } catch (e) {
      console.error('[editor] render', e);
      return '';
    }
  }, [mod, contenido, logo, pagina]);

  // El iframe arranca con el primer HTML; los cambios siguientes le llegan por
  // postMessage (sin recargarlo: no parpadea ni pierde el scroll).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const docInicial = useMemo(() => html, [mod]);

  const alLienzo = useCallback((m) => {
    iframe.current?.contentWindow?.postMessage({ nc: 1, ...m }, '*');
  }, []);

  useEffect(() => {
    contenidoRef.current = contenido;
  }, [contenido]);

  useEffect(() => {
    selRef.current = sel;
  }, [sel]);

  useEffect(() => {
    htmlRef.current = html;
    if (!html) return;
    // Un texto escrito en el lienzo ya está en el lienzo: repintar movería el cursor.
    if (omitirRef.current && omitirRef.current === contenido) {
      omitirRef.current = null;
      return;
    }
    omitirRef.current = null;
    if (listo.current) {
      alLienzo({ tipo: 'doc', html, sel: selRef.current, ver: verRef.current });
      verRef.current = null;
    }
  }, [html, contenido, alLienzo]);

  // ─── Historial ────────────────────────────────────────────────────────────
  const cambiar = useCallback((fn, clave) => {
    setHist((h) => {
      const nuevo = fn(h.actual);
      if (nuevo === h.actual) return h;
      const ahora = Date.now();
      const juntar = clave && h.ultima?.clave === clave && ahora - h.ultima.t < 1500;
      return {
        actual: nuevo,
        pasado: juntar ? h.pasado : [...h.pasado.slice(-59), h.actual],
        futuro: [],
        ultima: clave ? { clave, t: ahora } : null,
      };
    });
    setGuardado('sin-guardar');
  }, []);

  const deshacer = useCallback(() => {
    setHist((h) => (h.pasado.length
      ? { actual: h.pasado[h.pasado.length - 1], pasado: h.pasado.slice(0, -1), futuro: [h.actual, ...h.futuro], ultima: null }
      : h));
    setGuardado('sin-guardar');
  }, []);

  const rehacer = useCallback(() => {
    setHist((h) => (h.futuro.length
      ? { actual: h.futuro[0], pasado: [...h.pasado, h.actual], futuro: h.futuro.slice(1), ultima: null }
      : h));
    setGuardado('sin-guardar');
  }, []);

  useEffect(() => {
    const teclas = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const enCampo = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if (enCampo) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        deshacer();
      } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        e.preventDefault();
        rehacer();
      }
    };
    window.addEventListener('keydown', teclas);
    return () => window.removeEventListener('keydown', teclas);
  }, [deshacer, rehacer]);

  // ─── Guardado ─────────────────────────────────────────────────────────────
  const guardarAhora = useCallback(async () => {
    const c = contenidoRef.current;
    if (c === guardadoRef.current) return true;
    setGuardado('guardando');
    try {
      await api('/contenido', { metodo: 'PUT', cuerpo: { contenido: c }, token });
      guardadoRef.current = c;
      setGuardado(contenidoRef.current === c ? 'guardado' : 'sin-guardar');
      setErrorGuardar('');
      return true;
    } catch (e) {
      setGuardado('error');
      setErrorGuardar(e.message);
      if (e.status === 401) onSalir();
      return false;
    }
  }, [token, onSalir]);

  useEffect(() => {
    if (!activa || contenido === guardadoRef.current) return undefined;
    const t = setTimeout(guardarAhora, 1300);
    return () => clearTimeout(t);
  }, [contenido, guardarAhora, activa]);

  useEffect(() => {
    const avisar = (e) => {
      if (contenidoRef.current !== guardadoRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, []);

  // ─── Acciones ─────────────────────────────────────────────────────────────
  const set = useCallback((ruta, v) => cambiar((c) => setRuta(c, ruta, v), `insp:${ruta}`), [cambiar]);

  const seleccionar = useCallback((id, ver = false) => {
    setSel(id);
    setPestana('editar');
    alLienzo({ tipo: 'sel', id, ver });
  }, [alLienzo]);

  const accion = useCallback((id, acc) => {
    if (!mod) return;
    cambiar((c) => {
      const secs = [...c.secciones];
      const i = secs.findIndex((s) => s.id === id);
      if (i < 0) return c;
      if (acc === 'subir' || acc === 'bajar') {
        const j = acc === 'subir' ? i - 1 : i + 1;
        if (j < 0 || j >= secs.length) return c;
        [secs[i], secs[j]] = [secs[j], secs[i]];
      } else if (acc === 'ocultar') {
        secs[i] = { ...secs[i], visible: !secs[i].visible };
      } else if (acc === 'duplicar') {
        secs.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(secs[i])), id: mod.esquema.nuevoId(secs[i].tipo) });
      } else if (acc === 'eliminar') {
        secs.splice(i, 1);
      } else {
        return c;
      }
      return { ...c, secciones: secs };
    });
    if (acc === 'eliminar' && selRef.current === id) setSel(null);
  }, [cambiar, mod]);

  const agregar = (tipo) => {
    const nueva = mod.esquema.nuevaSeccion(tipo);
    cambiar((c) => {
      const secs = [...c.secciones];
      let idx = insertarEn;
      if (idx == null) {
        const iSel = secs.findIndex((s) => s.id === selRef.current);
        idx = iSel >= 0 ? iSel + 1 : secs.findIndex((s) => s.tipo === 'contacto');
      }
      if (idx < 0 || idx > secs.length) idx = secs.length;
      secs.splice(idx, 0, nueva);
      return { ...c, secciones: secs };
    });
    setInsertarEn(null);
    setSel(nueva.id);
    verRef.current = nueva.id;
    setPestana('editar');
  };

  const abrirFoto = useCallback((destino, id = null) => setFoto({ destino, id }), []);

  const elegirFoto = async (f, dataUrl) => {
    const { destino, id } = foto;
    if (destino === 'logo') {
      if (!dataUrl) return;
      const r = await api('/logo', { metodo: 'POST', cuerpo: { imagen: dataUrl }, token });
      setLogo(r.pagina.logo_url);
      setFoto(null);
      return;
    }
    let nueva = f;
    if (dataUrl) nueva = (await api('/imagen', { metodo: 'POST', cuerpo: { imagen: dataUrl }, token })).foto;
    if (destino === 'portada' || destino === 'nosotros') {
      cambiar((c) => setRuta(c, `fotos.${destino}`, { ...nueva, manual: true, consulta: c.imagenes?.[destino] || '' }));
    } else if (destino === 'galeria') {
      cambiar((c) => {
        const i = c.secciones.findIndex((s) => s.id === id);
        if (i < 0) return c;
        const fotos = [...(c.secciones[i].props?.fotos || []), nueva].slice(0, mod.esquema.LIMITES.galeria);
        return setRuta(c, `secciones.${i}.props.fotos`, fotos);
      });
    }
    setFoto(null);
  };

  const quitarFoto = async () => {
    const { destino } = foto;
    if (destino === 'logo') {
      try {
        await api('/logo', { metodo: 'POST', cuerpo: { imagen: null }, token });
        setLogo(null);
      } catch (e) {
        setErrorGuardar(e.message);
      }
    } else {
      cambiar((c) => {
        const fotos = { ...(c.fotos || {}) };
        delete fotos[destino];
        return { ...c, fotos };
      });
    }
    setFoto(null);
  };

  // ─── Mensajes del lienzo ──────────────────────────────────────────────────
  useEffect(() => {
    const alRecibir = (ev) => {
      if (!iframe.current || ev.source !== iframe.current.contentWindow) return;
      const d = ev.data;
      if (!d?.nc) return;
      switch (d.tipo) {
        case 'listo':
          listo.current = true;
          alLienzo({ tipo: 'doc', html: htmlRef.current, sel: selRef.current });
          break;
        case 'sel':
          setSel(d.id);
          setPestana(d.panel === 'diseno' ? 'diseno' : 'editar');
          break;
        case 'campo': {
          const actual = contenidoRef.current;
          if (typeof d.ruta !== 'string' || getRuta(actual, d.ruta) === d.valor) break;
          const nuevo = setRuta(actual, d.ruta, String(d.valor ?? ''));
          omitirRef.current = nuevo;
          cambiar(() => nuevo, `campo:${d.ruta}`);
          break;
        }
        case 'accion':
          accion(d.id, d.accion);
          break;
        case 'insertar':
          setInsertarEn(Number(d.indice) || 0);
          setPestana('agregar');
          setPanelMovil(true);
          break;
        case 'imagen':
          abrirFoto(d.clave === 'galeria' ? 'galeria' : d.clave, d.id);
          break;
        default:
      }
    };
    window.addEventListener('message', alRecibir);
    return () => window.removeEventListener('message', alRecibir);
  }, [alLienzo, cambiar, accion, abrirFoto]);

  // ─── Chat IA ──────────────────────────────────────────────────────────────
  const enviarIA = async (m) => {
    setEnviandoIA(true);
    setErrorIA('');
    setMensajes((p) => [...p, { rol: 'usuario', texto: m }]);
    try {
      if (!(await guardarAhora())) throw new Error('Primero guardemos tus cambios: revisa el aviso de arriba.');
      const r = await api('/editar', { metodo: 'POST', cuerpo: { mensaje: m }, token });
      setMensajes((p) => [...p, { rol: 'asistente', texto: r.respuesta || 'Listo, actualicé tu página.' }]);
      const nuevo = r.pagina.contenido;
      guardadoRef.current = nuevo;
      setHist((h) => ({ actual: nuevo, pasado: [...h.pasado.slice(-59), h.actual], futuro: [], ultima: null }));
      setGuardado('guardado');
      onActualizar({ ...estado, pagina: r.pagina });
      return true;
    } catch (e) {
      setErrorIA(e.message);
      setMensajes((p) => p.slice(0, -1));
      if (e.status === 401) onSalir();
      return false;
    } finally {
      setEnviandoIA(false);
    }
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

  const cerrarAyuda = () => {
    setAyuda(false);
    try {
      window.localStorage.setItem(CLAVE_AYUDA, '1');
    } catch {
      /* ignore */
    }
  };

  const avanzar = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola! Creé la maqueta ${pagina.url.replace('https://www.', '')} con el Creador y quiero avanzar con mi página web.`)}`;
  const campo = (ruta, label, max, multi = false, placeholder = '', ayudaCampo) => (
    <Campo key={ruta} label={label} max={max} multi={multi} placeholder={placeholder} ayuda={ayudaCampo}
      valor={getRuta(contenido, ruta)} onCambio={(v) => set(ruta, v)} />
  );
  const eg = ESTADO_GUARDADO[guardado];

  if (!activa) {
    return (
      <div className="ed ed-fin">
        <div className="ed-fin-caja">
          <h2>Tu maqueta terminó</h2>
          <p>Ya pasó el plazo de prueba de <b>{pagina.url.replace('https://www.', '')}</b>. Nuestro equipo puede convertirla en tu página definitiva, con tu dominio y todo lo que necesites.</p>
          <a className="nh-btn nh-btn-wa" href={avanzar} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" /> Quiero avanzar con NexCommit</a>
          <button type="button" className="ed-link" onClick={onSalir}>Cerrar sesión</button>
        </div>
      </div>
    );
  }

  const pestanas = [
    { id: 'editar', label: 'Editar', icono: LayoutList },
    { id: 'diseno', label: 'Diseño', icono: Paintbrush },
    { id: 'agregar', label: 'Agregar', icono: Plus },
    { id: 'ia', label: 'IA', icono: Sparkles },
  ];

  return (
    <div className="ed" role="application" aria-label="Editor de tu página">
      {/* ─── Barra superior ─── */}
      <header className="ed-top">
        <div className="ed-top-izq">
          <span className="ed-marca">Nex<b>Commit</b></span>
          <div className="ed-url">
            <a href={pagina.url} target="_blank" rel="noopener noreferrer" title="Ver tu página publicada">
              {pagina.url.replace('https://www.', '')} <ExternalLink aria-hidden="true" />
            </a>
            <button type="button" onClick={copiar} title="Copiar link" aria-label="Copiar link">{copiado ? <Check /> : <Copy />}</button>
          </div>
          {quedan && <span className="ed-quedan">Vence en <b>{quedan}</b></span>}
        </div>
        <div className="ed-top-centro">
          <button type="button" className="ed-icono" onClick={deshacer} disabled={!hist.pasado.length} title="Deshacer (Ctrl+Z)" aria-label="Deshacer"><Undo2 /></button>
          <button type="button" className="ed-icono" onClick={rehacer} disabled={!hist.futuro.length} title="Rehacer (Ctrl+Y)" aria-label="Rehacer"><Redo2 /></button>
          <div className="ed-vista" role="group" aria-label="Vista">
            <button type="button" className={vista === 'escritorio' ? 'on' : ''} onClick={() => setVista('escritorio')} title="Escritorio" aria-pressed={vista === 'escritorio'}><Monitor /></button>
            <button type="button" className={vista === 'movil' ? 'on' : ''} onClick={() => setVista('movil')} title="Celular" aria-pressed={vista === 'movil'}><Smartphone /></button>
          </div>
          <span className={`ed-guardado ${eg.clase}`} role="status">
            {guardado === 'guardando' ? <Loader2 className="cr-gira" /> : guardado === 'guardado' ? <Check /> : null}{eg.texto}
          </span>
        </div>
        <div className="ed-top-der">
          <a className="ed-avanzar" href={avanzar} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" /> <span>Quiero avanzar con NexCommit</span></a>
          <button type="button" className="ed-icono" onClick={onSalir} title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut /></button>
        </div>
      </header>

      {errorGuardar && (
        <div className="ed-banda-error" role="alert">
          {errorGuardar}
          <button type="button" onClick={() => setErrorGuardar('')} aria-label="Cerrar"><X /></button>
        </div>
      )}

      <div className="ed-cuerpo">
        {/* ─── Lienzo ─── */}
        <div className={`ed-lienzo ${vista === 'movil' ? 'movil' : ''}`}>
          {ayuda && mod && (
            <div className="ed-ayuda">
              <Sparkles aria-hidden="true" />
              <span><b>Así se edita:</b> haz clic en cualquier texto y escribe. Al pasar por una sección verás «+ Agregar sección aquí», y al seleccionarla, botones para moverla u ocultarla.</span>
              <button type="button" onClick={cerrarAyuda} aria-label="Entendido"><X /></button>
            </div>
          )}
          {errorMod && <div className="cr-aviso error ed-error-mod">{errorMod}</div>}
          {!mod && !errorMod && <div className="ed-cargando"><Loader2 className="cr-gira" /> Preparando tu editor…</div>}
          {mod && (
            <div className="ed-marco">
              <iframe ref={iframe} title="Tu página (editable)" srcDoc={docInicial} sandbox="allow-scripts" />
            </div>
          )}
        </div>

        {/* ─── Panel ─── */}
        <aside className={`ed-panel ${panelMovil ? 'abierto' : ''}`} aria-label="Panel de edición">
          <div className="ed-tabs">
            {pestanas.map((p) => {
              const Ic = p.icono;
              return (
                <button key={p.id} type="button" className={pestana === p.id ? 'on' : ''} onClick={() => setPestana(p.id)}>
                  <Ic aria-hidden="true" />{p.label}
                  {p.id === 'ia' && <em>{disponiblesIA}</em>}
                </button>
              );
            })}
            <button type="button" className="ed-cerrar-movil" onClick={() => setPanelMovil(false)} aria-label="Cerrar panel"><X /></button>
          </div>
          <div className="ed-panel-scroll">
            {mod && pestana === 'editar' && (seccionSel ? (
              <PanelSeccion
                key={seccionSel.id}
                seccion={seccionSel}
                indice={indiceSel}
                contenido={contenido}
                mod={mod}
                campo={campo}
                set={set}
                abrirFoto={abrirFoto}
                onEstilo={(est) => set(`secciones.${indiceSel}.estilo`, est)}
                onCerrar={() => seleccionar(null)}
              />
            ) : (
              <Estructura secciones={secciones} mod={mod} onSeleccionar={(id) => seleccionar(id, true)} onAccion={accion} />
            ))}
            {mod && pestana === 'diseno' && (
              <PanelDiseno contenido={contenido} mod={mod} campo={campo} set={set} logo={logo} abrirLogo={() => abrirFoto('logo')} />
            )}
            {mod && pestana === 'agregar' && (
              <div className="ed-panel-cuerpo">
                <div className="ed-panel-tit"><h3>Agregar una sección</h3></div>
                <p className="ed-nota">
                  {insertarEn != null ? 'Se agregará donde hiciste clic.' : seccionSel ? `Se agregará después de «${mod.esquema.ETIQUETAS[seccionSel.tipo]}».` : 'Se agregará antes de Contacto.'}
                </p>
                <Paleta mod={mod} onAgregar={agregar} />
              </div>
            )}
            {pestana === 'ia' && (
              <ChatIA
                mensajes={mensajes}
                disponibles={disponiblesIA}
                maximas={pagina.ediciones_max}
                maxCaracteres={limites?.max_caracteres || 300}
                enviando={enviandoIA}
                error={errorIA}
                onEnviar={enviarIA}
              />
            )}
          </div>
        </aside>
        <button type="button" className="ed-abrir-movil" onClick={() => setPanelMovil(true)}><PanelRightOpen aria-hidden="true" /> Editar</button>
      </div>

      {foto && (
        <SelectorFoto
          titulo={foto.destino === 'logo' ? 'Tu logo' : foto.destino === 'galeria' ? 'Agregar foto a la galería' : 'Elegir foto'}
          soloSubir={foto.destino === 'logo'}
          sugerencia={contenido.imagenes?.[foto.destino] || ''}
          token={token}
          onElegir={elegirFoto}
          onCerrar={() => setFoto(null)}
          onQuitar={(foto.destino === 'logo' && logo) || ((foto.destino === 'portada' || foto.destino === 'nosotros') && contenido.fotos?.[foto.destino]) ? quitarFoto : null}
        />
      )}
    </div>
  );
}
