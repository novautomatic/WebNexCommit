// Original kawaii mascot (a round purple "mochi" face) for the Borahae theme.
// Drawn from scratch: no third-party characters or logos.
import React from 'react';

const OJOS = {
  feliz: (
    <>
      <path d="M33 47 q5 -6 10 0" stroke="#3b1d5c" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M57 47 q5 -6 10 0" stroke="#3b1d5c" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    </>
  ),
  contenta: (
    <>
      <circle cx="38" cy="46" r="4.6" fill="#3b1d5c" />
      <circle cx="62" cy="46" r="4.6" fill="#3b1d5c" />
      <circle cx="39.6" cy="44.4" r="1.6" fill="#fff" />
      <circle cx="63.6" cy="44.4" r="1.6" fill="#fff" />
    </>
  ),
  preocupada: (
    <>
      <circle cx="38" cy="47" r="4.4" fill="#3b1d5c" />
      <circle cx="62" cy="47" r="4.4" fill="#3b1d5c" />
      <circle cx="39.4" cy="45.4" r="1.5" fill="#fff" />
      <circle cx="63.4" cy="45.4" r="1.5" fill="#fff" />
      <path d="M31 40 l9 -4" stroke="#3b1d5c" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M69 40 l-9 -4" stroke="#3b1d5c" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  dormida: (
    <>
      <path d="M33 47 q5 4 10 0" stroke="#3b1d5c" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M57 47 q5 4 10 0" stroke="#3b1d5c" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    </>
  ),
};

const BOCAS = {
  feliz: <path d="M44 56 q6 7 12 0" stroke="#3b1d5c" strokeWidth="3" fill="#ff8fb8" strokeLinecap="round" />,
  contenta: <path d="M46 57 q4 4 8 0" stroke="#3b1d5c" strokeWidth="2.8" fill="none" strokeLinecap="round" />,
  preocupada: <path d="M45 60 q5 -4 10 0" stroke="#3b1d5c" strokeWidth="2.8" fill="none" strokeLinecap="round" />,
  dormida: <ellipse cx="50" cy="58" rx="3" ry="2.4" fill="#3b1d5c" />,
};

// animo: 'feliz' | 'contenta' | 'preocupada' | 'dormida'
export function Carita({ animo = 'contenta', size = 56, className = '', titulo }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      <defs>
        <radialGradient id={`mochi-${animo}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#f3e8ff" />
          <stop offset="60%" stopColor="#d8b4fe" />
          <stop offset="100%" stopColor="#b48cf2" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="55" rx="40" ry="35" fill={`url(#mochi-${animo})`} />
      {/* little ears / sprout */}
      <path d="M50 20 q-3 -10 6 -12 q-1 8 -6 12" fill="#a7f3d0" />
      <ellipse cx="27" cy="58" rx="7" ry="4.5" fill="#ff9ec7" opacity="0.75" />
      <ellipse cx="73" cy="58" rx="7" ry="4.5" fill="#ff9ec7" opacity="0.75" />
      {OJOS[animo]}
      {BOCAS[animo]}
      {animo === 'dormida' && (
        <text x="74" y="30" fontSize="14" fill="#f9a8d4" fontWeight="700">z</text>
      )}
      {animo === 'feliz' && (
        <path d="M82 20 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#fde68a" />
      )}
    </svg>
  );
}
