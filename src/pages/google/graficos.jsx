// Piezas visuales del panel Herramientas Google. SVG propio (sin librería).
// Color de serie validado con dataviz/validate_palette.js en modo oscuro (#0d1e30):
// una sola serie por gráfico (azul), mapa de calor = la misma tonalidad de claro a
// oscuro, estados con su color reservado + ícono + texto (nunca color solo).
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Search, TrendingUp, XCircle } from 'lucide-react';
import { card, inputClass } from '../tareas/ui';
import { ESTADO, SERIE, diaCorto, entero } from './formato';

export function Seccion({ titulo, icon = TrendingUp, extra, children, className = '' }) {
  const Icon = icon;
  return (
    <section className={`${card} p-4 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h3 className="text-white font-medium flex items-center gap-2"><Icon className="w-4 h-4 text-[#67c8f3]" /> {titulo}</h3>
        {extra && <span className="text-[11px] text-[#5f7891]">{extra}</span>}
      </div>
      {children}
    </section>
  );
}

export function Kpi({ titulo, valor, detalle, estado }) {
  const Icon = estado === 'bien' ? CheckCircle2 : estado === 'alerta' ? XCircle : estado === 'mejorar' ? AlertTriangle : null;
  return (
    <div className={`${card} px-4 py-3`}>
      <div className="text-xs text-[#9aafc3] flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: ESTADO[estado] }} aria-hidden="true" />}
        {titulo}
      </div>
      <div className="text-white text-xl font-semibold mt-1 tabular-nums">{valor}</div>
      {detalle && <div className="text-[11px] text-[#9aafc3] mt-0.5">{detalle}</div>}
    </div>
  );
}

export function Vacio({ children = 'Sin datos en este período.' }) {
  return <div className="text-sm text-[#5f7891] py-6 text-center">{children}</div>;
}

// Barras verticales en el tiempo (una serie). `datos`: [{ x: 'AAAA-MM-DD', v }]
export function BarrasTiempo({ datos, formato = entero, etiqueta, alto = 170 }) {
  const [activo, setActivo] = useState(null);
  if (!datos?.length || datos.every((d) => !d.v)) return <Vacio />;
  const W = 640, H = alto, padL = 44, padB = 22, padT = 8;
  const max = Math.max(...datos.map((d) => d.v), 1);
  const paso = (W - padL) / datos.length;
  const ancho = Math.max(Math.min(paso - 2, 22), 2);
  const y = (v) => padT + (H - padB - padT) * (1 - v / max);
  const marcas = [0, max / 2, max];
  const cadaN = Math.ceil(datos.length / 8);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${etiqueta} por día`}>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={padL} x2={W} y1={y(m)} y2={y(m)} stroke="#ffffff" strokeOpacity="0.06" />
            <text x={padL - 6} y={y(m) + 3} textAnchor="end" fontSize="10" fill="#5f7891">{formato(m)}</text>
          </g>
        ))}
        {datos.map((d, i) => {
          const cx = padL + paso * i + paso / 2;
          const h = Math.max(H - padB - y(d.v), d.v > 0 ? 2 : 0);
          return (
            <g key={d.x}>
              {h > 0 && <rect x={cx - ancho / 2} y={H - padB - h} width={ancho} height={h} rx={Math.min(4, ancho / 2)} fill={SERIE} opacity={activo == null || activo === i ? 1 : 0.45} />}
              {i % cadaN === 0 && <text x={cx} y={H - 6} textAnchor="middle" fontSize="10" fill="#5f7891">{diaCorto(d.x)}</text>}
              <rect x={padL + paso * i} y={0} width={paso} height={H - padB} fill="transparent" onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)} />
            </g>
          );
        })}
      </svg>
      {activo != null && (
        <div className="pointer-events-none absolute top-1 right-2 rounded-lg border border-white/10 bg-[#0a1628]/95 px-3 py-1.5 text-xs text-[#cfe0f0]">
          <span className="text-[#9aafc3]">{diaCorto(datos[activo].x)} · </span>{etiqueta}: <b className="text-white">{formato(datos[activo].v)}</b>
        </div>
      )}
    </div>
  );
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
// celdas: [{ dia: 0..6 (Lun..Dom), hora: 0..23, v }]
export function MapaCalor({ celdas, formato = entero, etiqueta }) {
  const [activo, setActivo] = useState(null);
  const mapa = useMemo(() => {
    const m = new Map();
    for (const c of celdas || []) m.set(`${c.dia}-${c.hora}`, (m.get(`${c.dia}-${c.hora}`) || 0) + (c.v || 0));
    return m;
  }, [celdas]);
  const max = Math.max(...mapa.values(), 0);
  if (!max) return <Vacio>Todavía no hay datos por hora.</Vacio>;
  const W = 640, celdaW = (W - 36) / 24, celdaH = 18, H = celdaH * 7 + 18;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${etiqueta} por día de la semana y hora`}>
        {DIAS.map((d, di) => (
          <text key={d} x={30} y={di * celdaH + celdaH * 0.7} textAnchor="end" fontSize="10" fill="#9aafc3">{d}</text>
        ))}
        {Array.from({ length: 24 }, (_, h) => (
          h % 3 === 0 && <text key={h} x={36 + h * celdaW + celdaW / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="#5f7891">{h}h</text>
        ))}
        {DIAS.map((_, di) => Array.from({ length: 24 }, (_, h) => {
          const v = mapa.get(`${di}-${h}`) || 0;
          return (
            <rect key={`${di}-${h}`} x={36 + h * celdaW + 1} y={di * celdaH + 1} width={celdaW - 2} height={celdaH - 2} rx="3"
              fill={v ? SERIE : '#ffffff'} fillOpacity={v ? 0.18 + 0.82 * (v / max) : 0.04}
              stroke={activo === `${di}-${h}` ? '#ffffff' : 'none'}
              onMouseEnter={() => setActivo(`${di}-${h}`)} onMouseLeave={() => setActivo(null)} />
          );
        }))}
      </svg>
      {activo && (() => {
        const [di, h] = activo.split('-').map(Number);
        return (
          <div className="pointer-events-none absolute -top-2 right-2 rounded-lg border border-white/10 bg-[#0a1628]/95 px-3 py-1.5 text-xs text-[#cfe0f0]">
            {DIAS[di]} {h}:00–{h}:59 · {etiqueta}: <b className="text-white">{formato(mapa.get(activo) || 0)}</b>
          </div>
        );
      })()}
      <div className="mt-1 flex items-center gap-2 text-[11px] text-[#5f7891]">
        menos <span className="h-2 w-16 rounded" style={{ background: `linear-gradient(90deg, ${SERIE}2e, ${SERIE})` }} /> más
      </div>
    </div>
  );
}

// Ranking horizontal. filas: [{ etiqueta, v, detalle? }]
export function BarrasH({ filas, formato = entero, max: limite = 10 }) {
  if (!filas?.length || filas.every((f) => !f.v)) return <Vacio />;
  const datos = [...filas].sort((a, b) => b.v - a.v).slice(0, limite);
  const max = Math.max(...datos.map((f) => f.v), 1);
  return (
    <div className="space-y-1.5">
      {datos.map((f) => (
        <div key={f.etiqueta} className="text-xs" title={f.detalle || ''}>
          <div className="flex justify-between gap-2 text-[#cfe0f0]">
            <span className="truncate">{f.etiqueta}</span>
            <span className="tabular-nums text-white shrink-0">{formato(f.v)}{f.detalle && <span className="text-[#5f7891]"> · {f.detalle}</span>}</span>
          </div>
          <div className="h-1.5 rounded bg-white/5 mt-0.5">
            <div className="h-1.5 rounded" style={{ width: `${(f.v / max) * 100}%`, background: SERIE }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Tabla ordenable con buscador. columnas: [{ titulo, valor(f), orden?(f), num? }]
export function Tabla({ columnas, filas, buscar, minWidth = 640, limite = 100, vacio }) {
  const [orden, setOrden] = useState(null);
  const [q, setQ] = useState('');
  const visibles = useMemo(() => {
    let r = filas || [];
    if (buscar && q) r = r.filter((f) => String(buscar(f)).toLowerCase().includes(q.toLowerCase()));
    if (orden) {
      const c = columnas[orden.i];
      const fn = c.orden || c.valor;
      r = [...r].sort((a, b) => {
        const va = fn(a), vb = fn(b);
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
        return orden.asc ? cmp : -cmp;
      });
    }
    return r;
  }, [filas, q, orden, columnas, buscar]);
  if (!filas?.length) return <Vacio>{vacio}</Vacio>;
  return (
    <div>
      {buscar && (
        <div className="relative mb-2 max-w-xs">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-[#5f7891]" />
          <input className={`${inputClass} pl-8`} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead>
            <tr className="text-left text-xs text-[#9aafc3]">
              {columnas.map((c, i) => (
                <th key={c.titulo} className={`px-3 py-2 font-medium whitespace-nowrap ${c.num ? 'text-right' : ''}`}>
                  {c.sinOrden ? c.titulo : (
                    <button type="button" className="inline-flex items-center gap-1 hover:text-white" onClick={() => setOrden((o) => ({ i, asc: o?.i === i ? !o.asc : false }))}>
                      {c.titulo}
                      {orden?.i === i && (orden.asc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.slice(0, limite).map((f, i) => (
              <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02]">
                {columnas.map((c) => (
                  <td key={c.titulo} className={`px-3 py-2 text-[#cfe0f0] ${c.num ? 'text-right tabular-nums whitespace-nowrap' : ''}`}>{c.render ? c.render(f) : c.valor(f)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visibles.length > limite && <div className="text-[11px] text-[#5f7891] mt-2">Mostrando {limite} de {visibles.length}.</div>}
    </div>
  );
}

const ICONO = { bien: CheckCircle2, mejorar: AlertTriangle, alerta: XCircle };
const NIVEL = { bien: 'Va bien', mejorar: 'Mejorar', alerta: 'Urgente' };
export function Hallazgo({ h, onOcultar, onMostrar }) {
  const [abierto, setAbierto] = useState(false);
  const Icon = ICONO[h.nivel] || AlertTriangle;
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <button type="button" className="w-full text-left px-3 py-2.5 flex gap-3 items-start" onClick={() => setAbierto((a) => !a)}>
        <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: ESTADO[h.nivel] }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="text-sm text-white">
            <span className="text-[11px] uppercase tracking-wide mr-2" style={{ color: ESTADO[h.nivel] }}>{NIVEL[h.nivel]} · {h.area}</span>
            {h.titulo}
          </div>
          {h.detalle && <div className="text-xs text-[#9aafc3] mt-0.5">{h.detalle}</div>}
        </div>
        <span className="text-[11px] text-[#5f7891] shrink-0">{abierto ? 'Cerrar' : 'Ver cómo'}</span>
      </button>
      {abierto && (
        <dl className="px-10 pb-3 grid gap-2 text-xs">
          {h.como && <div><dt className="text-[#67c8f3]">Cómo mejorarlo</dt><dd className="text-[#cfe0f0]">{h.como}</dd></div>}
          {h.por_que && <div><dt className="text-[#67c8f3]">Por qué</dt><dd className="text-[#cfe0f0]">{h.por_que}</dd></div>}
          {h.esperar && <div><dt className="text-[#67c8f3]">Qué esperar</dt><dd className="text-[#cfe0f0]">{h.esperar}</dd></div>}
        </dl>
      )}
      {(onOcultar || onMostrar) && h.clave && h.nivel !== 'bien' && (
        <div className="px-10 pb-2.5 flex flex-wrap gap-2 text-[11px]">
          {onOcultar && (
            <>
              <button type="button" className="rounded border border-white/15 px-2 py-0.5 text-[#9aafc3] hover:text-white" onClick={() => onOcultar(h.clave, 7)}>Ya lo hice · ocultar 7 días</button>
              <button type="button" className="rounded border border-white/15 px-2 py-0.5 text-[#9aafc3] hover:text-white" onClick={() => onOcultar(h.clave, 30)}>Ocultar 30 días</button>
            </>
          )}
          {onMostrar && (
            <>
              <span className="text-[#5f7891] py-0.5">Oculto hasta el {new Date(h.oculto_hasta).toLocaleDateString('es-CL')}</span>
              <button type="button" className="rounded border border-white/15 px-2 py-0.5 text-[#9aafc3] hover:text-white" onClick={() => onMostrar(h.clave)}>Volver a mostrar</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
