// Theme-aware mascot: a BTS member in Borahae, a Team Avatar member in
// Avatar, nothing in the NexCommit theme.
import React from 'react';
import { useTema, useTextos } from '../../hooks/tema';
import { Miembro } from './BtsTema';
import { Personaje } from './AvatarTema';

// Mood → character per theme.
const POR_ANIMO = {
  kawaii: { feliz: 'jhope', contenta: 'jimin', preocupada: 'rm', dormida: 'suga' },
  avatar: { feliz: 'aang', contenta: 'katara', preocupada: 'zuko', dormida: 'appa' },
};

// animo: 'feliz' | 'contenta' | 'preocupada' | 'dormida'. `quien` forces a character.
export function Mascota({ animo = 'contenta', quien, size = 56, className = '', titulo }) {
  const tema = useTema();
  if (!POR_ANIMO[tema]) return null;
  const Comp = tema === 'kawaii' ? Miembro : Personaje;
  return (
    <Comp
      quien={quien || POR_ANIMO[tema][animo]}
      dormido={animo === 'dormida'}
      size={size}
      className={`${tema === 'kawaii' ? 'kawaii-flota' : 'avatar-flota'} ${className}`}
      titulo={titulo}
    />
  );
}

// Empty state with the theme's mascot, or plain text in the NexCommit theme.
export function Vacio({ texto }) {
  const tema = useTema();
  const textos = useTextos();
  if (tema === 'nexcommit') return <p className="text-sm text-[#9aafc3]">{texto}</p>;
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <Mascota animo="dormida" quien={tema === 'avatar' ? 'momo' : undefined} size={64} />
      <p className="text-sm text-[#9aafc3]">{textos.vacio || texto}</p>
    </div>
  );
}
