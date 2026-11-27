// Panel → Gestión → Cobros (solo dueños): cuándo y cuánto se le cobra a cada
// cliente. Arriba, los cobros del mes (anotar el extra, marcar cobrado y
// pagado); abajo, los cobros mensuales de cada cliente (monto fijo, si lleva
// extra, día de cobro y plazo). El día de cobro, el cron `cobros-generar` crea
// el cobro del mes y manda el correo a los dueños a través de Avisos.
import React, { useState } from 'react';
import {
  AlertTriangle, Ban, CalendarClock, Check, ChevronLeft, ChevronRight, CircleDollarSign, Pencil, Plus, Repeat, Trash2, Undo2,
} from 'lucide-react';
import {
  useBorrarCobro, useBorrarCobroMensual, useCobros, useCobrosMensuales, useGuardarCobro, useGuardarCobroMensual,
} from '../../hooks/cobros';
import { useClientes } from '../../hooks/tareas';
import { ErrorBox, Modal, Pill, btnGhost, btnPrimary, card, inputClass, labelClass } from '../tareas/ui';

const ESTADOS = {
  por_cobrar: { label: 'Por cobrar', color: '#f59e0b' },
  cobrado: { label: 'Cobrado · esperando pago', color: '#67c8f3' },
  pagado: { label: 'Pagado', color: '#22c55e' },
  anulado: { label: 'Anulado', color: '#9aafc3' },
};
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ULTIMO_DIA = 31;

const pesos = (n) => `$${Math.round(Number(n || 0)).toLocaleString('es-CL')}`;
const soloNumero = (v) => Number(String(v ?? '').replace(/\D/g, '')) || 0;
const hoySantiago = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
const periodoDe = (iso) => iso.slice(0, 7);
const nombreMes = (periodo) => {
  const [a, m] = periodo.split('-').map(Number);
  return `${MESES[m - 1]} ${a}`;
};
const moverMes = (periodo, n) => {
  const [a, m] = periodo.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
const fechaCorta = (iso) => (iso ? iso.split('-').reverse().join('-') : '—');
const sumarDias = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
// Misma regla que public.cobro_fecha(): el día pedido o el último del mes.
const fechaDelMes = (periodo, dia) => {
  const [a, m] = periodo.split('-').map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return `${periodo}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`;
};
const textoDia = (dia) => (dia >= ULTIMO_DIA ? 'el último día del mes' : `el día ${dia}`);

// Próximo cobro que todavía no se ha creado (para la lista de cobros mensuales).
function proximoCobro(cm, hoy, generados) {
  let periodo = periodoDe(hoy);
  for (let i = 0; i < 14; i += 1, periodo = moverMes(periodo, 1)) {
    const f = fechaDelMes(periodo, cm.dia_cobro);
    if (f >= cm.inicio && (f > hoy || (f === hoy && !generados.has(`${cm.id}|${periodo}`)))) return f;
  }
  return null;
}

function nombreCliente(clientes, id) {
  const c = clientes.find((x) => x.id === id);
  return c ? (c.empresa?.trim() || c.nombre) : 'Cliente';
}

// ─── Cobro (fila del mes) ─────────────────────────────────────────────────────
function FilaCobro({ cobro, clientes, hoy, periodoVista, onEditar }) {
  const guardar = useGuardarCobro();
  const [extra, setExtra] = useState(cobro.monto_extra ? String(cobro.monto_extra) : '');
  const e = ESTADOS[cobro.estado];
  const atrasado = cobro.estado === 'por_cobrar' && cobro.vence_el < hoy;
  const deOtroMes = cobro.periodo !== periodoVista;
  const extraCambio = soloNumero(extra) !== (cobro.monto_extra || 0);
  const estado = (nuevo) => guardar.mutate({ id: cobro.id, estado: nuevo });

  return (
    <div className={`${card} p-4 ${atrasado ? 'border-amber-500/40' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white">{nombreCliente(clientes, cobro.cliente_id)}</span>
            <Pill color={e.color}>{e.label}</Pill>
            {atrasado && <Pill color="#f87171"><AlertTriangle className="w-3 h-3" /> Atrasado</Pill>}
            {deOtroMes && <Pill color="#a78bfa">De {nombreMes(cobro.periodo)}</Pill>}
            {!cobro.cobro_cliente_id && <Pill color="#9aafc3">Puntual</Pill>}
          </div>
          <div className="mt-1 text-sm text-[#9aafc3]">
            {cobro.concepto} · cobrar el {fechaCorta(cobro.fecha_cobro)}
            {cobro.vence_el > cobro.fecha_cobro && ` (plazo hasta el ${fechaCorta(cobro.vence_el)})`}
          </div>
          {cobro.notas && <div className="mt-1 text-xs text-[#9aafc3] whitespace-pre-line">{cobro.notas}</div>}
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold text-white">{pesos(cobro.total)}</div>
          <div className="text-xs text-[#9aafc3]">
            {pesos(cobro.monto_fijo)} fijo{cobro.tiene_extra || cobro.monto_extra ? ` + ${pesos(cobro.monto_extra)} extra` : ''}
          </div>
        </div>
      </div>

      {cobro.tiene_extra && cobro.estado === 'por_cobrar' && (
        <form
          className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-white/5 p-3"
          onSubmit={(ev) => { ev.preventDefault(); guardar.mutate({ id: cobro.id, monto_extra: soloNumero(extra) }); }}
        >
          <div className="flex-1 min-w-[200px]">
            <label className={labelClass}>Extra: {cobro.extra_detalle}</label>
            <input className={inputClass} inputMode="numeric" placeholder="$0" value={extra} onChange={(ev) => setExtra(ev.target.value)} />
          </div>
          <button className={btnGhost} disabled={!extraCambio || guardar.isPending}>Guardar extra</button>
          <span className="text-xs text-[#9aafc3] pb-2">Total: {pesos(cobro.monto_fijo + soloNumero(extra))}</span>
        </form>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {cobro.estado === 'por_cobrar' && (
          <button type="button" className={btnPrimary} disabled={guardar.isPending || extraCambio} title={extraCambio ? 'Guarda el extra primero' : undefined}
            onClick={() => estado('cobrado')}>
            <Check className="w-4 h-4" /> Marcar cobrado
          </button>
        )}
        {['por_cobrar', 'cobrado'].includes(cobro.estado) && (
          <button type="button" className={cobro.estado === 'cobrado' ? btnPrimary : btnGhost} disabled={guardar.isPending || extraCambio}
            onClick={() => estado('pagado')}>
            <CircleDollarSign className="w-4 h-4" /> Marcar pagado
          </button>
        )}
        {cobro.estado !== 'por_cobrar' && (
          <button type="button" className={btnGhost} disabled={guardar.isPending} onClick={() => estado(cobro.estado === 'pagado' ? 'cobrado' : 'por_cobrar')}>
            <Undo2 className="w-4 h-4" /> Deshacer
          </button>
        )}
        {cobro.estado !== 'anulado' && cobro.estado !== 'pagado' && (
          <button type="button" className={btnGhost} disabled={guardar.isPending} onClick={() => estado('anulado')}>
            <Ban className="w-4 h-4" /> Anular
          </button>
        )}
        <button type="button" className={btnGhost} onClick={() => onEditar(cobro)}><Pencil className="w-4 h-4" /> Editar</button>
      </div>
      {cobro.estado === 'pagado' && cobro.pagado_at && (
        <p className="mt-2 text-xs text-[#9aafc3]">Pagado el {new Date(cobro.pagado_at).toLocaleDateString('es-CL')}.</p>
      )}
      <ErrorBox error={guardar.error} />
    </div>
  );
}

// ─── Editor de un cobro (puntual o del mes) ───────────────────────────────────
function EditorCobro({ inicial, clientes, hoy, onClose }) {
  const guardar = useGuardarCobro();
  const borrar = useBorrarCobro();
  const nuevo = !inicial?.id;
  const [c, setC] = useState(() => ({
    cliente_id: '', concepto: '', monto_fijo: '', monto_extra: '', fecha_cobro: hoy, plazo: 1, notas: '',
    ...inicial,
    ...(inicial?.id ? {
      monto_fijo: String(inicial.monto_fijo || ''), monto_extra: String(inicial.monto_extra || ''),
      plazo: Math.round((new Date(inicial.vence_el) - new Date(inicial.fecha_cobro)) / 86_400_000) + 1,
    } : {}),
  }));
  const set = (x) => setC((p) => ({ ...p, ...x }));

  const enviar = async (ev) => {
    ev.preventDefault();
    const plazo = Math.max(1, Number(c.plazo) || 1);
    await guardar.mutateAsync({
      ...(nuevo ? {} : { id: c.id }),
      cliente_id: c.cliente_id,
      concepto: c.concepto.trim(),
      monto_fijo: soloNumero(c.monto_fijo),
      monto_extra: soloNumero(c.monto_extra),
      fecha_cobro: c.fecha_cobro,
      vence_el: sumarDias(c.fecha_cobro, plazo - 1),
      notas: c.notas?.trim() || null,
      ...(nuevo ? { periodo: periodoDe(c.fecha_cobro) } : {}),
    });
    onClose();
  };
  const eliminar = async () => {
    if (!window.confirm('¿Borrar este cobro? Si es un error de anotación está bien; si no se cobró, mejor «Anular».')) return;
    await borrar.mutateAsync(c.id);
    onClose();
  };

  return (
    <Modal titulo={nuevo ? 'Agregar cobro puntual' : 'Editar cobro'} onClose={onClose}>
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Cliente</label>
            <select className={inputClass} value={c.cliente_id} onChange={(e) => set({ cliente_id: e.target.value })} required disabled={!nuevo}>
              <option value="">Elegir…</option>
              {clientes.filter((x) => x.activo || x.id === c.cliente_id).map((x) => (
                <option key={x.id} value={x.id}>{x.empresa?.trim() || x.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Concepto</label>
            <input className={inputClass} value={c.concepto} onChange={(e) => set({ concepto: e.target.value })} placeholder="Desarrollo web, cuota 1…" required />
          </div>
          <div>
            <label className={labelClass}>Monto (CLP)</label>
            <input className={inputClass} inputMode="numeric" value={c.monto_fijo} onChange={(e) => set({ monto_fijo: e.target.value })} placeholder="40.000" required />
          </div>
          <div>
            <label className={labelClass}>Extra (CLP, opcional)</label>
            <input className={inputClass} inputMode="numeric" value={c.monto_extra} onChange={(e) => set({ monto_extra: e.target.value })} placeholder="0" />
          </div>
          <div>
            <label className={labelClass}>Fecha de cobro</label>
            <input type="date" className={inputClass} value={c.fecha_cobro} onChange={(e) => set({ fecha_cobro: e.target.value })} required disabled={!nuevo && Boolean(c.cobro_cliente_id)} />
          </div>
          <div>
            <label className={labelClass}>Días para cobrarlo</label>
            <input type="number" min="1" max="60" className={inputClass} value={c.plazo} onChange={(e) => set({ plazo: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Notas</label>
          <textarea className={`${inputClass} min-h-[70px]`} value={c.notas || ''} onChange={(e) => set({ notas: e.target.value })} placeholder="N° de factura, cómo pagó…" />
        </div>
        <p className="text-xs text-[#9aafc3]">Total: {pesos(soloNumero(c.monto_fijo) + soloNumero(c.monto_extra))}. Los cobros puntuales no mandan correo: quedan anotados aquí.</p>
        <ErrorBox error={guardar.error || borrar.error} />
        <div className="flex flex-wrap justify-between gap-2">
          {!nuevo ? <button type="button" className={`${btnGhost} text-red-300`} onClick={eliminar}><Trash2 className="w-4 h-4" /> Borrar</button> : <span />}
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
            <button className={btnPrimary} disabled={guardar.isPending}>Guardar</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Editor de cobro mensual ──────────────────────────────────────────────────
function EditorMensual({ inicial, clientes, hoy, onClose }) {
  const guardar = useGuardarCobroMensual();
  const borrar = useBorrarCobroMensual();
  const nuevo = !inicial?.id;
  const [m, setM] = useState(() => ({
    cliente_id: '', concepto: 'Mensualidad', monto_fijo: '', tiene_extra: false, extra_detalle: '', dia_cobro: ULTIMO_DIA,
    plazo_dias: 1, inicio: hoy, activo: true, notas: '', ...inicial,
    ...(inicial?.id ? { monto_fijo: String(inicial.monto_fijo || '') } : {}),
  }));
  const set = (x) => setM((p) => ({ ...p, ...x }));

  const enviar = async (ev) => {
    ev.preventDefault();
    await guardar.mutateAsync({
      ...(nuevo ? {} : { id: m.id }),
      cliente_id: m.cliente_id,
      concepto: m.concepto.trim(),
      monto_fijo: soloNumero(m.monto_fijo),
      tiene_extra: m.tiene_extra,
      extra_detalle: m.tiene_extra ? m.extra_detalle.trim() : null,
      dia_cobro: Number(m.dia_cobro),
      plazo_dias: Number(m.plazo_dias) || 1,
      inicio: m.inicio,
      activo: m.activo,
      notas: m.notas?.trim() || null,
    });
    onClose();
  };
  const eliminar = async () => {
    if (!window.confirm('¿Borrar este cobro mensual? Los cobros ya anotados se mantienen. Si solo quieres pausarlo, desactívalo.')) return;
    await borrar.mutateAsync(m.id);
    onClose();
  };

  return (
    <Modal titulo={nuevo ? 'Nuevo cobro mensual' : 'Editar cobro mensual'} onClose={onClose}>
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Cliente</label>
            <select className={inputClass} value={m.cliente_id} onChange={(e) => set({ cliente_id: e.target.value })} required>
              <option value="">Elegir…</option>
              {clientes.filter((x) => x.activo || x.id === m.cliente_id).map((x) => (
                <option key={x.id} value={x.id}>{x.empresa?.trim() || x.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Concepto</label>
            <input className={inputClass} value={m.concepto} onChange={(e) => set({ concepto: e.target.value })} required />
          </div>
          <div>
            <label className={labelClass}>Monto fijo mensual (CLP)</label>
            <input className={inputClass} inputMode="numeric" value={m.monto_fijo} onChange={(e) => set({ monto_fijo: e.target.value })} placeholder="140.000" required />
          </div>
          <div>
            <label className={labelClass}>Día de cobro</label>
            <select className={inputClass} value={m.dia_cobro} onChange={(e) => set({ dia_cobro: Number(e.target.value) })}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>Día {d}</option>)}
              <option value={ULTIMO_DIA}>Último día del mes</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Días para cobrarlo</label>
            <select className={inputClass} value={m.plazo_dias} onChange={(e) => set({ plazo_dias: Number(e.target.value) })}>
              {[1, 2, 3, 5, 7, 10, 15].map((d) => <option key={d} value={d}>{d === 1 ? 'Ese mismo día' : `${d} días`}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Empieza a cobrarse desde</label>
            <input type="date" className={inputClass} value={m.inicio} onChange={(e) => set({ inicio: e.target.value })} required />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-white">
          <input type="checkbox" checked={m.tiene_extra} onChange={(e) => set({ tiene_extra: e.target.checked })} />
          Lleva un extra variable cada mes
        </label>
        {m.tiene_extra && (
          <div>
            <label className={labelClass}>¿Qué es el extra?</label>
            <input className={inputClass} value={m.extra_detalle || ''} onChange={(e) => set({ extra_detalle: e.target.value })}
              placeholder="Costos asociados a ventas del mes anterior" required />
          </div>
        )}
        <div>
          <label className={labelClass}>Notas</label>
          <textarea className={`${inputClass} min-h-[60px]`} value={m.notas || ''} onChange={(e) => set({ notas: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-white">
          <input type="checkbox" checked={m.activo} onChange={(e) => set({ activo: e.target.checked })} />
          Activo (crea el cobro y manda el correo cada mes)
        </label>
        <p className="text-xs text-[#9aafc3]">
          Se cobra {textoDia(Number(m.dia_cobro))}{Number(m.plazo_dias) > 1 ? `, con ${m.plazo_dias} días de plazo` : ''}. Ese día, a partir de las
          09:00, llega un correo a los dueños: «Anotar cobro … por {pesos(soloNumero(m.monto_fijo))}{m.tiene_extra ? ' + extra' : ''}».
        </p>
        <ErrorBox error={guardar.error || borrar.error} />
        <div className="flex flex-wrap justify-between gap-2">
          {!nuevo ? <button type="button" className={`${btnGhost} text-red-300`} onClick={eliminar}><Trash2 className="w-4 h-4" /> Borrar</button> : <span />}
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
            <button className={btnPrimary} disabled={guardar.isPending}>Guardar</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function CobrosAdmin() {
  const hoy = hoySantiago();
  const [periodo, setPeriodo] = useState(periodoDe(hoy));
  const [editCobro, setEditCobro] = useState(null);
  const [editMensual, setEditMensual] = useState(null);
  const clientesQ = useClientes();
  const mensualesQ = useCobrosMensuales();
  const cobrosQ = useCobros(periodo);
  const clientes = clientesQ.data || [];
  const mensuales = mensualesQ.data || [];
  const cobros = cobrosQ.data || [];

  const delMes = cobros.filter((c) => c.periodo === periodo && c.estado !== 'anulado');
  const suma = (estado) => delMes.filter((c) => c.estado === estado).reduce((s, c) => s + c.total, 0);
  const totales = { por_cobrar: suma('por_cobrar'), cobrado: suma('cobrado'), pagado: suma('pagado') };
  const atrasados = cobros.filter((c) => c.periodo < periodo);
  const generados = new Set(cobros.filter((c) => c.cobro_cliente_id).map((c) => `${c.cobro_cliente_id}|${c.periodo}`));
  // Cobros mensuales de este mes que todavía no llegan a su día.
  const pendientesDelMes = mensuales.filter((cm) => {
    const f = fechaDelMes(periodo, cm.dia_cobro);
    return cm.activo && f >= cm.inicio && !generados.has(`${cm.id}|${periodo}`) && f >= hoy;
  });

  const cargando = clientesQ.isLoading || mensualesQ.isLoading || cobrosQ.isLoading;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Cobros</h1>
          <p className="text-sm text-[#9aafc3]">
            Qué se le cobra a cada cliente y cuándo. El día de cobro llega un correo a los dueños y el cobro aparece aquí para anotar el extra y marcarlo.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={() => setEditCobro({})}><Plus className="w-4 h-4" /> Cobro puntual</button>
          <button type="button" className={btnPrimary} onClick={() => setEditMensual({})}><Repeat className="w-4 h-4" /> Nuevo cobro mensual</button>
        </div>
      </div>

      <ErrorBox error={clientesQ.error || mensualesQ.error || cobrosQ.error} />

      {/* ── Cobros del mes ── */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" className={btnGhost} onClick={() => setPeriodo(moverMes(periodo, -1))} aria-label="Mes anterior"><ChevronLeft className="w-4 h-4" /></button>
            <h2 className="min-w-[170px] text-center text-lg font-semibold capitalize text-white">{nombreMes(periodo)}</h2>
            <button type="button" className={btnGhost} onClick={() => setPeriodo(moverMes(periodo, 1))} aria-label="Mes siguiente"><ChevronRight className="w-4 h-4" /></button>
            {periodo !== periodoDe(hoy) && <button type="button" className={btnGhost} onClick={() => setPeriodo(periodoDe(hoy))}>Hoy</button>}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[['por_cobrar', 'Por cobrar'], ['cobrado', 'Cobrado, esperando pago'], ['pagado', 'Pagado']].map(([k, label]) => (
            <div key={k} className={`${card} p-4`}>
              <div className="text-xs text-[#9aafc3]">{label}</div>
              <div className="mt-1 text-2xl font-semibold" style={{ color: ESTADOS[k].color }}>{pesos(totales[k])}</div>
            </div>
          ))}
        </div>

        {cargando && <p className="text-sm text-[#9aafc3]">Cargando…</p>}

        {atrasados.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-amber-300">Sin pagar de meses anteriores</h3>
            {atrasados.map((c) => <FilaCobro key={c.id} cobro={c} clientes={clientes} hoy={hoy} periodoVista={periodo} onEditar={setEditCobro} />)}
          </div>
        )}

        {cobros.filter((c) => c.periodo === periodo).map((c) => (
          <FilaCobro key={`${c.id}-${c.monto_extra}`} cobro={c} clientes={clientes} hoy={hoy} periodoVista={periodo} onEditar={setEditCobro} />
        ))}

        {pendientesDelMes.length > 0 && (
          <div className={`${card} p-4`}>
            <h3 className="flex items-center gap-2 text-sm font-medium text-white"><CalendarClock className="w-4 h-4 text-[#67c8f3]" /> Por llegar este mes</h3>
            <ul className="mt-2 space-y-1 text-sm text-[#9aafc3]">
              {pendientesDelMes.map((cm) => (
                <li key={cm.id}>
                  {fechaCorta(fechaDelMes(periodo, cm.dia_cobro))} · <span className="text-white">{nombreCliente(clientes, cm.cliente_id)}</span> · {cm.concepto} · {pesos(cm.monto_fijo)}{cm.tiene_extra ? ' + extra' : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!cargando && !cobros.length && !pendientesDelMes.length && (
          <p className={`${card} p-4 text-sm text-[#9aafc3]`}>No hay cobros en {nombreMes(periodo)}.</p>
        )}
      </section>

      {/* ── Cobros mensuales ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Cobros mensuales</h2>
        {!mensuales.length && !cargando && (
          <p className={`${card} p-4 text-sm text-[#9aafc3]`}>Todavía no hay cobros mensuales. Crea uno por cliente con «Nuevo cobro mensual».</p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {mensuales.map((cm) => {
            const prox = proximoCobro(cm, hoy, generados);
            return (
              <div key={cm.id} className={`${card} p-4 ${cm.activo ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{nombreCliente(clientes, cm.cliente_id)}</span>
                      {!cm.activo && <Pill color="#9aafc3">Pausado</Pill>}
                    </div>
                    <div className="text-sm text-[#9aafc3]">{cm.concepto}</div>
                  </div>
                  <button type="button" className={btnGhost} onClick={() => setEditMensual(cm)} aria-label="Editar"><Pencil className="w-4 h-4" /></button>
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {pesos(cm.monto_fijo)}{cm.tiene_extra && <span className="text-sm font-normal text-[#9aafc3]"> + {cm.extra_detalle?.toLowerCase()}</span>}
                </div>
                <div className="mt-1 text-xs text-[#9aafc3]">
                  Se cobra {textoDia(cm.dia_cobro)}{cm.plazo_dias > 1 ? `, plazo ${cm.plazo_dias} días` : ''}.
                  {cm.activo && prox && <> Próximo: <span className="text-white">{fechaCorta(prox)}</span>.</>}
                </div>
                {cm.notas && <div className="mt-1 text-xs text-[#9aafc3] whitespace-pre-line">{cm.notas}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {editCobro && <EditorCobro inicial={editCobro} clientes={clientes} hoy={hoy} onClose={() => setEditCobro(null)} />}
      {editMensual && <EditorMensual inicial={editMensual} clientes={clientes} hoy={hoy} onClose={() => setEditMensual(null)} />}
    </div>
  );
}
