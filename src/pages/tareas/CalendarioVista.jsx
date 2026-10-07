import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { ESTADO, estaAbierta, hoyISO } from '../../hooks/tareas';
import { Leyenda } from './graficos';
import { btnGhost, card } from './ui';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_POR_DIA = 3;

const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function Chip({ t, hoy, onAbrir, completo = false }) {
  const e = ESTADO[t.estado];
  const cerrada = !estaAbierta(t);
  const vencida = !cerrada && t.fecha_limite < hoy;
  return (
    <button
      type="button"
      onClick={() => onAbrir(t)}
      title={`${t.titulo} · ${e.label}${vencida ? ' · Vencida' : ''}`}
      className={`w-full text-left flex items-center gap-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.09] pl-1.5 pr-1 ${
        completo ? 'py-1.5 text-sm' : 'py-0.5 text-[11px]'
      } ${vencida ? 'ring-1 ring-[#e66767]/70' : ''}`}
      style={{ borderLeft: `3px solid ${e.color}` }}
    >
      {vencida && <AlertTriangle className="w-3 h-3 shrink-0 text-[#f2b8b8]" aria-label="Vencida" />}
      {t.estado === 'completada' && <Check className="w-3 h-3 shrink-0 text-[#9aafc3]" aria-label="Completada" />}
      <span className={`truncate ${cerrada ? 'text-[#9aafc3] line-through' : 'text-[#e6eef7]'}`}>{t.titulo}</span>
      {completo && <span className="ml-auto text-[11px] text-[#9aafc3] whitespace-nowrap">{e.label}</span>}
    </button>
  );
}

export default function CalendarioVista({ tareas, onAbrir }) {
  const hoy = hoyISO();
  const [mes, setMes] = useState(() => {
    const [y, m] = hoy.split('-').map(Number);
    return { y, m: m - 1 };
  });
  const [diaAbierto, setDiaAbierto] = useState(null);

  const porDia = useMemo(() => {
    const mapa = new Map();
    for (const t of tareas) {
      if (!t.fecha_limite || t.estado === 'cancelada') continue;
      if (!mapa.has(t.fecha_limite)) mapa.set(t.fecha_limite, []);
      mapa.get(t.fecha_limite).push(t);
    }
    // Open first, then by state order.
    for (const lista of mapa.values()) lista.sort((a, b) => Number(!estaAbierta(a)) - Number(!estaAbierta(b)));
    return mapa;
  }, [tareas]);

  const celdas = useMemo(() => {
    const primero = new Date(mes.y, mes.m, 1);
    const desfase = (primero.getDay() + 6) % 7; // Monday first
    const diasMes = new Date(mes.y, mes.m + 1, 0).getDate();
    const total = Math.ceil((desfase + diasMes) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(mes.y, mes.m, i - desfase + 1);
      return { iso: iso(d.getFullYear(), d.getMonth(), d.getDate()), dia: d.getDate(), delMes: d.getMonth() === mes.m };
    });
  }, [mes]);

  const mesTexto = new Date(mes.y, mes.m, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  const nombreMes = mesTexto.charAt(0).toUpperCase() + mesTexto.slice(1);
  const mover = (delta) => {
    setDiaAbierto(null);
    setMes(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };
  const irHoy = () => {
    const [y, m] = hoy.split('-').map(Number);
    setMes({ y, m: m - 1 });
    setDiaAbierto(null);
  };

  const diasConTareas = celdas.filter((c) => c.delMes && porDia.has(c.iso));
  const sinFecha = tareas.filter((t) => estaAbierta(t) && !t.fecha_limite).length;
  const abiertoLista = diaAbierto ? porDia.get(diaAbierto) || [] : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className={btnGhost} onClick={() => mover(-1)} aria-label="Mes anterior"><ChevronLeft className="w-4 h-4" /></button>
          <h2 className="text-lg font-semibold text-white min-w-[160px] text-center">{nombreMes}</h2>
          <button type="button" className={btnGhost} onClick={() => mover(1)} aria-label="Mes siguiente"><ChevronRight className="w-4 h-4" /></button>
          <button type="button" className={btnGhost} onClick={irHoy}>Hoy</button>
        </div>
        <Leyenda />
      </div>

      {/* Month grid (tablet/desktop). */}
      <div className={`${card} hidden md:block overflow-hidden`}>
        <div className="grid grid-cols-7 border-b border-white/10">
          {DIAS.map((d) => <div key={d} className="px-2 py-2 text-xs font-medium text-[#9aafc3]">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {celdas.map((c) => {
            const lista = porDia.get(c.iso) || [];
            const esHoy = c.iso === hoy;
            return (
              <div
                key={c.iso}
                className={`min-h-[112px] border-b border-r border-white/5 p-1.5 flex flex-col gap-1 ${c.delMes ? '' : 'opacity-40'} ${
                  diaAbierto === c.iso ? 'bg-white/[0.04]' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                      esHoy ? 'bg-[#248bde] text-white font-semibold' : 'text-[#9aafc3]'
                    }`}
                  >
                    {c.dia}
                  </span>
                </div>
                {lista.slice(0, MAX_POR_DIA).map((t) => <Chip key={t.id} t={t} hoy={hoy} onAbrir={onAbrir} />)}
                {lista.length > MAX_POR_DIA && (
                  <button
                    type="button"
                    onClick={() => setDiaAbierto(diaAbierto === c.iso ? null : c.iso)}
                    className="text-[11px] text-[#9aafc3] hover:text-white text-left px-1"
                  >
                    +{lista.length - MAX_POR_DIA} más
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {diaAbierto && (
        <div className={`${card} p-4 hidden md:block`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">
              {new Date(`${diaAbierto}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <button type="button" className="text-xs text-[#9aafc3] hover:text-white" onClick={() => setDiaAbierto(null)}>Cerrar</button>
          </div>
          <div className="space-y-1.5">{abiertoLista.map((t) => <Chip key={t.id} t={t} hoy={hoy} onAbrir={onAbrir} completo />)}</div>
        </div>
      )}

      {/* Agenda (phones). */}
      <div className="md:hidden space-y-3">
        {!diasConTareas.length && <p className="text-sm text-[#9aafc3]">No hay tareas con fecha en este mes.</p>}
        {diasConTareas.map((c) => (
          <div key={c.iso} className={`${card} p-3`}>
            <div className={`text-xs mb-2 capitalize ${c.iso === hoy ? 'text-[#67c8f3] font-semibold' : 'text-[#9aafc3]'}`}>
              {c.iso === hoy ? 'Hoy · ' : ''}
              {new Date(`${c.iso}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
            <div className="space-y-1.5">{porDia.get(c.iso).map((t) => <Chip key={t.id} t={t} hoy={hoy} onAbrir={onAbrir} completo />)}</div>
          </div>
        ))}
      </div>

      {sinFecha > 0 && (
        <p className="text-xs text-[#9aafc3]">
          {sinFecha} tarea{sinFecha === 1 ? '' : 's'} abierta{sinFecha === 1 ? '' : 's'} sin fecha límite no aparece{sinFecha === 1 ? '' : 'n'} en el calendario.
        </p>
      )}
    </div>
  );
}
