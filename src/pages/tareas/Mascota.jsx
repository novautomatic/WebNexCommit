// Theme-aware mascot: the purple mochi in Borahae, a Team Avatar member in
// Avatar, nothing in the NexCommit theme.
import React from 'react';
import { useTema, useTextos } from '../../hooks/tema';
import { Carita } from './Kawaii';
import { Personaje } from './AvatarTema';

// Mood → character in the Avatar theme.
const PERSONAJE_POR_ANIMO = {
  feliz: 'aang',
  contenta: 'katara',
  preocupada: 'zuko',
  dormida: 'appa',
};

// animo: 'feliz' | 'contenta' | 'preocupada' | 'dormida'. `quien` forces a character.
export function Mascota({ animo = 'contenta', quien, size = 56, className = '', titulo }) {
  const tema = useTema();
  if (tema === 'kawaii') return <Carita animo={animo} size={size} className={`kawaii-flota ${className}`} titulo={titulo} />;
  if (tema === 'avatar') {
    return (
      <Personaje
        quien={quien || PERSONAJE_POR_ANIMO[animo]}
        dormido={animo === 'dormida'}
        size={size}
        className={`avatar-flota ${className}`}
        titulo={titulo}
      />
    );
  }
  return null;
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
