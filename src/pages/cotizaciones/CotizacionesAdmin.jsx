// Panel → Cotizaciones: conversar con Claude para armar una propuesta comercial y
// descargarla en PDF. Lo mismo se puede hacer desde la app de Claude con el conector
// MCP de NexCommit (herramientas guia_cotizaciones, guardar_cotizacion, generar_pdf_cotizacion…).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  BookOpen, Download, FileText, Loader2, MessageSquarePlus, RefreshCw, Search, Send, Trash2, X,
} from 'lucide-react';
import {
  ESTADOS, abrirUltimoPdf, burbujas, clp, useBorrarCotizacion, useCotizacion, useCotizaciones,
  useEstadoCotizacion, useGenerarPdf, useGuardarNotas, useGuiaCotizacion, useNotasCotizacion, useTurnoChat,
} from '../../hooks/cotizaciones';
import { useEquipo, useMiEquipoId } from '../../hooks/tareas';

const BORRADOR = 'nc_cotizacion_borrador';
const leerBorrador = () => {
  try {
    return JSON.parse(window.localStorage.getItem(BORRADOR) || '[]');
  } catch {
    return [];
  }
};
const guardarBorrador = (m) => {
  try {
    if (m?.length) window.localStorage.setItem(BORRADOR, JSON.stringify(m));
    else window.localStorage.removeItem(BORRADOR);
  } catch {
    /* sin almacenamiento: el borrador dura solo esta visita */
  }
};

// Markdown del chat y de la guía (el panel no usa el plugin de tipografía de Tailwind).
const MD = {
  p: (props) => <p className="my-1.5 leading-relaxed" {...props} />,
  ul: (props) => <ul className="my-1.5 ml-5 list-disc space-y-0.5" {...props} />,
  ol: (props) => <ol className="my-1.5 ml-5 list-decimal space-y-0.5" {...props} />,
  strong: (props) => <strong className="font-semibold text-white" {...props} />,
  h1: (props) => <h3 className="mt-3 mb-1 text-base font-semibold text-white" {...props} />,
  h2: (props) => <h3 className="mt-3 mb-1 text-sm font-semibold text-white" {...props} />,
  h3: (props) => <h4 className="mt-2 mb-1 text-sm font-semibold text-white" {...props} />,
  a: (props) => <a className="text-[#67c8f3] underline" target="_blank" rel="noopener noreferrer" {...props} />,
  table: (props) => <div className="overflow-x-auto"><table className="my-2 text-xs" {...props} /></div>,
  th: (props) => <th className="border border-white/10 px-2 py-1 text-left text-white" {...props} />,
  td: (props) => <td className="border border-white/10 px-2 py-1 align-top" {...props} />,
  code: (props) => <code className="rounded bg-black/30 px-1" {...props} />,
};

const SUGERENCIAS = [
  'Necesito cotizar una landing page para una clínica dental en Providencia que va a hacer Google Ads.',
  'Toma como base la última cotización de tienda Shopify y adáptala para una tienda de ropa.',
  'Cotiza un chatbot con IA para Instagram y WhatsApp de un centro de estética, con plan mensual.',
];

function Estado({ estado }) {
  const e = ESTADOS.find((x) => x.id === estado) || ESTADOS[0];
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: e.color, background: `${e.color}1f` }}>
      {e.label}
    </span>
  );
}

function montos(c) {
  const p = [];
  if (c.total_unico) p.push(`${clp(c.total_unico)} + IVA`);
  if (c.total_mensual) p.push(`${clp(c.total_mensual)}/mes`);
  return p.join(' · ') || 'sin montos';
}

function Lista({ seleccion, onElegir }) {
  const { data = [], isLoading, error } = useCotizaciones();
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState('');
  const filtradas = useMemo(() => {
    const t = texto.trim().toLowerCase();
    return data.filter((c) => (!estado || c.estado === estado)
      && (!t || `${c.numero} ${c.cliente_nombre} ${c.titulo}`.toLowerCase().includes(t)));
  }, [data, texto, estado]);

  return (
    <div className="flex flex-col min-h-0 rounded-xl border border-white/10 bg-[#0d1e30]">
      <div className="p-3 space-y-2 border-b border-white/10">
        <label className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
          <Search className="w-4 h-4 text-[#9aafc3]" />
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cliente, título o número"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#5f7891] outline-none" aria-label="Buscar cotización" />
        </label>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado"
          className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white border border-white/10">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[60vh] lg:max-h-none">
        {isLoading && <p className="p-3 text-sm text-[#9aafc3]">Cargando…</p>}
        {error && <p className="p-3 text-sm text-red-300">{/does not exist|schema cache/i.test(error.message) ? 'Faltan las migraciones de cotizaciones en Supabase.' : error.message}</p>}
        {!isLoading && !filtradas.length && !error && <p className="p-3 text-sm text-[#9aafc3]">No hay cotizaciones.</p>}
        {filtradas.map((c) => (
          <button key={c.id} type="button" onClick={() => onElegir(c.id)}
            className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${seleccion === c.id ? 'bg-[#1a3050]' : 'hover:bg-white/5'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#9aafc3]">{c.numero}{c.version > 1 ? ` · v${c.version}` : ''}</span>
              <Estado estado={c.estado} />
            </div>
            <div className="text-sm font-medium text-white truncate">{c.cliente_nombre}</div>
            <div className="text-xs text-[#9aafc3] truncate">{c.titulo}</div>
            <div className="text-xs text-[#67c8f3] mt-0.5">{montos(c)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Chat({ cotizacionId, onCreada }) {
  const { data: cot } = useCotizacion(cotizacionId);
  const turno = useTurnoChat();
  const generar = useGenerarPdf();
  const cambiarEstado = useEstadoCotizacion();
  const borrar = useBorrarCotizacion();
  const { data: equipo = [] } = useEquipo();
  const { data: yo } = useMiEquipoId();
  const esDueno = equipo.some((m) => m.id === yo && m.rol === 'dueno');

  // Mientras no se escriba nada, se muestra la conversación guardada (vacía si nació por el
  // conector MCP); una nueva parte del borrador local.
  const [propios, setMensajes] = useState(() => (cotizacionId ? null : leerBorrador()));
  const mensajes = propios ?? (Array.isArray(cot?.conversacion) ? cot.conversacion : []);
  const [texto, setTexto] = useState('');
  const [pdf, setPdf] = useState(null);
  const [aviso, setAviso] = useState('');
  const fin = useRef(null);

  useEffect(() => {
    if (!cotizacionId) guardarBorrador(propios);
  }, [cotizacionId, propios]);
  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensajes.length, turno.isPending]);

  const enviar = (t = texto) => {
    const limpio = t.trim();
    if (!limpio || turno.isPending) return;
    setAviso('');
    const previos = mensajes;
    setMensajes([...previos, { role: 'user', content: limpio }]);
    setTexto('');
    turno.mutate({ cotizacion_id: cotizacionId || undefined, mensajes: previos, texto: limpio }, {
      onSuccess: (r) => {
        setMensajes(r.mensajes);
        if (r.pdf?.url) setPdf(r.pdf);
        if (!cotizacionId && r.cotizacion?.id) {
          guardarBorrador([]);
          onCreada(r.cotizacion.id);
        }
      },
      onError: (e) => {
        setMensajes(previos);
        setTexto(limpio);
        setAviso(e.message);
      },
    });
  };

  const verPdf = () => generar.mutate(cotizacionId, { onSuccess: setPdf, onError: (e) => setAviso(e.message) });
  const vistas = burbujas(mensajes);

  return (
    <div className="flex flex-col min-h-[70vh] lg:min-h-0 rounded-xl border border-white/10 bg-[#0d1e30]">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-white/10">
        {cot ? (
          <>
            <div className="min-w-0 mr-auto">
              <div className="text-xs text-[#9aafc3]">{cot.numero} · versión {cot.version}{cot.origen === 'mcp' ? ' · creada desde Claude' : ''}</div>
              <div className="text-sm font-semibold text-white truncate">{cot.cliente_nombre} — {cot.titulo}</div>
            </div>
            <select value={cot.estado} aria-label="Estado de la cotización"
              onChange={(e) => cambiarEstado.mutate({ id: cot.id, estado: e.target.value }, { onError: (er) => setAviso(er.message) })}
              className="rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white border border-white/10">
              {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
            <button type="button" onClick={verPdf} disabled={generar.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#248bde] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1f7bc5] disabled:opacity-60">
              {generar.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Generar PDF
            </button>
            {cot.pdf_path && (
              <button type="button" onClick={() => abrirUltimoPdf(cot).catch((e) => setAviso(e.message))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/5">
                <Download className="w-3.5 h-3.5" /> Último PDF
              </button>
            )}
            {esDueno && (
              <button type="button" aria-label="Borrar cotización" title="Borrar cotización"
                onClick={() => window.confirm(`¿Borrar ${cot.numero} (${cot.cliente_nombre})? No se puede deshacer.`)
                  && borrar.mutate(cot.id, { onSuccess: () => onCreada(null), onError: (e) => setAviso(e.message) })}
                className="rounded-lg p-1.5 text-red-300 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <div className="mr-auto">
            <div className="text-sm font-semibold text-white">Nueva cotización</div>
            <div className="text-xs text-[#9aafc3]">Cuéntale a Claude qué quieres cotizar; te hará las preguntas que falten.</div>
          </div>
        )}
      </div>

      {pdf?.url && (
        <div className="mx-3 mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-[#4ade80]/30 bg-[#4ade80]/10 px-3 py-2 text-sm text-[#bbf7d0]">
          <FileText className="w-4 h-4" /> PDF listo ({pdf.numero}, versión {pdf.version}).
          <a href={pdf.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline">
            <Download className="w-4 h-4" /> Descargar
          </a>
          <button type="button" onClick={() => setPdf(null)} className="ml-auto" aria-label="Cerrar aviso"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[65vh]">
        {!vistas.length && !turno.isPending && (
          <div className="space-y-2">
            <p className="text-sm text-[#9aafc3]">
              {cot ? 'Esta cotización no tiene conversación en el panel (se hizo desde Claude). Pídele cambios y Claude la revisa antes de editarla.' : 'Algunas ideas para partir:'}
            </p>
            {!cot && SUGERENCIAS.map((s) => (
              <button key={s} type="button" onClick={() => enviar(s)}
                className="block w-full text-left rounded-lg border border-white/10 px-3 py-2 text-sm text-[#cfe0f0] hover:bg-white/5">
                {s}
              </button>
            ))}
          </div>
        )}
        {vistas.map((m, i) => (m.rol === 'accion' ? (
          <div key={i} className="text-center text-[11px] text-[#5f7891]">— {m.texto} —</div>
        ) : (
          <div key={i} className={`rounded-xl px-3 py-2 text-sm ${m.rol === 'user' ? 'bg-[#1a3050] text-white ml-10 whitespace-pre-line' : 'bg-white/[0.04] text-[#cfe0f0] mr-6'}`}>
            {m.rol === 'user' ? m.texto : (
              <div className="break-words"><ReactMarkdown components={MD}>{m.texto}</ReactMarkdown></div>
            )}
          </div>
        )))}
        {turno.isPending && (
          <div className="flex items-center gap-2 text-sm text-[#9aafc3]">
            <Loader2 className="w-4 h-4 animate-spin" /> Claude está trabajando… (armar o guardar la propuesta puede tardar 1–2 minutos)
          </div>
        )}
        <div ref={fin} />
      </div>

      {aviso && <p className="mx-3 mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{aviso}</p>}
      <form className="flex items-end gap-2 p-3 border-t border-white/10" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} maxLength={8000}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder="Escribe aquí (Enter envía, Shift+Enter cambia de línea)" aria-label="Mensaje para Claude"
          className="flex-1 resize-none rounded-lg bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[#5f7891] border border-white/10 outline-none focus:border-[#248bde]" />
        <button type="submit" disabled={turno.isPending || !texto.trim()} aria-label="Enviar"
          className="rounded-lg bg-[#248bde] p-2.5 text-white hover:bg-[#1f7bc5] disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

function LoQueSabe({ onCerrar }) {
  const { data: guia, isLoading, error } = useGuiaCotizacion(true);
  const { data: config } = useNotasCotizacion();
  const guardar = useGuardarNotas();
  const { data: equipo = [] } = useEquipo();
  const { data: yo } = useMiEquipoId();
  const esDueno = equipo.some((m) => m.id === yo && m.rol === 'dueno');
  const [notas, setNotas] = useState(null);
  const valor = notas ?? config?.notas ?? '';

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1e30] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Lo que Claude sabe para cotizar</h2>
        <button type="button" onClick={onCerrar} className="p-1 text-[#9aafc3] hover:text-white" aria-label="Cerrar"><X className="w-5 h-5" /></button>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Notas internas de los dueños</h3>
        <p className="text-xs text-[#9aafc3] mb-2">
          Reglas de precio, descuentos, aprendizajes de propuestas que se cerraron o se perdieron. Claude las lee antes de cotizar
          (en el panel y en el conector) y mandan sobre la guía. {esDueno ? '' : 'Solo los dueños pueden editarlas.'}
        </p>
        <textarea value={valor} onChange={(e) => setNotas(e.target.value)} disabled={!esDueno} rows={6} maxLength={20000}
          className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white border border-white/10 disabled:opacity-70" aria-label="Notas internas para cotizar" />
        {esDueno && (
          <button type="button" disabled={guardar.isPending || notas === null}
            onClick={() => guardar.mutate(valor, { onSuccess: () => setNotas(null) })}
            className="mt-2 rounded-lg bg-[#248bde] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
            {guardar.isPending ? 'Guardando…' : 'Guardar notas'}
          </button>
        )}
        {guardar.error && <p className="mt-1 text-xs text-red-300">{guardar.error.message}</p>}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Guía completa (catálogo, condiciones, formato y cotizaciones recientes)</h3>
        {isLoading && <p className="text-sm text-[#9aafc3]">Cargando…</p>}
        {error && <p className="text-sm text-red-300">{error.message}</p>}
        {guia?.guia && (
          <div className="text-sm text-[#cfe0f0] max-h-[50vh] overflow-y-auto rounded-lg bg-black/20 p-3">
            <ReactMarkdown components={MD}>{guia.guia}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CotizacionesAdmin() {
  const [params, setParams] = useSearchParams();
  const seleccion = params.get('cotizacion') || null;
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  // La key fuerza un chat limpio al cambiar de cotización o al empezar una nueva.
  const [nueva, setNueva] = useState(0);

  const elegir = (id) => {
    const p = { tab: 'cotizaciones' };
    if (id) p.cotizacion = id;
    setParams(p, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Cotizaciones</h1>
          <p className="text-sm text-[#9aafc3]">
            Conversa con Claude para armar la propuesta y descárgala en PDF. También puedes pedírselo a Claude en el celular con el conector NexCommit.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setGuiaAbierta((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/5">
            <BookOpen className="w-4 h-4" /> Lo que sabe Claude
          </button>
          <button type="button" onClick={() => { guardarBorrador([]); elegir(null); setNueva((n) => n + 1); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#248bde] px-3 py-2 text-sm font-medium text-white hover:bg-[#1f7bc5]">
            <MessageSquarePlus className="w-4 h-4" /> Nueva cotización
          </button>
        </div>
      </div>

      {guiaAbierta && <LoQueSabe onCerrar={() => setGuiaAbierta(false)} />}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:h-[calc(100vh-230px)]">
        <Lista seleccion={seleccion} onElegir={elegir} />
        <Chat key={seleccion || `nueva-${nueva}`} cotizacionId={seleccion} onCreada={elegir} />
      </div>
    </div>
  );
}
