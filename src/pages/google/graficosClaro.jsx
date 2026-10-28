// Gráficos de «Resumen claro». SVG propio, mismo estilo que graficos.jsx.
// Azul = periodo elegido; naranja punteado = periodo de comparación (par validado con
// dataviz/validate_palette.js sobre #0d1e30); meta = línea gris rotulada.
import { useState } from 'react';
import { COMPARA, SERIE, entero } from './formato';
import { fechaCorta } from './resumenLectura';
import { Vacio } from './graficos';

// Mini tendencia para las tarjetas (sin ejes). actual/anterior: [{ x, v }]
export function Sparkline({ actual, anterior, alto = 34 }) {
  if (!actual?.length || actual.every((d) => !d.v)) return <div style={{ height: alto }} />;
  const W = 160, H = alto;
  const n = Math.max(actual.length, anterior?.length || 0);
  const max = Math.max(...actual.map((d) => d.v), ...(anterior || []).map((d) => d.v), 1);
  const x = (i) => (n > 1 ? (i / (n - 1)) * (W - 4) + 2 : W / 2);
  const y = (v) => H - 3 - (v / max) * (H - 6);
  const linea = (s) => s.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join('');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: alto }} aria-hidden="true" preserveAspectRatio="none">
      {anterior?.length > 0 && <path d={linea(anterior)} fill="none" stroke={COMPARA} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" vectorEffect="non-scaling-stroke" />}
      <path d={linea(actual)} fill="none" stroke={SERIE} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

// Avance hacia la meta. tipo 'minimo' (llegar) o 'maximo' (no pasarse).
export function BarraMeta({ valor, meta, tipo = 'minimo', formato = entero }) {
  if (meta == null || !(meta > 0) || valor == null) return null;
  const r = valor / meta;
  const tope = Math.max(r, 1) * 1.05;
  const ok = tipo === 'maximo' ? r <= 1 : r >= 1;
  const color = ok ? '#0ca30c' : (tipo === 'maximo' ? r <= 1.2 : r >= 0.7) ? '#fab219' : '#d03b3b';
  return (
    <div className="mt-2" title={`Meta del periodo: ${formato(meta)}`}>
      <div className="relative h-1.5 rounded bg-white/10">
        <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${Math.min(r / tope, 1) * 100}%`, background: color }} />
        <div className="absolute -top-1 -bottom-1 w-0.5 bg-white/70 rounded" style={{ left: `${(1 / tope) * 100}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-[#9aafc3] mt-0.5">
        <span>{tipo === 'maximo' ? 'Tope' : 'Meta'} del periodo: {formato(meta)}</span>
        <span className="tabular-nums">{Math.round(r * 100)}%</span>
      </div>
    </div>
  );
}

// Tendencia del periodo vs. el de comparación, alineados por día (día 1, día 2…).
export function LineasComparadas({ actual, anterior, formato = entero, etiqueta, meta = null }) {
  const [activo, setActivo] = useState(null);
  if (!actual?.length || (actual.every((d) => !d.v) && !(anterior || []).some((d) => d.v))) return <Vacio />;
  const W = 680, H = 210, padL = 48, padR = 10, padB = 24, padT = 10;
  const n = Math.max(actual.length, anterior?.length || 0);
  const max = Math.max(...actual.map((d) => d.v), ...(anterior || []).map((d) => d.v), meta || 0, 1);
  const x = (i) => padL + (n > 1 ? (i / (n - 1)) * (W - padL - padR) : (W - padL - padR) / 2);
  const y = (v) => padT + (H - padB - padT) * (1 - v / max);
  const linea = (s) => s.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join('');
  const area = `${linea(actual)}L${x(actual.length - 1)},${H - padB}L${x(0)},${H - padB}Z`;
  const marcas = [0, max / 2, max];
  const cadaN = Math.ceil(n / 7);
  const a = activo != null ? actual[activo] : null;
  const b = activo != null ? anterior?.[activo] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${etiqueta} por día, periodo elegido${anterior ? ' y periodo de comparación' : ''}`}
        onMouseLeave={() => setActivo(null)}>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={padL} x2={W - padR} y1={y(m)} y2={y(m)} stroke="#ffffff" strokeOpacity="0.06" />
            <text x={padL - 6} y={y(m) + 3} textAnchor="end" fontSize="10" fill="#5f7891">{formato(m)}</text>
          </g>
        ))}
        {meta > 0 && (
          <g>
            <line x1={padL} x2={W - padR} y1={y(meta)} y2={y(meta)} stroke="#cfe0f0" strokeOpacity="0.55" strokeDasharray="2 4" />
            <text x={W - padR} y={y(meta) - 4} textAnchor="end" fontSize="10" fill="#cfe0f0">meta diaria {formato(meta)}</text>
          </g>
        )}
        <path d={area} fill={SERIE} opacity="0.12" />
        {anterior?.length > 0 && <path d={linea(anterior)} fill="none" stroke={COMPARA} strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />}
        <path d={linea(actual)} fill="none" stroke={SERIE} strokeWidth="2" strokeLinejoin="round" />
        {actual.map((d, i) => i % cadaN === 0 && (
          <text key={d.x} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#5f7891">{fechaCorta(d.x)}</text>
        ))}
        {activo != null && (
          <g>
            <line x1={x(activo)} x2={x(activo)} y1={padT} y2={H - padB} stroke="#ffffff" strokeOpacity="0.25" />
            {b && <circle cx={x(activo)} cy={y(b.v)} r="4" fill={COMPARA} stroke="#0d1e30" strokeWidth="2" />}
            {a && <circle cx={x(activo)} cy={y(a.v)} r="4" fill={SERIE} stroke="#0d1e30" strokeWidth="2" />}
          </g>
        )}
        {Array.from({ length: n }, (_, i) => (
          <rect key={i} x={x(i) - (W - padL - padR) / n / 2} y={0} width={(W - padL - padR) / n} height={H - padB} fill="transparent" onMouseEnter={() => setActivo(i)} />
        ))}
      </svg>
      {activo != null && (
        <div className="pointer-events-none absolute top-1 right-2 rounded-lg border border-white/10 bg-[#0a1628]/95 px-3 py-1.5 text-xs text-[#cfe0f0] space-y-0.5">
          {a && <div className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: SERIE }} />{fechaCorta(a.x)}: <b className="text-white">{formato(a.v)}</b></div>}
          {b && <div className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-0.5" style={{ background: COMPARA }} />{fechaCorta(b.x)}: <b className="text-white">{formato(b.v)}</b></div>}
        </div>
      )}
      <div className="flex flex-wrap gap-4 mt-1 text-[11px] text-[#9aafc3]">
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5" style={{ background: SERIE }} /> Periodo elegido</span>
        {anterior?.length > 0 && <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: COMPARA }} /> Periodo de comparación</span>}
      </div>
    </div>
  );
}

// Camino del cliente: cada paso es una barra; entre pasos, cuántos siguieron.
export function Embudo({ pasos }) {
  if (!pasos?.length) return <Vacio>Sin datos de anuncios en este periodo.</Vacio>;
  const max = Math.max(pasos[0].v, 1);
  return (
    <ol className="space-y-2.5">
      {pasos.map((p, i) => {
        // Escala raíz: con 1.000 impresiones y 3 contactos, la barra final igual se ve.
        const ancho = Math.max(Math.sqrt(p.v / max) * 100, p.v > 0 ? 3 : 0);
        return (
          <li key={p.etiqueta}>
            <div className="flex justify-between gap-2 text-xs">
              <span className="text-[#cfe0f0]">{i + 1}. {p.etiqueta}</span>
              <span className="text-white font-semibold tabular-nums">{entero(p.v)}</span>
            </div>
            <div className="h-3 rounded bg-white/5 mt-1">
              <div className="h-3 rounded" style={{ width: `${ancho}%`, background: SERIE, opacity: 1 - i * 0.12 }} />
            </div>
            {p.nota && <div className="text-[11px] text-[#9aafc3] mt-0.5">{p.nota}</div>}
          </li>
        );
      })}
    </ol>
  );
}
