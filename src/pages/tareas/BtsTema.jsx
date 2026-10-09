// Chibi faces of the seven BTS members for the "Borahae 💜" panel theme
// (Stephania's default). Simple fan-art SVGs drawn by hand for the internal
// panel only — never used on the public site.
import React from 'react';

const TINTA = '#2a1830';
const PIEL = '#f6dcc6';

function Ojo({ x, y }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx="5.6" ry="6.6" fill="#fff" />
      <circle cx={x} cy={y + 0.6} r="4.4" fill="#3a2418" />
      <circle cx={x} cy={y + 0.8} r="2.4" fill={TINTA} />
      <circle cx={x + 1.6} cy={y - 1.6} r="1.5" fill="#fff" />
    </g>
  );
}

// Eye smile (crescents), closed (sleeping) or narrow.
const Media = ({ x, y, cerrado }) => (
  <path
    d={`M${x - 5} ${y} q5 ${cerrado ? 4 : -6} 10 0`}
    stroke={TINTA} strokeWidth="3" fill="none" strokeLinecap="round"
  />
);
const Estrecho = ({ x, y }) => (
  <g>
    <ellipse cx={x} cy={y} rx="5" ry="3.6" fill={TINTA} />
    <circle cx={x + 1.6} cy={y - 1} r="1.2" fill="#fff" />
  </g>
);

const Rubor = ({ y = 67, op = 0.5 }) => (
  <>
    <ellipse cx="30" cy={y} rx="5.5" ry="3" fill="#ff8fb8" opacity={op} />
    <ellipse cx="70" cy={y} rx="5.5" ry="3" fill="#ff8fb8" opacity={op} />
  </>
);

const Polera = ({ fuera, dentro }) => (
  <>
    <path d="M14 100 Q20 83 50 83 Q80 83 86 100Z" fill={fuera} />
    <path d="M38 100 L44 86 L50 92 L56 86 L62 100Z" fill={dentro} />
  </>
);

const Cara = () => (
  <>
    <ellipse cx="20" cy="58" rx="5" ry="7" fill={PIEL} />
    <ellipse cx="80" cy="58" rx="5" ry="7" fill={PIEL} />
    <ellipse cx="50" cy="56" rx="29" ry="29" fill={PIEL} />
  </>
);

// Fringe shapes shared by several members.
const FLEQUILLO = {
  completo:
    'M20 58 Q16 22 50 21 Q84 22 80 58 Q76 44 70 46 Q66 40 60 45 Q55 39 50 45 Q45 39 40 45 Q34 40 30 46 Q24 44 20 58Z',
  raya:
    'M20 60 Q16 20 50 20 Q84 20 80 60 Q76 40 62 36 Q54 34 50 42 Q46 34 38 36 Q24 40 20 60Z',
  lado:
    'M20 60 Q16 20 50 20 Q84 20 80 60 Q78 42 72 38 Q58 47 30 41 Q22 45 20 60Z',
  arriba:
    'M21 56 Q18 26 40 20 Q52 10 66 16 Q84 22 79 56 Q76 38 68 34 Q52 30 34 36 Q24 40 21 56Z',
  rulos: 'M20 56 Q18 26 50 24 Q82 26 80 56 Q74 40 50 38 Q26 40 20 56Z',
};

const Rulos = ({ color, fleco }) => (
  <>
    {[[25, 38], [33, 29], [44, 24], [56, 24], [67, 29], [75, 38]].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="8" fill={color} />
    ))}
    <path d={FLEQUILLO.rulos} fill={color} />
    {fleco && [[37, 41], [49, 39], [61, 41]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="6" fill={color} />)}
  </>
);

function RM() {
  const pelo = '#9b8ec4';
  return (
    <>
      <Polera fuera="#5b3fa0" dentro="#e9ddff" />
      <Cara />
      <path d={FLEQUILLO.arriba} fill={pelo} />
      <path d="M32 48 L44 47" stroke="#5a4a80" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M56 47 L68 48" stroke="#5a4a80" strokeWidth="2.6" strokeLinecap="round" />
      <Ojo x={38} y={57} />
      <Ojo x={62} y={57} />
      <Rubor />
      <path d="M42 70 Q50 77 58 70" stroke="#6b2340" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      {/* Dimples. */}
      <path d="M36 70 q1 3 3 3" stroke="#c98f86" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M64 70 q-1 3 -3 3" stroke="#c98f86" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </>
  );
}

function Jin() {
  const pelo = '#4a3428';
  return (
    <>
      <Polera fuera="#e58fb0" dentro="#fff0f6" />
      <Cara />
      <path d={FLEQUILLO.raya} fill={pelo} />
      <Ojo x={38} y={57} />
      {/* Wink. */}
      <path d="M57 57 q5 -5 10 0" stroke={TINTA} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Rubor />
      <path d="M44 70 Q50 73 56 70 Q50 78 44 70Z" fill="#e8798f" />
      {/* Flying kiss. */}
      <path d="M84 28 c-3-5-10-2-7 4 l7 7 7-7 c3-6-4-9-7-4z" fill="#f472b6" />
    </>
  );
}

function Suga({ dormido }) {
  const pelo = '#8ee0c8';
  return (
    <>
      <Polera fuera="#2f2a3a" dentro="#8ee0c8" />
      <Cara />
      <path d={FLEQUILLO.completo} fill={pelo} />
      {dormido ? (
        <>
          <Media x={38} y={58} cerrado />
          <Media x={62} y={58} cerrado />
          <Rubor op={0.4} />
          <ellipse cx="50" cy="71" rx="3" ry="2.4" fill="#6b2340" />
          <text x="78" y="26" fontSize="14" fontWeight="700" fill="#c4a1ff">z</text>
          <text x="88" y="15" fontSize="10" fontWeight="700" fill="#c4a1ff">z</text>
        </>
      ) : (
        <>
          <Estrecho x={38} y={58} />
          <Estrecho x={62} y={58} />
          <Rubor op={0.4} />
          {/* Gummy smile. */}
          <path d="M39 67 Q50 84 61 67Z" fill="#7a2e3e" />
          <path d="M39 67 Q50 70 61 67 L60 71 Q50 74.5 40 71Z" fill="#ff9fb2" />
          <path d="M40.4 71 Q50 74.5 59.6 71 L58.6 74.4 Q50 77.6 41.4 74.4Z" fill="#fff" />
        </>
      )}
    </>
  );
}

function JHope() {
  return (
    <>
      <Polera fuera="#f2a33a" dentro="#fff4d6" />
      <Cara />
      <Rulos color="#5a3a24" />
      <Media x={38} y={57} />
      <Media x={62} y={57} />
      <Rubor />
      <path d="M39 67 Q50 82 61 67Z" fill="#7a2e3e" />
      <path d="M40 67 Q50 71 60 67 L59 69.6 Q50 73.4 41 69.6Z" fill="#fff" />
      {/* Sunshine. */}
      <path d="M84 16 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4z" fill="#fde68a" />
    </>
  );
}

function Jimin() {
  const pelo = '#f3a6c8';
  return (
    <>
      <Polera fuera="#f4c3d8" dentro="#fff" />
      <Cara />
      <path d={FLEQUILLO.lado} fill={pelo} />
      <Media x={38} y={58} />
      <Media x={62} y={58} />
      <Rubor y={66} op={0.65} />
      <path d="M45 70 Q50 75 55 70" stroke="#6b2340" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </>
  );
}

function V() {
  return (
    <>
      <Polera fuera="#3a5fa8" dentro="#dbe7ff" />
      <Cara />
      <Rulos color="#2b2230" fleco />
      <Ojo x={38} y={57} />
      <Ojo x={62} y={57} />
      <Rubor />
      <circle cx="50" cy="64.5" r="0.9" fill="#6b4a3a" />
      {/* Boxy smile. */}
      <rect x="40" y="67" width="20" height="9.5" rx="2.6" fill="#7a2e3e" />
      <rect x="41.4" y="67.6" width="17.2" height="3.6" rx="1" fill="#fff" />
    </>
  );
}

function Jungkook() {
  return (
    <>
      <Polera fuera="#1f1b24" dentro="#fff" />
      <Cara />
      <path d={FLEQUILLO.completo} fill="#151318" />
      <Ojo x={38} y={58} />
      <Ojo x={62} y={58} />
      <Rubor />
      {/* Bunny smile and the little mole under the lip. */}
      <path d="M42 68 Q50 78 58 68Z" fill="#7a2e3e" />
      <rect x="46.4" y="68" width="3.4" height="4.2" rx="0.8" fill="#fff" />
      <rect x="50.2" y="68" width="3.4" height="4.2" rx="0.8" fill="#fff" />
      <circle cx="50" cy="79.5" r="0.9" fill="#6b4a3a" />
    </>
  );
}

const MIEMBROS = {
  rm: { nombre: 'RM', emoji: '🐨', Comp: RM },
  jin: { nombre: 'Jin', emoji: '🐹', Comp: Jin },
  suga: { nombre: 'SUGA', emoji: '🐱', Comp: Suga },
  jhope: { nombre: 'j-hope', emoji: '🐿️', Comp: JHope },
  jimin: { nombre: 'Jimin', emoji: '🐥', Comp: Jimin },
  v: { nombre: 'V', emoji: '🐻', Comp: V },
  jungkook: { nombre: 'Jung Kook', emoji: '🐰', Comp: Jungkook },
};

// quien: a key of MIEMBROS. `dormido` only changes Suga.
export function Miembro({ quien = 'jimin', size = 56, className = '', style, titulo, dormido = false }) {
  const { Comp, nombre } = MIEMBROS[quien] || MIEMBROS.jimin;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      style={style}
      role={titulo ? 'img' : undefined}
      aria-label={titulo ? `${nombre}: ${titulo}` : undefined}
      aria-hidden={titulo ? undefined : true}
    >
      <Comp dormido={dormido} />
    </svg>
  );
}

// "BTS 💜" banner for the summary view.
export function EquipoBts() {
  return (
    <section className="bts-banda rounded-xl p-4 xl:col-span-2" aria-label="BTS">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-bold text-white">BTS 💜 · Borahae</h2>
        <span className="text-xs text-[#9aafc3]">¡Tu equipo te acompaña! 🫰</span>
      </div>
      <ul className="flex flex-wrap justify-center sm:justify-between gap-3">
        {Object.entries(MIEMBROS).map(([k, m], i) => (
          <li key={k} className="flex flex-col items-center gap-1">
            <Miembro quien={k} size={60} className="kawaii-flota" style={{ animationDelay: `${i * 0.3}s` }} />
            <span className="text-xs text-[#9aafc3]">{m.emoji} {m.nombre}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
