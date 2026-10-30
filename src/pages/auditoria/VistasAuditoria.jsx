// Vistas de «Chatbots → Auditoría»: Resumen, Qué hicimos, Cada mes, Reunión con la
// clienta y Pendientes. Estructura genérica en ./contenido.js; los datos vienen del back
// (src/hooks/auditoria.js).
import { useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ClipboardCheck, MessageSquare, Minus, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import {
  useBorrarCambio, useBorrarComentario, useBorrarPendiente, useCrearCambio, useCrearComentario, useCrearPendiente,
  useEditarCambio, useEditarComentario, useEditarPendiente, useGuardarMes, useIndicadores,
} from '../../hooks/auditoria';
import { ErrorBox, Modal, Pill, btnGhost, btnPrimary, card, inputClass, labelClass } from '../tareas/ui';
import { Kpi, Seccion, Vacio } from '../google/graficos';
import {
  CHECKLIST_MENSUAL, CHECKLIST_REUNION, CIFRAS, CIFRAS_CLAVE, GUION_REUNION, mesAnterior, nombreMes,
  progreso, ultimosMeses,
} from './contenido';

// ── Utilidades ───────────────────────────────────────────────────────────────
const num = (n) => (n == null || Number.isNaN(n) ? '–' : Number(n).toLocaleString('es-CL'));
function formatear(cifra, n) {
  if (n == null || Number.isNaN(n)) return '–';
  if (cifra.formato === 'usd') return `USD ${Number(n).toFixed(2)}`;
  if (cifra.formato === 'clp') return `$${Number(n).toLocaleString('es-CL')}`;
  return num(n);
}
const filaMes = (datos, clave) => (datos?.meses || []).find((m) => m.clave === clave) || null;
const fechaCorta = (f) => (f ? new Date(`${f}T12:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

function Barra({ hechos, total }) {
  const p = total ? Math.round((hechos / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`${hechos} de ${total} listos`}>
      <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#248bde]" style={{ width: `${p}%` }} /></div>
      <span className="text-[11px] text-[#9aafc3] tabular-nums">{hechos}/{total}</span>
    </div>
  );
}

function SelectorMes({ valor, onChange, incluirLineaBase = false }) {
  const meses = ultimosMeses(12);
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)} className={`${inputClass} !w-auto`} aria-label="Mes">
      {meses.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}
      {incluirLineaBase && <option value="linea-base">Línea base</option>}
    </select>
  );
}

// Una casilla por ítem. Marcar guarda al instante (`onCambio` recibe el mapa completo).
function Checks({ secciones, checks, onCambio, deshabilitado }) {
  return (
    <div className="space-y-4">
      {secciones.map((s) => {
        const p = progreso([s], checks);
        return (
          <div key={s.id}>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <h4 className="text-sm font-medium text-white">{s.titulo}</h4>
              <div className="w-32"><Barra hechos={p.hechos} total={p.total} /></div>
            </div>
            <ul className="space-y-1">
              {s.items.map((i) => (
                <li key={i.id}>
                  <label className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm text-[#c4d3e2] hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-[#248bde]"
                      checked={checks[i.id] === true}
                      disabled={deshabilitado}
                      onChange={(e) => onCambio({ ...checks, [i.id]: e.target.checked })}
                    />
                    <span className={checks[i.id] === true ? 'line-through text-[#5f7891]' : ''}>{i.texto}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function Variacion({ cifra, actual, previo }) {
  if (actual == null || previo == null) return <span className="text-[#5f7891]">–</span>;
  const d = actual - previo;
  if (d === 0) return <span className="inline-flex items-center gap-1 text-[#9aafc3]"><Minus className="w-3.5 h-3.5" aria-hidden="true" /> igual</span>;
  const sube = d > 0;
  const bueno = cifra.mejor ? (cifra.mejor === 'mayor') === sube : null;
  const color = bueno == null ? '#9aafc3' : bueno ? '#3ecf8e' : '#f87171';
  const pct = previo ? ` (${sube ? '+' : ''}${Math.round((d / Math.abs(previo)) * 100)}%)` : '';
  const Icon = sube ? ArrowUp : ArrowDown;
  return (
    <span className="inline-flex items-center gap-1 tabular-nums" style={{ color }}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span className="sr-only">{sube ? 'subió' : 'bajó'}</span>
      {sube ? '+' : ''}{formatear(cifra, Number(d.toFixed(2)))}{pct}
    </span>
  );
}

// ── Resumen ──────────────────────────────────────────────────────────────────
export function VistaResumen({ chatbot, datos, mes, irA }) {
  const { data, isLoading, error } = useIndicadores(chatbot, mes);
  const m = data?.indicadores;
  const base = filaMes(datos, 'linea-base')?.indicadores;
  const fila = filaMes(datos, mes);
  const prog = progreso(CHECKLIST_MENSUAL, fila?.checklist);
  const abiertos = (datos.pendientes || []).filter((p) => !p.hecho);
  const recientes = (datos.cambios || []).slice(0, 4);
  const clave = CIFRAS.filter((c) => CIFRAS_CLAVE.includes(c.id));

  return (
    <div className="space-y-4">
      {error && <ErrorBox error={error} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading && <div className="col-span-full text-sm text-[#9aafc3] py-6 text-center">Calculando los indicadores de {nombreMes(mes)}…</div>}
        {m && clave.map((c) => (
          <Kpi key={c.id} titulo={c.label} valor={formatear(c, c.valor(m))}
            detalle={base ? `Línea base: ${formatear(c, c.valor(base))}` : undefined}
            estado={c.meta != null ? (c.valor(m) === c.meta ? 'bien' : 'alerta') : undefined} />
        ))}
        {m && (
          <Kpi titulo="Gasto de IA" valor={formatear(CIFRAS.find((c) => c.id === 'costo'), m.costo?.usd)} detalle={`${num(m.mensajes?.bot)} respuestas`} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Seccion titulo={`Auditoría de ${nombreMes(mes)}`} icon={ClipboardCheck}>
          <Barra hechos={prog.hechos} total={prog.total} />
          <p className="mt-2 text-xs text-[#9aafc3]">{prog.hechos === prog.total ? 'Lista: todo revisado.' : 'Faltan pasos por revisar este mes.'}</p>
          <button type="button" className={`${btnGhost} mt-3`} onClick={() => irA('mes')}>Abrir la checklist</button>
        </Seccion>
        <Seccion titulo="Últimos cambios" extra={`${(datos.cambios || []).length} en total`}>
          {recientes.length === 0 ? <Vacio>Aún no hay cambios registrados.</Vacio> : (
            <ul className="space-y-2">
              {recientes.map((c) => (
                <li key={c.id} className="text-sm text-[#c4d3e2]"><span className="text-[#5f7891] text-xs mr-1.5">{fechaCorta(c.fecha)}</span>{c.accion}</li>
              ))}
            </ul>
          )}
          <button type="button" className={`${btnGhost} mt-3`} onClick={() => irA('cambios')}>Ver todo lo que hicimos</button>
        </Seccion>
        <Seccion titulo="Pendientes abiertos" extra={`${abiertos.length}`}>
          {abiertos.length === 0 ? <Vacio>Sin pendientes abiertos.</Vacio> : (
            <ul className="space-y-2">
              {abiertos.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-start gap-2 text-sm text-[#c4d3e2]"><PrioridadChip prioridad={p.prioridad} />{p.titulo}</li>
              ))}
            </ul>
          )}
          <button type="button" className={`${btnGhost} mt-3`} onClick={() => irA('pendientes')}>Ver pendientes</button>
        </Seccion>
      </div>
    </div>
  );
}

const PRIORIDAD_COLOR = { alta: '#f87171', media: '#fab219', baja: '#9aafc3' };
function PrioridadChip({ prioridad }) {
  return <Pill color={PRIORIDAD_COLOR[prioridad] || '#9aafc3'}>{prioridad}</Pill>;
}

// ── Qué hicimos ──────────────────────────────────────────────────────────────
const ESTADOS_CAMBIO = {
  hecho: { label: 'Hecho', color: '#3ecf8e' },
  en_prueba: { label: 'En prueba', color: '#fab219' },
  por_confirmar: { label: 'Por confirmar', color: '#9aafc3' },
};
const hoyISO = () => new Date().toISOString().slice(0, 10);

function FormCambio({ inicial, onGuardar, onCerrar, guardando, error }) {
  const [f, setF] = useState(inicial);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Modal titulo={inicial.id ? 'Editar cambio' : 'Registrar un cambio'} onClose={onCerrar}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onGuardar(f); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={labelClass}>Fecha</label><input type="date" className={inputClass} value={f.fecha} onChange={set('fecha')} required /></div>
          <div>
            <label className={labelClass}>Estado</label>
            <select className={inputClass} value={f.estado} onChange={set('estado')}>
              {Object.entries(ESTADOS_CAMBIO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <div><label className={labelClass}>Qué se encontró</label><textarea className={inputClass} rows={3} value={f.hallazgo} onChange={set('hallazgo')} required /></div>
        <div><label className={labelClass}>Qué se hizo</label><textarea className={inputClass} rows={3} value={f.accion} onChange={set('accion')} required /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={labelClass}>Dónde (PR, SQL, panel…)</label><input className={inputClass} value={f.donde} onChange={set('donde')} /></div>
          <div><label className={labelClass}>Efecto esperado</label><input className={inputClass} value={f.efecto} onChange={set('efecto')} /></div>
        </div>
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={onCerrar}>Cancelar</button><button type="submit" className={btnPrimary} disabled={guardando}>Guardar</button></div>
      </form>
    </Modal>
  );
}

const AMBAR = '#fab219';
const fechaHora = (iso) => new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const autorDe = (email) => (email ? email.split('@')[0] : '');

// Hilo de comentarios de una nota: lo que pidió la clienta al presentar, con casilla «Resuelto».
function Comentarios({ cambioId, comentarios }) {
  const crear = useCrearComentario();
  const editar = useEditarComentario();
  const borrar = useBorrarComentario();
  const [texto, setTexto] = useState('');

  const agregar = (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    crear.mutate({ cambioId, texto }, { onSuccess: () => setTexto('') });
  };

  return (
    <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
      {comentarios.map((k) => (
        <div key={k.id} className={`flex items-start gap-2 rounded-lg px-3 py-2 ${k.resuelto ? 'bg-white/[0.02]' : 'bg-[#fab219]/10 border border-[#fab219]/30'}`}>
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-[#3ecf8e]"
            checked={k.resuelto}
            disabled={editar.isPending}
            onChange={(e) => editar.mutate({ id: k.id, resuelto: e.target.checked })}
            aria-label={k.resuelto ? 'Marcar como sin resolver' : 'Marcar como resuelto'}
          />
          <div className="min-w-0 flex-1">
            <p className={`text-sm whitespace-pre-wrap break-words ${k.resuelto ? 'text-[#5f7891] line-through' : 'text-[#e6eef7]'}`}>{k.texto}</p>
            <p className="mt-0.5 text-[11px] text-[#5f7891]">
              {autorDe(k.creado_por)} · {fechaHora(k.created_at)}
              {k.resuelto && ` · resuelto${k.resuelto_por ? ` por ${autorDe(k.resuelto_por)}` : ''}${k.resuelto_at ? ` el ${fechaHora(k.resuelto_at)}` : ''}`}
            </p>
          </div>
          <button type="button" className="text-[#5f7891] hover:text-red-400 shrink-0" aria-label="Borrar comentario"
            onClick={() => { if (window.confirm('¿Borrar este comentario?')) borrar.mutate(k.id); }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <form onSubmit={agregar} className="flex gap-2">
        <textarea
          className={`${inputClass} min-h-[2.5rem]`}
          rows={2}
          maxLength={2000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Qué quiere cambiar o iterar la clienta…"
          aria-label="Nuevo comentario"
        />
        <button type="submit" className={`${btnPrimary} self-start`} disabled={crear.isPending || !texto.trim()}>Agregar</button>
      </form>
      <ErrorBox error={crear.error || editar.error || borrar.error} />
    </div>
  );
}

export function VistaCambios({ chatbot, datos }) {
  const crear = useCrearCambio(chatbot);
  const editar = useEditarCambio();
  const borrar = useBorrarCambio();
  const [edicion, setEdicion] = useState(null);
  const [estado, setEstado] = useState('');
  const [soloPendientes, setSoloPendientes] = useState(false);
  // id → true/false cuando la persona abre o cierra el hilo; sin tocar, se abre solo si hay algo sin resolver.
  const [hilos, setHilos] = useState({});
  const porNota = new Map();
  (datos.comentarios || []).forEach((k) => porNota.set(k.cambio_id, [...(porNota.get(k.cambio_id) || []), k]));
  const sinResolver = (id) => (porNota.get(id) || []).filter((k) => !k.resuelto).length;
  const totalSinResolver = (datos.cambios || []).filter((c) => sinResolver(c.id) > 0).length;
  const lista = (datos.cambios || [])
    .filter((c) => !estado || c.estado === estado)
    .filter((c) => !soloPendientes || sinResolver(c.id) > 0);
  const vacio = { fecha: hoyISO(), hallazgo: '', accion: '', donde: '', efecto: '', estado: 'hecho' };

  const guardar = (f) => {
    const op = f.id ? editar : crear;
    op.mutate(f, { onSuccess: () => setEdicion(null) });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select className={`${inputClass} !w-auto`} value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_CAMBIO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button
            type="button"
            className={`${btnGhost} ${soloPendientes ? '!border-[#fab219] !text-[#fab219]' : ''}`}
            aria-pressed={soloPendientes}
            onClick={() => setSoloPendientes((v) => !v)}
          >
            <MessageSquare className="w-4 h-4" /> Con comentarios sin resolver
            {totalSinResolver > 0 && <span className="rounded-full bg-[#fab219] px-1.5 text-[10px] font-bold text-[#0a1628]">{totalSinResolver}</span>}
          </button>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setEdicion(vacio)}><Plus className="w-4 h-4" /> Registrar cambio</button>
      </div>
      <ErrorBox error={borrar.error} />
      {lista.length === 0 && <div className={`${card} p-4`}><Vacio>{soloPendientes ? 'No hay notas con comentarios sin resolver.' : 'Sin cambios registrados.'}</Vacio></div>}
      {lista.map((c) => {
        const comentarios = porNota.get(c.id) || [];
        const pendientes = sinResolver(c.id);
        const abierto = hilos[c.id] ?? pendientes > 0;
        return (
        <article key={c.id} className={`${card} p-4 ${pendientes > 0 ? '!border-[#fab219]/60 shadow-[0_0_0_1px_rgba(250,178,25,0.25)]' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-[#9aafc3]">
              <span className="tabular-nums">{fechaCorta(c.fecha)}</span>
              <Pill color={ESTADOS_CAMBIO[c.estado]?.color || '#9aafc3'}>{ESTADOS_CAMBIO[c.estado]?.label || c.estado}</Pill>
              {pendientes > 0 && <Pill color={AMBAR}><MessageSquare className="w-3 h-3" /> {pendientes} sin resolver</Pill>}
              {c.donde && <span className="text-[#5f7891]">· {c.donde}</span>}
            </div>
            <div className="flex gap-1">
              <button type="button" className={btnGhost} aria-expanded={abierto} onClick={() => setHilos((h) => ({ ...h, [c.id]: !abierto }))}>
                <MessageSquare className="w-3.5 h-3.5" /> {comentarios.length > 0 ? `Comentarios (${comentarios.length})` : 'Comentar'}
              </button>
              <button type="button" className={btnGhost} onClick={() => setEdicion(c)} aria-label="Editar"><Pencil className="w-3.5 h-3.5" /></button>
              <button type="button" className={btnGhost} aria-label="Borrar" onClick={() => { if (window.confirm('¿Borrar este cambio del registro?')) borrar.mutate(c.id); }}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm md:grid-cols-3">
            <div><dt className="text-[11px] uppercase tracking-wider text-[#5f7891]">Se encontró</dt><dd className="text-[#c4d3e2]">{c.hallazgo}</dd></div>
            <div><dt className="text-[11px] uppercase tracking-wider text-[#5f7891]">Se hizo</dt><dd className="text-[#c4d3e2]">{c.accion}</dd></div>
            <div><dt className="text-[11px] uppercase tracking-wider text-[#5f7891]">Efecto esperado</dt><dd className="text-[#c4d3e2]">{c.efecto || '–'}</dd></div>
          </dl>
          {abierto && <Comentarios cambioId={c.id} comentarios={comentarios} />}
        </article>
        );
      })}
      {edicion && (
        <FormCambio inicial={edicion} onCerrar={() => setEdicion(null)} onGuardar={guardar}
          guardando={crear.isPending || editar.isPending} error={crear.error || editar.error} />
      )}
    </div>
  );
}

// ── Cada mes ─────────────────────────────────────────────────────────────────
function useFormMes(chatbot, clave, fila) {
  const [estado, setEstado] = useState(() => ({
    checklist: fila?.checklist || {}, checklist_cliente: fila?.checklist_cliente || {},
    notas: fila?.notas || '', decisiones: fila?.decisiones || '',
  }));
  const guardar = useGuardarMes(chatbot);
  const enviar = (cambios, extra = {}) => {
    const siguiente = { ...estado, ...cambios };
    setEstado(siguiente);
    guardar.mutate({ clave, ...siguiente, ...extra });
  };
  return { estado, setEstado, guardar, enviar };
}

// El estado local se reinicia al cambiar de mes (key en el padre), no al refrescar.
function CuerpoMes({ chatbot, clave, fila }) {
  const { estado, setEstado, guardar, enviar } = useFormMes(chatbot, clave, fila);
  const prog = progreso(CHECKLIST_MENSUAL, estado.checklist);
  const sucio = estado.notas !== (fila?.notas || '');
  return (
    <div className="space-y-4">
      <section className={`${card} p-4`}>
        <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-white font-medium">Checklist de {nombreMes(clave)}</h3><div className="w-40"><Barra hechos={prog.hechos} total={prog.total} /></div></div>
        <Checks secciones={CHECKLIST_MENSUAL} checks={estado.checklist} onCambio={(c) => enviar({ checklist: c })} />
      </section>
      <section className={`${card} p-4`}>
        <label className={labelClass} htmlFor="notas-mes">Notas y conclusiones del mes</label>
        <textarea id="notas-mes" className={inputClass} rows={6} value={estado.notas} onChange={(e) => setEstado((x) => ({ ...x, notas: e.target.value }))} />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#5f7891]">{guardar.isPending ? 'Guardando…' : guardar.isSuccess && !sucio ? 'Guardado' : sucio ? 'Cambios sin guardar' : ''}</span>
          <button type="button" className={btnPrimary} disabled={guardar.isPending || !sucio} onClick={() => enviar({})}><Save className="w-4 h-4" /> Guardar notas</button>
        </div>
        <ErrorBox error={guardar.error} />
      </section>
    </div>
  );
}

export function VistaMes({ chatbot, datos, mes, setMes }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><span className="text-sm text-[#9aafc3]">Mes auditado</span><SelectorMes valor={mes} onChange={setMes} /></div>
      <CuerpoMes key={mes} chatbot={chatbot} clave={mes} fila={filaMes(datos, mes)} />
    </div>
  );
}

// ── Reunión con la clienta ───────────────────────────────────────────────────
function TablaCifras({ m, prev, base, mesActual, mesPrevio }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-[#5f7891]">
            <th className="py-2 pr-3 font-medium">Cifra</th>
            <th className="py-2 px-3 font-medium text-right">Línea base</th>
            <th className="py-2 px-3 font-medium text-right">{nombreMes(mesPrevio)}</th>
            <th className="py-2 px-3 font-medium text-right">{nombreMes(mesActual)}</th>
            <th className="py-2 pl-3 font-medium">Vs. mes anterior</th>
          </tr>
        </thead>
        <tbody>
          {CIFRAS.map((c) => {
            const a = m ? c.valor(m) : null;
            const p = prev ? c.valor(prev) : null;
            const b = base ? c.valor(base) : null;
            const clave = CIFRAS_CLAVE.includes(c.id);
            return (
              <tr key={c.id} className="border-t border-white/5">
                <td className={`py-2 pr-3 ${clave ? 'text-white font-medium' : 'text-[#c4d3e2]'}`}>{c.label}</td>
                <td className="py-2 px-3 text-right tabular-nums text-[#9aafc3]">{formatear(c, b)}</td>
                <td className="py-2 px-3 text-right tabular-nums text-[#9aafc3]">{formatear(c, p)}</td>
                <td className="py-2 px-3 text-right tabular-nums text-white">{formatear(c, a)}</td>
                <td className="py-2 pl-3"><Variacion cifra={c} actual={a} previo={p} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CuerpoReunion({ chatbot, datos, mes }) {
  const previo = mesAnterior(mes);
  const actual = useIndicadores(chatbot, mes);
  const anterior = useIndicadores(chatbot, previo);
  const fila = filaMes(datos, mes);
  const base = filaMes(datos, 'linea-base')?.indicadores;
  const { estado, setEstado, guardar, enviar } = useFormMes(chatbot, mes, fila);
  const m = actual.data?.indicadores;
  const prev = anterior.data?.indicadores || filaMes(datos, previo)?.indicadores;
  const prog = progreso(CHECKLIST_REUNION, estado.checklist_cliente);
  const sucio = estado.decisiones !== (fila?.decisiones || '');

  return (
    <div className="space-y-4">
      <Seccion titulo="Guion de la reunión (unos 10 minutos)" icon={ClipboardCheck}>
        <ol className="space-y-2">
          {GUION_REUNION.map((g, i) => (
            <li key={g.titulo} className="flex gap-3 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a3050] text-[11px] text-[#67c8f3]">{i + 1}</span>
              <span><span className="text-white font-medium">{g.titulo}.</span> <span className="text-[#9aafc3]">{g.texto}</span></span>
            </li>
          ))}
        </ol>
      </Seccion>

      <Seccion titulo={`Cifras para presentar · ${nombreMes(mes)}`} extra={actual.data?.generado ? `leído ${new Date(actual.data.generado).toLocaleTimeString('es-CL', { timeStyle: 'short' })}` : ''}>
        <ErrorBox error={actual.error || anterior.error} />
        {actual.isLoading && <Vacio>Calculando las cifras…</Vacio>}
        {m && <TablaCifras m={m} prev={prev} base={base} mesActual={mes} mesPrevio={previo} />}
        {!base && m && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-[#fab219]/30 bg-[#fab219]/10 px-3 py-2 text-xs text-[#fab219]">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" /> Todavía no hay línea base cargada: la columna queda vacía.
          </p>
        )}
        {m && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px] text-[#5f7891]">{fila?.indicadores ? 'Ya hay una foto guardada de este mes.' : 'Guarda la foto para comparar el mes siguiente sin recalcular.'}</span>
            <button type="button" className={btnGhost} disabled={guardar.isPending} onClick={() => enviar({}, { indicadores: m })}><Save className="w-4 h-4" /> Guardar foto de cifras</button>
          </div>
        )}
      </Seccion>

      <section className={`${card} p-4`}>
        <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-white font-medium">Antes, durante y después</h3><div className="w-40"><Barra hechos={prog.hechos} total={prog.total} /></div></div>
        <Checks secciones={CHECKLIST_REUNION} checks={estado.checklist_cliente} onCambio={(c) => enviar({ checklist_cliente: c })} />
      </section>

      <section className={`${card} p-4`}>
        <label className={labelClass} htmlFor="decisiones-mes">Decisiones de la clienta</label>
        <textarea id="decisiones-mes" className={inputClass} rows={4} value={estado.decisiones} onChange={(e) => setEstado((x) => ({ ...x, decisiones: e.target.value }))} />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#5f7891]">{guardar.isPending ? 'Guardando…' : sucio ? 'Cambios sin guardar' : guardar.isSuccess ? 'Guardado' : ''}</span>
          <button type="button" className={btnPrimary} disabled={guardar.isPending || !sucio} onClick={() => enviar({})}><Save className="w-4 h-4" /> Guardar decisiones</button>
        </div>
        <ErrorBox error={guardar.error} />
      </section>
    </div>
  );
}

export function VistaReunion({ chatbot, datos, mes, setMes }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><span className="text-sm text-[#9aafc3]">Reunión del mes</span><SelectorMes valor={mes} onChange={setMes} /></div>
      <CuerpoReunion key={mes} chatbot={chatbot} datos={datos} mes={mes} />
    </div>
  );
}

// ── Pendientes ───────────────────────────────────────────────────────────────
function FormPendiente({ inicial, onGuardar, onCerrar, guardando, error }) {
  const [f, setF] = useState(inicial);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Modal titulo={inicial.id ? 'Editar pendiente' : 'Nuevo pendiente'} onClose={onCerrar} ancho="max-w-lg">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onGuardar(f); }}>
        <div><label className={labelClass}>Título</label><input className={inputClass} value={f.titulo} onChange={set('titulo')} required /></div>
        <div><label className={labelClass}>Detalle</label><textarea className={inputClass} rows={3} value={f.detalle} onChange={set('detalle')} /></div>
        <div><label className={labelClass}>Prioridad</label>
          <select className={inputClass} value={f.prioridad} onChange={set('prioridad')}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select>
        </div>
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={onCerrar}>Cancelar</button><button type="submit" className={btnPrimary} disabled={guardando}>Guardar</button></div>
      </form>
    </Modal>
  );
}

export function VistaPendientes({ chatbot, datos }) {
  const crear = useCrearPendiente(chatbot);
  const editar = useEditarPendiente();
  const borrar = useBorrarPendiente();
  const [edicion, setEdicion] = useState(null);
  const abiertos = (datos.pendientes || []).filter((p) => !p.hecho);
  const hechos = (datos.pendientes || []).filter((p) => p.hecho);
  const vacio = { titulo: '', detalle: '', prioridad: 'media' };

  const guardar = (f) => {
    const op = f.id ? editar : crear;
    op.mutate(f, { onSuccess: () => setEdicion(null) });
  };
  const fila = (p) => (
    <li key={p.id} className="flex items-start gap-3 px-4 py-3">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[#248bde]" checked={p.hecho} aria-label={`Marcar «${p.titulo}»`} onChange={(e) => editar.mutate({ id: p.id, hecho: e.target.checked })} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><span className={`text-sm ${p.hecho ? 'line-through text-[#5f7891]' : 'text-white'}`}>{p.titulo}</span><PrioridadChip prioridad={p.prioridad} /></div>
        {p.detalle && <p className="mt-0.5 text-xs text-[#9aafc3] whitespace-pre-line">{p.detalle}</p>}
      </div>
      <button type="button" className={btnGhost} onClick={() => setEdicion(p)} aria-label="Editar"><Pencil className="w-3.5 h-3.5" /></button>
      <button type="button" className={btnGhost} aria-label="Borrar" onClick={() => { if (window.confirm('¿Borrar este pendiente?')) borrar.mutate(p.id); }}><Trash2 className="w-3.5 h-3.5" /></button>
    </li>
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button type="button" className={btnPrimary} onClick={() => setEdicion(vacio)}><Plus className="w-4 h-4" /> Nuevo pendiente</button></div>
      <ErrorBox error={editar.error || borrar.error} />
      <section className={card}>
        <h3 className="flex items-center gap-2 px-4 pt-3 text-sm font-medium text-white"><AlertTriangle className="w-4 h-4 text-[#fab219]" aria-hidden="true" /> Abiertos ({abiertos.length})</h3>
        {abiertos.length === 0 ? <Vacio>Sin pendientes abiertos.</Vacio> : <ul className="divide-y divide-white/5">{abiertos.map(fila)}</ul>}
      </section>
      {hechos.length > 0 && (
        <section className={card}>
          <h3 className="flex items-center gap-2 px-4 pt-3 text-sm font-medium text-white"><CheckCircle2 className="w-4 h-4 text-[#3ecf8e]" aria-hidden="true" /> Hechos ({hechos.length})</h3>
          <ul className="divide-y divide-white/5">{hechos.map(fila)}</ul>
        </section>
      )}
      {edicion && <FormPendiente inicial={edicion} onCerrar={() => setEdicion(null)} onGuardar={guardar} guardando={crear.isPending || editar.isPending} error={crear.error} />}
    </div>
  );
}
