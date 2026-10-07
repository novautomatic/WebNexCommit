// Small shared UI pieces for the tasks panel (admin dark theme).
import React from 'react';
import { ESTADO, PRIORIDAD } from '../../hooks/tareas';

export const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#67c8f3] transition-colors';
export const labelClass = 'block text-xs font-medium text-[#9aafc3] mb-1';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#248bde] hover:bg-[#2f9bf0] text-white transition-colors disabled:opacity-50';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-[#9aafc3] hover:text-white hover:bg-white/5 border border-white/10 transition-colors disabled:opacity-50';
export const card = 'rounded-xl border border-white/10 bg-[#0d1e30]';

export function Pill({ color, children, title }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ color, backgroundColor: `${color}1f`, border: `1px solid ${color}40` }}
    >
      {children}
    </span>
  );
}

export function EstadoPill({ estado }) {
  const e = ESTADO[estado];
  return e ? <Pill color={e.color}>{e.label}</Pill> : null;
}

export function PrioridadPill({ prioridad }) {
  const p = PRIORIDAD[prioridad];
  return p ? <Pill color={p.color}>{p.label}</Pill> : null;
}

export function Avatar({ nombre, size = 24 }) {
  if (!nombre) {
    return (
      <span
        title="Sin asignar"
        className="inline-flex items-center justify-center rounded-full border border-dashed border-white/20 text-[10px] text-[#9aafc3]"
        style={{ width: size, height: size }}
      >
        ?
      </span>
    );
  }
  const iniciales = nombre.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <span
      title={nombre}
      className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#248bde] to-[#67c8f3] text-white font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {iniciales}
    </span>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {error.message || String(error)}
    </div>
  );
}

export function Modal({ titulo, onClose, children, ancho = 'max-w-2xl' }) {
  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-10"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className={`w-full ${ancho} ${card} shadow-2xl`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold">{titulo}</h2>
          <button type="button" onClick={onClose} className="text-[#9aafc3] hover:text-white text-xl leading-none" aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
