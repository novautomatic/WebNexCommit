// Panel → Cotizaciones: el cotizador único de NexCommit. Se conversa con la IA (50x, en
// el back de Agente-Next), que lee las notas pegadas, busca precios de proyectos
// parecidos, hace una tanda de preguntas y deja la propuesta en PDF y Word. La misma
// conversación se puede seguir desde la app de Claude (herramienta `cotizar` del
// conector MCP de NexCommit): vive en la tabla cotizaciones_chats.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  BookOpen, Download, FileText, FileType, Loader2, MessageSquarePlus, MessagesSquare, RefreshCw, Search, Send, Trash2, X,
} from 'lucide-react';
import {
  ESTADOS, abrirUltimoPdf, burbujas, clp, useBorrarCotizacion, useChat, useChatsAbiertos, useCotizacion, useCotizaciones,
  useEstadoCotizacion, useGenerarPdf, useGenerarWord, useGuardarNotas, useGuiaCotizacion, useNotasCotizacion,
  useQuitarRegla, useReglasCotizacion, useTurnoChat,
} from '../../hooks/cotizaciones';
import { useEquipo, useMiEquipoId } from '../../hooks/tareas';

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

const AYUDA = 'Pega tus notas de lo que hablaste con el cliente (qué necesita, módulos, plazos, si es referido…). La IA revisa precios de proyectos parecidos, te hace una sola tanda de preguntas y arma la propuesta completa.';

const ocupado = (chat) => Boolean(chat?.ocupado_desde) && Date.now() - new Date(chat.ocupado_desde).getTime() < 6 * 60_000;
const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

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
  if (c.total_unico) p.push(`${clp(c.total_unico)} neto`);
  if (c.total_mensual) p.push(`${clp(c.total_mensual)}/mes`);
  return p.join(' · ') || 'sin montos';
}

function Lista({ seleccion, chatSeleccion, onElegir, onElegirChat }) {
  const { data = [], isLoading, error } = useCotizaciones();
  const { data: chats = [] } = useChatsAbiertos();
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
        {chats.length > 0 && (
          <div className="pb-2 mb-1 border-b border-white/10">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#5f7891]">Conversaciones en curso</p>
            {chats.map((c) => (
              <button key={c.id} type="button" onClick={() => onElegirChat(c.id)}
                className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${chatSeleccion === c.id ? 'bg-[#1a3050]' : 'hover:bg-white/5'}`}>
                <div className="flex items-center gap-2 text-[11px] text-[#9aafc3]">
                  <MessagesSquare className="w-3.5 h-3.5" /> {fechaCorta(c.updated_at)}{c.origen === 'mcp' ? ' · desde Claude' : ''}
                  {ocupado(c) && <Loader2 className="w-3 h-3 animate-spin ml-auto" aria-label="La IA está respondiendo" />}
                </div>
                <div className="text-sm text-white truncate">{c.titulo || 'Sin título'}</div>
              </button>
            ))}
          </div>
        )}
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

function Descarga({ archivo, tipo, onCerrar }) {
  return (
    <div className="mx-3 mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-[#4ade80]/30 bg-[#4ade80]/10 px-3 py-2 text-sm text-[#bbf7d0]">
      {tipo === 'Word' ? <FileType className="w-4 h-4" /> : <FileText className="w-4 h-4" />} {tipo} listo ({archivo.numero}, versión {archivo.version}).
      <a href={archivo.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline">
        <Download className="w-4 h-4" /> Descargar
      </a>
      <button type="button" onClick={onCerrar} className="ml-auto" aria-label="Cerrar aviso"><X className="w-4 h-4" /></button>
    </div>
  );
}

function Chat({ cotizacionId, chatId, onCreada, onChat, onBorrada }) {
  const { data: cot } = useCotizacion(cotizacionId);
  const { data: chat } = useChat({ chatId, cotizacionId });
  const turno = useTurnoChat();
  const generar = useGenerarPdf();
  const generarWord = useGenerarWord();
  const cambiarEstado = useEstadoCotizacion();
  const borrar = useBorrarCotizacion();
  const { data: equipo = [] } = useEquipo();
  const { data: yo } = useMiEquipoId();
  const esDueno = equipo.some((m) => m.id === yo && m.rol === 'dueno');

  // Lo escrito en esta visita manda; si no, la conversación guardada en el servidor
  // (que también se alimenta desde Claude) o, en cotizaciones antiguas, la de la cotización.
  // `propios` vale mientras el servidor no tenga una versión más nueva (p. ej. un turno
  // que llegó desde Claude): se compara con el updated_at que había al escribir.
  const [propios, setPropios] = useState(null);
  const guardados = Array.isArray(chat?.conversacion) ? chat.conversacion : Array.isArray(cot?.conversacion) ? cot.conversacion : [];
  const vigentes = propios && (turno.isPending || !chat || chat.updated_at === propios.base);
  const mensajes = vigentes ? propios.mensajes : guardados;
  const setMensajes = (m) => setPropios({ mensajes: m, base: chat?.updated_at ?? null });
  const [chatActual, setChatActual] = useState(chatId || null);
  const [texto, setTexto] = useState('');
  const [pdf, setPdf] = useState(null);
  const [word, setWord] = useState(null);
  const [aviso, setAviso] = useState('');
  const fin = useRef(null);
  const trabajandoAfuera = !turno.isPending && ocupado(chat);
  const idChat = chatActual || chat?.id || null;

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensajes.length, turno.isPending]);
  const enviar = (t = texto) => {
    const limpio = t.trim();
    if (!limpio || turno.isPending || trabajandoAfuera) return;
    setAviso('');
    const previos = mensajes;
    setMensajes([...previos, { role: 'user', content: limpio }]);
    setTexto('');
    turno.mutate({ chat_id: idChat || undefined, cotizacion_id: cotizacionId || undefined, mensajes: previos, texto: limpio }, {
      onSuccess: (r) => {
        setMensajes(r.mensajes);
        if (r.pdf?.url) setPdf(r.pdf);
        if (r.word?.url) setWord(r.word);
        if (r.chat_id) setChatActual(r.chat_id);
        if (!cotizacionId && r.cotizacion?.id) onCreada(r.cotizacion.id);
        else if (!cotizacionId && r.chat_id && r.chat_id !== chatId) onChat(r.chat_id);
      },
      onError: (e) => {
        setMensajes(previos);
        setTexto(limpio);
        setAviso(e.message);
      },
    });
  };

  const verPdf = () => generar.mutate(cotizacionId, { onSuccess: setPdf, onError: (e) => setAviso(e.message) });
  const verWord = () => generarWord.mutate(cotizacionId, { onSuccess: setWord, onError: (e) => setAviso(e.message) });
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
              {generar.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} PDF
            </button>
            <button type="button" onClick={verWord} disabled={generarWord.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/5 disabled:opacity-60">
              {generarWord.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileType className="w-3.5 h-3.5" />} Word
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
                  && borrar.mutate(cot.id, { onSuccess: onBorrada, onError: (e) => setAviso(e.message) })}
                className="rounded-lg p-1.5 text-red-300 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <div className="mr-auto">
            <div className="text-sm font-semibold text-white">{chat?.titulo || 'Nueva cotización'}</div>
            <div className="text-xs text-[#9aafc3]">{chat?.origen === 'mcp' ? 'Conversación empezada desde Claude: puedes seguirla aquí.' : 'La IA te hará una sola tanda de preguntas y armará la propuesta.'}</div>
          </div>
        )}
      </div>

      {pdf?.url && <Descarga archivo={pdf} tipo="PDF" onCerrar={() => setPdf(null)} />}
      {word?.url && <Descarga archivo={word} tipo="Word" onCerrar={() => setWord(null)} />}

      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[65vh]">
        {!vistas.length && !turno.isPending && (
          <p className="text-sm text-[#9aafc3]">
            {cot ? 'Esta cotización no tiene conversación guardada. Pídele cambios a la IA y los hará sobre esta misma cotización (nueva versión).' : AYUDA}
          </p>
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
        {(turno.isPending || trabajandoAfuera) && (
          <div className="flex items-center gap-2 text-sm text-[#9aafc3]">
            <Loader2 className="w-4 h-4 animate-spin" />
            {trabajandoAfuera ? 'La IA está respondiendo un mensaje enviado desde Claude…' : 'La IA está trabajando… (armar o guardar la propuesta puede tardar 1–2 minutos)'}
          </div>
        )}
        <div ref={fin} />
      </div>

      {aviso && <p className="mx-3 mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{aviso}</p>}
      <form className="flex items-end gap-2 p-3 border-t border-white/10" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={vistas.length ? 2 : 6} maxLength={8000}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder={vistas.length ? 'Responde o pide cambios (Enter envía, Shift+Enter cambia de línea)' : 'Pega aquí tus notas del cliente (Shift+Enter cambia de línea)'}
          aria-label="Mensaje para la IA"
          className="flex-1 resize-none rounded-lg bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[#5f7891] border border-white/10 outline-none focus:border-[#248bde]" />
        <button type="submit" disabled={turno.isPending || trabajandoAfuera || !texto.trim()} aria-label="Enviar"
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
  const { data: reglas = [] } = useReglasCotizacion();
  const quitar = useQuitarRegla();
  const guardar = useGuardarNotas();
  const { data: equipo = [] } = useEquipo();
  const { data: yo } = useMiEquipoId();
  const esDueno = equipo.some((m) => m.id === yo && m.rol === 'dueno');
  const [notas, setNotas] = useState(null);
  const valor = notas ?? config?.notas ?? '';

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1e30] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Lo que sabe la IA para cotizar</h2>
        <button type="button" onClick={onCerrar} className="p-1 text-[#9aafc3] hover:text-white" aria-label="Cerrar"><X className="w-5 h-5" /></button>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Reglas aprendidas</h3>
        <p className="text-xs text-[#9aafc3] mb-2">
          Cuando corriges algo que sirve para el futuro, la IA te propone anotarlo y solo lo guarda si le dices que sí. Las lee antes de cada cotización.
        </p>
        {!reglas.length && <p className="text-sm text-[#5f7891]">Todavía no hay reglas anotadas.</p>}
        <ul className="space-y-1">
          {reglas.map((r) => (
            <li key={r.id} className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-[#cfe0f0]">
              <span className="flex-1">{r.regla}</span>
              {esDueno && (
                <button type="button" aria-label="Quitar regla" title="Quitar regla" disabled={quitar.isPending}
                  onClick={() => window.confirm('¿Quitar esta regla? La IA dejará de usarla.') && quitar.mutate(r.id)}
                  className="p-1 text-red-300 hover:bg-red-500/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Notas internas de los socios</h3>
        <p className="text-xs text-[#9aafc3] mb-2">
          Reglas de precio, descuentos, aprendizajes de propuestas que se cerraron o se perdieron. La IA las lee antes de cotizar
          (en el panel y desde Claude) y mandan sobre la guía. {esDueno ? '' : 'Solo los socios pueden editarlas.'}
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
  const chatSeleccion = params.get('chat') || null;
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  // La key fuerza un chat limpio SOLO cuando la persona elige otra cotización o empieza una
  // nueva; si el propio chat crea la cotización o la conversación, sigue montado (no pierde
  // el aviso de descarga ni lo escrito).
  const [clave, setClave] = useState(0);

  const ir = (extra) => setParams({ tab: 'cotizaciones', ...extra }, { replace: true });
  const abrir = (extra) => { ir(extra); setClave((n) => n + 1); };
  const elegir = (id) => abrir(id ? { cotizacion: id } : {});
  const elegirChat = (id) => abrir(id ? { chat: id } : {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Cotizaciones</h1>
          <p className="text-sm text-[#9aafc3]">
            Pega tus notas y la IA arma la propuesta en PDF y Word, con precios basados en lo que ya cotizamos. También puedes seguir la misma conversación desde Claude (conector NexCommit → «cotizar»).
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setGuiaAbierta((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/5">
            <BookOpen className="w-4 h-4" /> Lo que sabe la IA
          </button>
          <button type="button" onClick={() => elegir(null)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#248bde] px-3 py-2 text-sm font-medium text-white hover:bg-[#1f7bc5]">
            <MessageSquarePlus className="w-4 h-4" /> Nueva cotización
          </button>
        </div>
      </div>

      {guiaAbierta && <LoQueSabe onCerrar={() => setGuiaAbierta(false)} />}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:h-[calc(100vh-230px)]">
        <Lista seleccion={seleccion} chatSeleccion={chatSeleccion} onElegir={elegir} onElegirChat={elegirChat} />
        <Chat key={clave} cotizacionId={seleccion} chatId={seleccion ? null : chatSeleccion}
          onCreada={(id) => ir({ cotizacion: id })} onChat={(id) => ir({ chat: id })} onBorrada={() => elegir(null)} />
      </div>
    </div>
  );
}
