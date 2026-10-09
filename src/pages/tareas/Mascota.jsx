// Theme-aware mascot: a BTS member in Borahae, a Team Avatar member in
// Avatar, nothing in the NexCommit theme.
import React from 'react';
import { useTema, useTextos } from '../../hooks/tema';
import { Miembro } from './BtsTema';
import { Personaje } from './AvatarTema';
import { Elemento } from './ElementalTema';

// Mood → character per theme.
const POR_ANIMO = {
  kawaii: { feliz: 'jhope', contenta: 'jimin', preocupada: 'rm', dormida: 'suga' },
  avatar: { feliz: 'aang', contenta: 'katara', preocupada: 'zuko', dormida: 'appa' },
  elemental: { feliz: 'hoja', contenta: 'aqua', preocupada: 'llama', dormida: 'roca' },
};
const COMPONENTE = { kawaii: Miembro, avatar: Personaje, elemental: Elemento };
// Sleepy character for empty states.
const DORMIDO = { avatar: 'momo', elemental: 'roca' };

// animo: 'feliz' | 'contenta' | 'preocupada' | 'dormida'. `quien` forces a character.
export function Mascota({ animo = 'contenta', quien, size = 56, className = '', titulo }) {
  const tema = useTema();
  const Comp = COMPONENTE[tema];
  if (!Comp) return null;
  return (
    <Comp
      quien={quien || POR_ANIMO[tema][animo]}
      dormido={animo === 'dormida'}
      size={size}
      className={`${tema}-flota ${className}`}
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
      <Mascota animo="dormida" quien={DORMIDO[tema]} size={64} />
      <p className="text-sm text-[#9aafc3]">{textos.vacio || texto}</p>
    </div>
  );
}
