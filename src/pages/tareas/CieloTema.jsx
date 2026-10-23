// "La pandilla del cielo" for the "Cielo 🌤️" panel theme: calm navy base, the
// light sky-blue highlight, and lively accents (sun yellow, sprout green, coral,
// lilac) that also carry meaning: coral = needs attention, green = done, yellow =
// energy, lilac = ideas, cloud = rest. Simple hand-drawn SVGs with friendly round
// faces, for the internal panel only — never used on the public site.
import React, { useId } from 'react';

const PANDILLA = {
  sol: { label: 'Sol', rol: 'Energía · lo que avanza', color: '#ffd166' },
  brote: { label: 'Brote', rol: 'Crecimiento · lo logrado', color: '#5ee0b0' },
  nube: { label: 'Nube', rol: 'Calma · lo que espera', color: '#a9d6ff' },
  chispa: { label: 'Chispa', rol: 'Atención · lo urgente', color: '#ff8a80' },
  lila: { label: 'Lila', rol: 'Ideas · lo que viene', color: '#b9a7ff' },
};

const TINTA = '#1b2a44';

// Friendly face shared by the whole gang: round eyes with a shine, rosy cheeks, smile.
const Cara = ({ cx = 50, cy = 58, dormido = false, preocupado = false, mejillas = '#ff9e9e' }) => (
  <g>
    {dormido ? (
      <>
        <path d={`M${cx - 15} ${cy - 2} q5 5 10 0`} stroke={TINTA} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d={`M${cx + 5} ${cy - 2} q5 5 10 0`} stroke={TINTA} strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <ellipse cx={cx - 10} cy={cy - 2} rx="4.2" ry="5.2" fill={TINTA} />
        <ellipse cx={cx + 10} cy={cy - 2} rx="4.2" ry="5.2" fill={TINTA} />
        <circle cx={cx - 8.6} cy={cy - 4} r="1.5" fill="#fff" />
        <circle cx={cx + 11.4} cy={cy - 4} r="1.5" fill="#fff" />
      </>
    )}
    <ellipse cx={cx - 18} cy={cy + 6} rx="5" ry="3" fill={mejillas} opacity="0.55" />
    <ellipse cx={cx + 18} cy={cy + 6} rx="5" ry="3" fill={mejillas} opacity="0.55" />
    {preocupado ? (
      <path d={`M${cx - 6} ${cy + 11} q6 -5 12 0`} stroke={TINTA} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    ) : dormido ? (
      <ellipse cx={cx} cy={cy + 10} rx="3" ry="2.2" fill={TINTA} opacity="0.75" />
    ) : (
      <path d={`M${cx - 7} ${cy + 7} q7 7 14 0`} stroke={TINTA} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    )}
  </g>
);

function Sol({ id, dormido }) {
  const rayos = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <>
      <defs>
        <radialGradient id={`${id}-s`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff3b8" />
          <stop offset="0.6" stopColor="#ffd166" />
          <stop offset="1" stopColor="#ffb347" />
        </radialGradient>
      </defs>
      {rayos.map((g) => (
        <rect key={g} x="47" y="2" width="6" height="15" rx="3" fill="#ffc94d" transform={`rotate(${g} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="31" fill={`url(#${id}-s)`} />
      <Cara cy={52} dormido={dormido} mejillas="#ff8a5c" />
    </>
  );
}

function Brote({ id, dormido }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9af5cf" />
          <stop offset="1" stopColor="#2fbf86" />
        </linearGradient>
      </defs>
      <path d="M50 30 C50 22 50 16 50 10" stroke="#2fbf86" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 16 C38 4 22 8 20 18 C32 24 44 22 50 16Z" fill="#5ee0b0" />
      <path d="M50 12 C60 0 78 2 80 12 C70 20 56 20 50 12Z" fill="#7ef0c1" />
      <rect x="18" y="30" width="64" height="62" rx="30" fill={`url(#${id}-b)`} />
      <Cara cy={60} dormido={dormido} />
    </>
  );
}

function Nube({ id, dormido }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-n`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#a9d6ff" />
        </linearGradient>
      </defs>
      <path
        d="M22 80 C8 80 4 62 16 56 C12 40 30 30 42 38 C46 22 70 20 76 38 C92 36 98 56 86 64 C96 72 88 84 76 80 Z"
        fill={`url(#${id}-n)`}
      />
      <Cara cx={50} cy={60} dormido={dormido} mejillas="#ffb3c7" />
      {dormido && <text x="80" y="24" fontSize="14" fill="#cfe8ff" fontWeight="700">z</text>}
    </>
  );
}

function Chispa({ id, dormido }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-c`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb4a8" />
          <stop offset="1" stopColor="#ff6b6b" />
        </linearGradient>
      </defs>
      <path d="M50 4 L61 30 L90 26 L70 48 L86 74 L58 68 L50 96 L42 68 L14 74 L30 48 L10 26 L39 30 Z" fill={`url(#${id}-c)`} />
      <circle cx="50" cy="52" r="24" fill="#ffd0c9" />
      <Cara cy={52} dormido={dormido} preocupado={!dormido} mejillas="#ff6b6b" />
    </>
  );
}

function Lila({ id, dormido }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-l`} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#e6deff" />
          <stop offset="1" stopColor="#9b86ff" />
        </radialGradient>
      </defs>
      <path d="M50 4 L55 16 L68 17 L58 25 L61 38 L50 31 L39 38 L42 25 L32 17 L45 16 Z" fill="#ffd166" />
      <ellipse cx="50" cy="64" rx="34" ry="30" fill={`url(#${id}-l)`} />
      <Cara cy={64} dormido={dormido} mejillas="#ff9ec4" />
    </>
  );
}

const PERSONAJES = { sol: Sol, brote: Brote, nube: Nube, chispa: Chispa, lila: Lila };

// quien: a key of PANDILLA. `dormido` closes the eyes.
export function Cielito({ quien = 'sol', size = 56, className = '', style, titulo, dormido = false }) {
  const id = useId().replace(/:/g, '');
  const Comp = PERSONAJES[quien] || Sol;
  const { label } = PANDILLA[quien] || PANDILLA.sol;
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

// The gang as small faces in a row (header).
export function PandillaCielo({ size = 18, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden="true">
      {Object.keys(PANDILLA).map((k) => <Cielito key={k} quien={k} size={size} />)}
    </span>
  );
}

// "La pandilla del cielo" banner for the summary view: who means what.
export function EquipoCielo() {
  return (
    <section className="cielo-banda rounded-xl p-4 xl:col-span-2" aria-label="La pandilla del cielo">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-bold text-white">La pandilla del cielo</h2>
        <p className="text-xs text-[#9aafc3]">Cada color te dice algo de un vistazo.</p>
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(PANDILLA).map(([k, p], i) => (
          <li key={k} className="flex flex-col items-center gap-1 text-center">
            <Cielito quien={k} size={60} className="cielo-flota" style={{ animationDelay: `${i * 0.35}s` }} />
            <span className="text-sm font-bold" style={{ color: p.color }}>{p.label}</span>
            <span className="text-[11px] text-[#9aafc3]">{p.rol}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
