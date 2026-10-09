// Chibi faces of Team Avatar and the four nations emblems for the "Avatar 🌀"
// panel theme (Fabián's default). Simple fan-art SVGs drawn by hand for the
// internal panel only — never used on the public site.
import React, { useId } from 'react';

const NACIONES = {
  aire: { label: 'Nómadas del Aire', color: '#f5a524' },
  agua: { label: 'Tribus Agua', color: '#4fa3d9' },
  tierra: { label: 'Reino Tierra', color: '#6cbf4f' },
  fuego: { label: 'Nación del Fuego', color: '#e2483d' },
};

const TINTA = '#2b1a10';

function Ojo({ x, y, iris, pupila = true, rx = 6, ry = 7 }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fff" />
      <circle cx={x} cy={y + 0.6} r={rx - 1.4} fill={iris} />
      {pupila && <circle cx={x} cy={y + 0.8} r={rx - 3.4} fill={TINTA} />}
      <circle cx={x + 1.6} cy={y - 1.6} r="1.5" fill="#fff" />
    </g>
  );
}

const Rubor = ({ y = 66, x1 = 29, x2 = 71, color = '#ff8a7a' }) => (
  <>
    <ellipse cx={x1} cy={y} rx="5.5" ry="3" fill={color} opacity="0.45" />
    <ellipse cx={x2} cy={y} rx="5.5" ry="3" fill={color} opacity="0.45" />
  </>
);

// Robe collar at the bottom of the bust.
const Cuello = ({ fuera, dentro }) => (
  <>
    <path d="M14 100 Q20 82 50 82 Q80 82 86 100Z" fill={fuera} />
    <path d="M32 100 Q36 88 50 88 Q64 88 68 100Z" fill={dentro} />
  </>
);

function Aang({ id }) {
  const piel = '#f5cfa3';
  return (
    <>
      <Cuello fuera="#f28c28" dentro="#f6c544" />
      <ellipse cx="19" cy="56" rx="6" ry="8" fill={piel} />
      <ellipse cx="81" cy="56" rx="6" ry="8" fill={piel} />
      <clipPath id={`${id}-cab`}><ellipse cx="50" cy="52" rx="31" ry="31" /></clipPath>
      <ellipse cx="50" cy="52" rx="31" ry="31" fill={piel} />
      {/* The airbender arrow. */}
      <g clipPath={`url(#${id}-cab)`} fill="#3d9be0">
        <rect x="45" y="14" width="10" height="22" />
        <polygon points="37,33 63,33 50,47" />
      </g>
      <Ojo x={38} y={57} iris="#6b5240" />
      <Ojo x={62} y={57} iris="#6b5240" />
      <Rubor />
      <path d="M40 68 Q50 80 60 68Z" fill="#7a2e2e" />
      <path d="M45 73 Q50 77 55 73 Q50 71 45 73Z" fill="#ff8a8a" />
    </>
  );
}

function Katara() {
  const piel = '#b97a50';
  const pelo = '#3a2416';
  return (
    <>
      <path d="M16 56 Q14 16 50 14 Q86 16 84 56 L86 92 L14 92Z" fill={pelo} />
      <Cuello fuera="#2f6fb0" dentro="#8fd0ff" />
      <path d="M36 85 Q50 93 64 85" stroke="#1e3a8a" strokeWidth="3" fill="none" />
      <circle cx="50" cy="90" r="4" fill="#7cc4ff" stroke="#1e3a8a" strokeWidth="1.5" />
      <ellipse cx="50" cy="54" rx="29" ry="30" fill={piel} />
      <path d="M20 50 Q18 18 50 18 Q82 18 80 50 Q72 32 52 32 L50 26 L48 32 Q28 32 20 50Z" fill={pelo} />
      {/* Hair loops. */}
      <path d="M25 38 C13 48 15 64 23 66 C29 64 28 52 26 46" stroke={pelo} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M75 38 C87 48 85 64 77 66 C71 64 72 52 74 46" stroke={pelo} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M32 47 Q38 44 44 47" stroke={pelo} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M56 47 Q62 44 68 47" stroke={pelo} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Ojo x={38} y={57} iris="#3b7fd1" />
      <Ojo x={62} y={57} iris="#3b7fd1" />
      <Rubor color="#ff7a6a" />
      <path d="M43 70 Q50 76 57 70" stroke="#5a1f1f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </>
  );
}

function Sokka() {
  const piel = '#b97a50';
  const pelo = '#2a1a10';
  return (
    <>
      {/* Boomerang over the shoulder. */}
      <path d="M66 92 Q88 84 95 64 Q97 72 92 80 Q84 92 70 97Z" fill="#c9a26b" stroke="#8a6a3e" strokeWidth="1.5" />
      <Cuello fuera="#2f6fb0" dentro="#e8eef5" />
      <ellipse cx="50" cy="54" rx="30" ry="30" fill={piel} />
      {/* Shaved sides and the wolf tail. */}
      <path d="M21 46 Q22 24 50 22 Q78 24 79 46 Q66 34 50 34 Q34 34 21 46Z" fill="#8a5a3a" opacity="0.55" />
      <path d="M40 30 Q50 20 60 30 L58 34 Q50 30 42 34Z" fill={pelo} />
      <path d="M45 27 Q38 8 57 1 Q51 12 56 26Z" fill={pelo} />
      <rect x="45.5" y="23" width="9" height="4" rx="1.5" fill="#6b4a33" />
      <path d="M31 47 L44 49" stroke={pelo} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M56 49 L69 47" stroke={pelo} strokeWidth="3.6" strokeLinecap="round" />
      <Ojo x={38} y={58} iris="#3b7fd1" />
      <Ojo x={62} y={58} iris="#3b7fd1" />
      <path d="M41 71 Q51 78 61 68" stroke="#5a1f1f" strokeWidth="2.8" fill="none" strokeLinecap="round" />
    </>
  );
}

function Zuko() {
  const piel = '#f6dcc4';
  const pelo = '#1a1414';
  return (
    <>
      <Cuello fuera="#a8231e" dentro="#e8b923" />
      <ellipse cx="50" cy="54" rx="30" ry="30" fill={piel} />
      <path
        d="M18 56 Q14 18 50 15 Q86 18 82 56 Q80 42 73 35 L67 43 L61 32 L53 41 L47 31 L39 41 L33 33 L27 44 Q21 47 18 56Z"
        fill={pelo}
      />
      {/* Topknot with the Fire Nation crown. */}
      <ellipse cx="50" cy="15" rx="8" ry="6" fill={pelo} />
      <path d="M44 16 L46.5 6 L50 11 L53.5 6 L56 16Z" fill="#e8b923" stroke="#9a7410" strokeWidth="0.8" />
      {/* Scar around his left eye. */}
      <path d="M53 47 Q66 40 77 49 Q81 61 72 67 Q61 69 55 61 Q51 53 53 47Z" fill="#d9776a" opacity="0.75" />
      <path d="M31 47 L44 50" stroke={pelo} strokeWidth="3" strokeLinecap="round" />
      <Ojo x={38} y={58} iris="#e0a526" />
      <Ojo x={63} y={59} iris="#e0a526" ry={5.5} />
      <path d="M44 73 Q50 71 56 73" stroke="#5a1f1f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </>
  );
}

function Toph() {
  const piel = '#f7dcc5';
  const pelo = '#141414';
  return (
    <>
      <Cuello fuera="#3f7d3a" dentro="#e8c547" />
      <circle cx="50" cy="17" r="10" fill={pelo} />
      <ellipse cx="50" cy="54" rx="30" ry="30" fill={piel} />
      <path d="M20 54 Q16 22 50 22 Q84 22 80 54 L75 45 L69 51 L63 42 L57 50 L50 41 L43 50 L37 42 L31 51 L25 45Z" fill={pelo} />
      {/* Headband with its pompoms. */}
      <path d="M24 30 Q50 18 76 30" stroke="#e8c547" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <circle cx="23" cy="34" r="4" fill="#5aa34a" />
      <circle cx="77" cy="34" r="4" fill="#5aa34a" />
      {/* Pale eyes, no pupils: she sees through the earth. */}
      <Ojo x={38} y={59} iris="#cfdccb" pupila={false} />
      <Ojo x={62} y={59} iris="#cfdccb" pupila={false} />
      <Rubor y={68} />
      <path d="M42 72 Q53 76 60 67" stroke="#5a1f1f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </>
  );
}

function Momo() {
  const pelaje = '#ece6dc';
  const marca = '#6e5040';
  return (
    <>
      <path d="M33 46 L5 8 Q16 2 24 8 L45 36Z" fill={pelaje} stroke={marca} strokeWidth="1.5" />
      <path d="M33 40 L13 12 Q18 9 22 12 L40 35Z" fill="#c9a08a" />
      <path d="M67 46 L95 8 Q84 2 76 8 L55 36Z" fill={pelaje} stroke={marca} strokeWidth="1.5" />
      <path d="M67 40 L87 12 Q82 9 78 12 L60 35Z" fill="#c9a08a" />
      <ellipse cx="50" cy="60" rx="28" ry="26" fill={pelaje} />
      <path d="M43 36 Q50 32 57 36 L54 48 Q50 50 46 48Z" fill={marca} />
      <circle cx="37" cy="60" r="10.5" fill="#9ccc3d" />
      <circle cx="63" cy="60" r="10.5" fill="#9ccc3d" />
      <circle cx="37" cy="61" r="7.5" fill={TINTA} />
      <circle cx="63" cy="61" r="7.5" fill={TINTA} />
      <circle cx="40" cy="57" r="2.6" fill="#fff" />
      <circle cx="66" cy="57" r="2.6" fill="#fff" />
      <path d="M47 72 L53 72 L50 75.5Z" fill={TINTA} />
      <path d="M45 78 Q47.5 80.5 50 78 Q52.5 80.5 55 78" stroke={TINTA} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  );
}

function Appa({ id, dormido }) {
  const pelaje = '#f6f1e6';
  return (
    <>
      <path d="M22 36 Q4 32 6 14 Q14 26 26 28Z" fill="#9a7650" />
      <path d="M78 36 Q96 32 94 14 Q86 26 74 28Z" fill="#9a7650" />
      {[20, 32, 44, 56, 68, 80].map((x) => <circle key={x} cx={x} cy={x % 24 ? 30 : 27} r="8" fill={pelaje} />)}
      <clipPath id={`${id}-cab`}><ellipse cx="50" cy="56" rx="41" ry="33" /></clipPath>
      <ellipse cx="50" cy="56" rx="41" ry="33" fill={pelaje} />
      {/* The sky bison arrow. */}
      <g clipPath={`url(#${id}-cab)`} fill="#7a5236">
        <rect x="43" y="18" width="14" height="18" />
        <polygon points="34,34 66,34 50,50" />
      </g>
      {dormido ? (
        <>
          <path d="M28 58 Q33 62 38 58" stroke={TINTA} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M62 58 Q67 62 72 58" stroke={TINTA} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <text x="80" y="22" fontSize="14" fontWeight="700" fill="#4fa3d9">z</text>
          <text x="89" y="12" fontSize="10" fontWeight="700" fill="#4fa3d9">z</text>
        </>
      ) : (
        <>
          <circle cx="33" cy="58" r="3.8" fill={TINTA} />
          <circle cx="67" cy="58" r="3.8" fill={TINTA} />
          <circle cx="34.2" cy="56.8" r="1.2" fill="#fff" />
          <circle cx="68.2" cy="56.8" r="1.2" fill="#fff" />
        </>
      )}
      <ellipse cx="50" cy="71" rx="13" ry="7" fill="#c9b9a2" />
      <ellipse cx="44" cy="70" rx="2.6" ry="1.8" fill={TINTA} />
      <ellipse cx="56" cy="70" rx="2.6" ry="1.8" fill={TINTA} />
      <path d="M38 81 Q50 87 62 81" stroke={TINTA} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  );
}

const PERSONAJES = {
  aang: { nombre: 'Aang', nacion: 'aire', Comp: Aang },
  katara: { nombre: 'Katara', nacion: 'agua', Comp: Katara },
  sokka: { nombre: 'Sokka', nacion: 'agua', Comp: Sokka },
  toph: { nombre: 'Toph', nacion: 'tierra', Comp: Toph },
  zuko: { nombre: 'Zuko', nacion: 'fuego', Comp: Zuko },
  momo: { nombre: 'Momo', nacion: 'aire', Comp: Momo },
  appa: { nombre: 'Appa', nacion: 'aire', Comp: Appa },
};

// quien: a key of PERSONAJES. `dormido` only changes Appa.
export function Personaje({ quien = 'aang', size = 56, className = '', style, titulo, dormido = false }) {
  const id = useId().replace(/:/g, '');
  const { Comp, nombre } = PERSONAJES[quien] || PERSONAJES.aang;
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
      <Comp id={id} dormido={dormido} />
    </svg>
  );
}

const SIMBOLOS = {
  aire: (
    <path
      d="M12 12c0-1.4 2-1.4 2 0 0 2.4-4 2.4-4 0 0-3.8 6-3.8 6 0 0 5.2-8 5.2-8 0 0-6.6 10-6.6 10 0"
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
    />
  ),
  agua: (
    <>
      <path d="M13.5 5.5a4.6 4.6 0 1 0 3.6 7.4 3.7 3.7 0 1 1-3.6-7.4z" fill="currentColor" />
      <path d="M5 17.5q1.75-1.6 3.5 0t3.5 0 3.5 0 3.5 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  tierra: (
    <>
      <rect x="7.5" y="7.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    </>
  ),
  fuego: (
    <path
      d="M12 4c1 3.6 5.4 5.4 5.4 9.6a5.4 5.4 0 0 1-10.8 0c0-2.6 1.8-3.6 1.8-5.4.9 1.8 1.8 2.7 2.7 2.7-.9-2.7 0-5.4.9-6.9z"
      fill="currentColor"
    />
  ),
};

// One of the four nations emblems inside its ring.
export function Emblema({ nacion = 'aire', size = 18, className = '', titulo }) {
  const n = NACIONES[nacion] || NACIONES.aire;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      style={{ color: n.color }}
      role={titulo ? 'img' : undefined}
      aria-label={titulo ? n.label : undefined}
      aria-hidden={titulo ? undefined : true}
    >
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      {SIMBOLOS[nacion]}
    </svg>
  );
}

// The four emblems in a row (header and summary banner).
export function CuatroNaciones({ size = 16, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden="true">
      {Object.keys(NACIONES).map((n) => <Emblema key={n} nacion={n} size={size} />)}
    </span>
  );
}

// "Team Avatar" banner for the summary view.
export function EquipoAvatar() {
  return (
    <section className="avatar-pergamino rounded-xl p-4 xl:col-span-2" aria-label="Equipo Avatar">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="avatar-titulo text-lg text-white">Equipo Avatar</h2>
        <CuatroNaciones size={20} />
      </div>
      <ul className="flex flex-wrap justify-center sm:justify-between gap-3">
        {Object.entries(PERSONAJES).map(([k, p], i) => (
          <li key={k} className="flex flex-col items-center gap-1">
            <Personaje quien={k} size={60} className="avatar-flota" style={{ animationDelay: `${i * 0.3}s` }} />
            <span className="flex items-center gap-1 text-xs text-[#9aafc3]">
              <Emblema nacion={p.nacion} size={12} /> {p.nombre}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
