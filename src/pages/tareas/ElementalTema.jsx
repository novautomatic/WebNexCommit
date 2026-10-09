// The elemental team (Llama, Aqua, Roca, Aire, Hoja) for the "Elemental 🔥"
// panel theme (default for jpa.pizarro@gmail.com, whose avatar is Llama). Simple
// SVG spirits drawn by hand for the internal panel only — never used on the
// public site.
import React, { useId } from 'react';

const ELEMENTOS = {
  llama: { label: 'Llama', rol: 'Líder / Guía', color: '#ff7a1a' },
  aqua: { label: 'Aqua', rol: 'Análisis / Claridad', color: '#3d9bff' },
  roca: { label: 'Roca', rol: 'Estructura / Estabilidad', color: '#c98a4b' },
  aire: { label: 'Aire', rol: 'Innovación / Movimiento', color: '#cfd8ff' },
  hoja: { label: 'Hoja', rol: 'Crecimiento / Bienestar', color: '#7ed957' },
};

const OSCURO = '#150d1c';

// Dark face with two glowing slanted eyes, shared by all five spirits.
const Cara = ({ cx = 50, cy = 62, rx = 19, ry = 16, brillo = '#ffd27a', dormido = false }) => (
  <g>
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={OSCURO} />
    {dormido ? (
      <>
        <path d={`M${cx - 14} ${cy} q5 4 10 0`} stroke={brillo} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d={`M${cx + 4} ${cy} q5 4 10 0`} stroke={brillo} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <path d={`M${cx - 15} ${cy - 3} Q${cx - 9} ${cy - 7} ${cx - 3} ${cy + 1} Q${cx - 9} ${cy + 3} ${cx - 15} ${cy - 3}Z`} fill={brillo} />
        <path d={`M${cx + 15} ${cy - 3} Q${cx + 9} ${cy - 7} ${cx + 3} ${cy + 1} Q${cx + 9} ${cy + 3} ${cx + 15} ${cy - 3}Z`} fill={brillo} />
      </>
    )}
  </g>
);

function Llama({ id, dormido }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#d6280f" />
          <stop offset="0.55" stopColor="#ff7a1a" />
          <stop offset="1" stopColor="#ffd34d" />
        </linearGradient>
      </defs>
      <path
        d="M50 3 C55 21 79 29 79 58 C79 79 66 95 50 95 C34 95 21 79 21 58 C21 44 30 38 34 27 C38 35 42 40 47 40 C42 26 44 13 50 3Z"
        fill={`url(#${id}-f)`}
      />
      <path d="M50 24 C54 34 66 40 66 56 C66 64 60 70 50 70 C40 70 34 64 34 56 C34 48 40 44 43 38 C46 42 48 44 51 44 C48 36 48 30 50 24Z" fill="#ffe08a" opacity="0.55" />
      <path d="M81 40 C84 46 90 48 90 56 C90 62 85 65 81 65 C78 65 76 62 76 59 C76 54 80 50 81 40Z" fill="#ff9a2e" />
      <Cara cy={63} brillo="#fff3b0" dormido={dormido} />
    </>
  );
}

function Aqua({ id, dormido }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd3ff" />
          <stop offset="0.5" stopColor="#3d9bff" />
          <stop offset="1" stopColor="#1d4fd8" />
        </linearGradient>
      </defs>
      <path d="M52 4 C52 4 20 38 20 62 C20 80 34 95 52 95 C68 95 82 82 82 64 C82 42 52 4 52 4Z" fill={`url(#${id}-a)`} />
      <path d="M34 52 C34 40 42 30 50 20" stroke="#d6efff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      <circle cx="86" cy="30" r="6" fill="#6fb8ff" opacity="0.85" />
      <circle cx="92" cy="46" r="3" fill="#6fb8ff" opacity="0.7" />
      <Cara cx={51} cy={64} brillo="#c8f1ff" dormido={dormido} />
    </>
  );
}

function Roca({ id, dormido }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9a468" />
          <stop offset="1" stopColor="#7a4a26" />
        </linearGradient>
      </defs>
      <polygon points="50,4 76,16 80,30 90,52 78,90 22,90 10,52 20,30 24,16" fill={`url(#${id}-r)`} stroke="#4a2a14" strokeWidth="1.5" />
      <polygon points="50,4 76,16 50,30 24,16" fill="#e8bb82" opacity="0.7" />
      <path d="M50 30 L50 44 M20 30 L34 46 M80 30 L66 46 M24 78 L36 70 M76 78 L64 70" stroke="#ff9a2e" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Cara cy={60} rx={20} ry={15} brillo="#ffc14d" dormido={dormido} />
    </>
  );
}

function Aire({ id, dormido }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-v`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#a8b6f0" />
        </linearGradient>
      </defs>
      <path d="M12 52 C12 20 40 6 62 12 C84 18 90 44 76 64 C70 72 78 82 70 90 C56 100 24 92 14 70 C12 64 12 58 12 52Z" fill={`url(#${id}-v)`} />
      <path d="M8 34 C22 14 52 8 70 20 C60 16 38 18 26 34" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M72 70 C84 70 92 62 90 54 C88 48 80 48 80 54" stroke="#dfe6ff" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Cara cx={46} cy={56} brillo="#7fe0ff" dormido={dormido} />
    </>
  );
}

function Hoja({ id, dormido }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8f25c" />
          <stop offset="1" stopColor="#2f9a2f" />
        </linearGradient>
      </defs>
      <path d="M50 2 C66 12 68 30 50 44 C32 30 34 12 50 2Z" fill={`url(#${id}-h)`} />
      <path d="M22 14 C38 14 46 26 40 40 C26 38 18 28 22 14Z" fill="#6cbf3a" />
      <path d="M78 14 C62 14 54 26 60 40 C74 38 82 28 78 14Z" fill="#6cbf3a" />
      <ellipse cx="50" cy="66" rx="30" ry="28" fill={`url(#${id}-h)`} />
      <path d="M50 8 L50 40" stroke="#e9ffb0" strokeWidth="1.6" opacity="0.7" />
      <Cara cy={64} brillo="#eaff8a" dormido={dormido} />
    </>
  );
}

const PERSONAJES = { llama: Llama, aqua: Aqua, roca: Roca, aire: Aire, hoja: Hoja };

// quien: a key of ELEMENTOS. `dormido` closes the eyes.
export function Elemento({ quien = 'llama', size = 56, className = '', style, titulo, dormido = false }) {
  const id = useId().replace(/:/g, '');
  const Comp = PERSONAJES[quien] || Llama;
  const { label } = ELEMENTOS[quien] || ELEMENTOS.llama;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      style={style}
      role={titulo ? 'img' : undefined}
      aria-label={titulo ? `${label}: ${titulo}` : undefined}
      aria-hidden={titulo ? undefined : true}
    >
      <Comp id={id} dormido={dormido} />
    </svg>
  );
}

// The five spirits as small colored dots in a row (header and group titles).
export function CincoElementos({ size = 16, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden="true">
      {Object.keys(ELEMENTOS).map((k) => <Elemento key={k} quien={k} size={size} />)}
    </span>
  );
}

// "Equipo elemental" banner for the summary view.
export function EquipoElemental() {
  return (
    <section className="elemental-banda rounded-xl p-4 xl:col-span-2" aria-label="Equipo elemental">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="elemental-titulo text-lg text-white">El equipo elemental</h2>
        <CincoElementos size={20} />
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(ELEMENTOS).map(([k, e], i) => (
          <li key={k} className="flex flex-col items-center gap-1 text-center">
            <Elemento quien={k} size={64} className="elemental-flota" style={{ animationDelay: `${i * 0.3}s` }} />
            <span className="text-sm font-semibold" style={{ color: e.color }}>{e.label}</span>
            <span className="text-[11px] text-[#9aafc3]">{e.rol}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
