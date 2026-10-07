// Personal panel theme. 'nexcommit' is the default brand look; 'kawaii' is the
// pastel "Borahae" purple theme (default for Stephania). The choice is per
// user and per browser (localStorage), so anyone can switch from the header.
import { createContext, useContext } from 'react';

export const TEMAS = {
  nexcommit: { id: 'nexcommit', label: 'NexCommit' },
  kawaii: { id: 'kawaii', label: 'Borahae 💜' },
};

const POR_DEFECTO = { 'stephaniabilbao@gmail.com': 'kawaii' };
const clave = (email) => `nc_tema_${(email || '').toLowerCase()}`;

export function temaInicial(email) {
  try {
    const guardado = window.localStorage.getItem(clave(email));
    if (guardado && TEMAS[guardado]) return guardado;
  } catch {
    /* storage unavailable */
  }
  return POR_DEFECTO[(email || '').toLowerCase()] || 'nexcommit';
}

export function guardarTema(email, tema) {
  try {
    window.localStorage.setItem(clave(email), tema);
  } catch {
    /* storage unavailable — the choice lasts only for this visit */
  }
}

export const TemaContext = createContext('nexcommit');
export const useTema = () => useContext(TemaContext);
export const useKawaii = () => useContext(TemaContext) === 'kawaii';

// Little emoji per task state, only shown in the kawaii theme.
export const EMOJI_ESTADO = {
  pendiente: '🌙',
  en_progreso: '💫',
  en_revision: '🔍',
  bloqueada: '🥺',
  completada: '🎉',
  cancelada: '🫧',
};
