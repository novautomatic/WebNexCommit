// Small hand-rolled charts for the tasks summary (no chart library).
// Conventions: thin marks, 2px surface gaps between stacked segments, 4px rounded
// data ends, legend always present for >1 series, values in text ink (never the
// series color), hover tooltip on every mark, and a table view for each chart.
import React, { useState } from 'react';
import { ESTADO, ORDEN_GRAFICOS } from '../../hooks/tareas';

const INK = '#e6eef7';
const INK_2 = '#9aafc3';

export function Leyenda({ conteos, ids = ORDEN_GRAFICOS }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Leyenda">
      {ids.map((id) => (
        <li key={id} className="flex items-center gap-1.5" style={{ color: INK_2 }}>
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: ESTADO[id].color }} aria-hidden="true" />
          {ESTADO[id].label}
          {conteos && <span style={{ color: INK }}>{conteos[id] ?? 0}</span>}
        </li>
      ))}
    </ul>
  );
}

function Tooltip({ info }) {
  if (!info) return null;
  return (
    <div
      role="tooltip"
      className="fixed z-[80] pointer-events-none rounded-lg border border-white/15 bg-[#0a1628] px-3 py-2 text-xs shadow-xl"
      style={{ left: info.x + 14, top: info.y + 14, color: INK, maxWidth: 260 }}
    >
      <div className="font-semibold mb-1">{info.titulo}</div>
      {info.filas.map((f) => (
        <div key={f.label} className="flex items-center gap-2" style={{ color: INK_2 }}>
          {f.color && <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: f.color }} />}
          <span className="flex-1">{f.label}</span>
          <span style={{ color: INK }}>{f.valor}</span>
        </div>
      ))}
    </div>
  );
}

function filasEstado(conteos) {
  return ORDEN_GRAFICOS.filter((id) => conteos[id]).map((id) => ({
    label: ESTADO[id].label, color: ESTADO[id].color, valor: conteos[id],
  }));
}

// One horizontal stacked bar. `escala` = width of a unit in % of the track.
function Barra({ conteos, escala, alto = 12, onMover, onSalir }) {
  const ids = ORDEN_GRAFICOS.filter((id) => conteos[id] > 0);
  return (
    <div className="flex gap-[2px]" style={{ height: alto }} onMouseMove={onMover} onMouseLeave={onSalir}>
      {ids.map((id, i) => (
        <div
          key={id}
          style={{
            width: `${conteos[id] * escala}%`,
            backgroundColor: ESTADO[id].color,
            borderTopLeftRadius: i === 0 ? 4 : 0,
            borderBottomLeftRadius: i === 0 ? 4 : 0,
            borderTopRightRadius: i === ids.length - 1 ? 4 : 0,
            borderBottomRightRadius: i === ids.length - 1 ? 4 : 0,
            minWidth: 3,
          }}
        />
      ))}
    </div>
  );
}

// 100% bar of the whole set (hero progress).
export function BarraAvance({ conteos }) {
  const [tip, setTip] = useState(null);
  const total = ORDEN_GRAFICOS.reduce((s, id) => s + (conteos[id] || 0), 0);
  if (!total) return <p className="text-sm" style={{ color: INK_2 }}>Sin tareas con estos filtros.</p>;
  return (
    <>
      <Barra
        conteos={conteos}
        escala={100 / total}
        alto={16}
        onMover={(e) => setTip({ x: e.clientX, y: e.clientY, titulo: `${total} tareas`, filas: filasEstado(conteos) })}
        onSalir={() => setTip(null)}
      />
      <Tooltip info={tip} />
    </>
  );
}

// Rows of stacked bars on a shared count scale (e.g. per project / per person).
export function BarrasApiladas({ filas, onElegir, vacio = 'Sin datos.' }) {
  const [tip, setTip] = useState(null);
  const [tabla, setTabla] = useState(false);
  const maximo = Math.max(1, ...filas.map((f) => f.total));

  if (!filas.length) return <p className="text-sm" style={{ color: INK_2 }}>{vacio}</p>;

  return (
    <div>
      <div className="flex justify-end -mt-1 mb-2">
        <button type="button" onClick={() => setTabla((t) => !t)} className="text-[11px] underline underline-offset-2" style={{ color: INK_2 }}>
          {tabla ? 'Ver gráfico' : 'Ver como tabla'}
        </button>
      </div>
      {tabla ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ color: INK_2 }}>
            <thead>
              <tr>
                <th className="text-left font-medium py-1 pr-2">Nombre</th>
                {ORDEN_GRAFICOS.map((id) => <th key={id} className="text-right font-medium py-1 px-1">{ESTADO[id].label}</th>)}
                <th className="text-right font-medium py-1 pl-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} className="border-t border-white/5">
                  <td className="py-1 pr-2" style={{ color: INK }}>{f.nombre}</td>
                  {ORDEN_GRAFICOS.map((id) => <td key={id} className="text-right py-1 px-1">{f.conteos[id] || 0}</td>)}
                  <td className="text-right py-1 pl-2" style={{ color: INK }}>{f.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filas.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onElegir?.(f.id)}
                disabled={!onElegir}
                className="w-full text-left grid grid-cols-[minmax(90px,30%)_1fr_auto] items-center gap-3 py-1 rounded-md hover:bg-white/[0.03] disabled:cursor-default"
                onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, titulo: f.nombre, filas: filasEstado(f.conteos) })}
                onMouseLeave={() => setTip(null)}
              >
                <span className="text-xs truncate flex items-center gap-1.5" style={{ color: INK }}>
                  {f.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} aria-hidden="true" />}
                  {f.nombre}
                </span>
                <Barra conteos={f.conteos} escala={100 / maximo} />
                <span className="text-xs tabular-nums" style={{ color: INK_2 }}>{f.total}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Tooltip info={tip} />
    </div>
  );
}

// Vertical bars, one series (completed per week). Labels: hovered bar + the last one.
export function BarrasSemanas({ semanas, color }) {
  const [activa, setActiva] = useState(null);
  const [tip, setTip] = useState(null);
  const [tabla, setTabla] = useState(false);
  const maximo = Math.max(1, ...semanas.map((s) => s.valor));
  const ultima = semanas.length - 1;

  return (
    <div>
      <div className="flex justify-end -mt-1 mb-2">
        <button type="button" onClick={() => setTabla((t) => !t)} className="text-[11px] underline underline-offset-2" style={{ color: INK_2 }}>
          {tabla ? 'Ver gráfico' : 'Ver como tabla'}
        </button>
      </div>
      {tabla ? (
        <table className="w-full text-xs" style={{ color: INK_2 }}>
          <tbody>
            {semanas.map((s) => (
              <tr key={s.etiqueta} className="border-t border-white/5">
                <td className="py-1">Semana del {s.etiqueta}</td>
                <td className="py-1 text-right" style={{ color: INK }}>{s.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <div className="relative h-36 flex items-end gap-2 border-b border-white/10" onMouseLeave={() => { setActiva(null); setTip(null); }}>
            {semanas.map((s, i) => (
              <div
                key={s.etiqueta}
                className="flex-1 h-full flex flex-col justify-end items-center"
                onMouseMove={(e) => { setActiva(i); setTip({ x: e.clientX, y: e.clientY, titulo: `Semana del ${s.etiqueta}`, filas: [{ label: 'Completadas', valor: s.valor, color }] }); }}
              >
                {(i === activa || (activa === null && i === ultima)) && (
                  <span className="text-[11px] mb-1 tabular-nums" style={{ color: INK }}>{s.valor}</span>
                )}
                <div
                  className="w-full max-w-[28px] transition-opacity"
                  style={{
                    height: `${(s.valor / maximo) * 100}%`,
                    minHeight: s.valor ? 3 : 0,
                    backgroundColor: color,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    opacity: activa === null || activa === i ? 1 : 0.55,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-1.5">
            {semanas.map((s) => (
              <span key={s.etiqueta} className="flex-1 text-center text-[10px] truncate" style={{ color: INK_2 }}>{s.etiqueta}</span>
            ))}
          </div>
        </>
      )}
      <Tooltip info={tip} />
    </div>
  );
}
