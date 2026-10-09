// Personal panel theme. 'nexcommit' is the default brand look; 'kawaii' is the
// pastel "Borahae" purple theme (default for Stephania); 'avatar' is the four
// nations theme from Avatar: The Last Airbender (default for Fabián). The choice
// is per user and per browser (localStorage), so anyone can switch from the header.
import { createContext, useContext } from 'react';

export const TEMAS = {
  nexcommit: { id: 'nexcommit', label: 'NexCommit' },
  kawaii: { id: 'kawaii', label: 'Borahae 💜' },
  avatar: { id: 'avatar', label: 'Avatar 🌀' },
};

const POR_DEFECTO = {
  'stephaniabilbao@gmail.com': 'kawaii',
  'fabianignacio.tm@gmail.com': 'avatar',
};
const NOMBRES = {
  'stephaniabilbao@gmail.com': 'Steph',
  'fabianignacio.tm@gmail.com': 'Fabián',
};
const clave = (email) => `nc_tema_${(email || '').toLowerCase()}`;

export const nombreCorto = (email) => NOMBRES[(email || '').toLowerCase()] || '';

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

// Little emoji per task state, only shown in the decorated themes.
const EMOJI = {
  kawaii: {
    pendiente: '🌙',
    en_progreso: '💫',
    en_revision: '🔍',
    bloqueada: '🥺',
    completada: '🎉',
    cancelada: '🫧',
  },
  avatar: {
    pendiente: '📜',
    en_progreso: '🌀',
    en_revision: '🔍',
    bloqueada: '🪨',
    completada: '🦬',
    cancelada: '🍃',
  },
};
export const emojiEstado = (tema, estado) => EMOJI[tema]?.[estado] || '';

// Theme copy: KPI labels, headings and the mascot's phrases.
export const TEXTOS = {
  nexcommit: {
    tituloTareas: 'Tareas',
    kpi: {
      abiertas: 'Abiertas', mias: 'Mías', vencidas: 'Vencidas', semana: 'Vencen en 7 días',
      sinAsignar: 'Sin asignar', completadas: 'Completadas (7 días)',
    },
  },
  kawaii: {
    saludo: (n) => `¡Hola${n ? ` ${n}` : ''}! Borahae 💜`,
    tituloTareas: 'Tus tareas ✨',
    kpi: {
      abiertas: '📋 Abiertas', mias: '💜 Mías', vencidas: '🥺 Vencidas', semana: '⏰ Vencen en 7 días',
      sinAsignar: '🫧 Sin asignar', completadas: '🎉 Completadas (7 días)',
    },
    vacio: 'No hay tareas con estos filtros… Suga se fue a dormir una siesta 💤',
    frase: {
      dormida: () => 'Suga está durmiendo: todavía no hay tareas por aquí 💤',
      preocupada: (n) => `Hay ${n} atrasada${n === 1 ? '' : 's'}… RM dice: ¡tú puedes! 💪💜`,
      feliz: () => '¡Vamos increíble! j-hope está orgulloso 🌞 Borahae 💜',
      contenta: () => 'Paso a pasito se llega lejos, como dice Jimin 🐥🌸',
    },
  },
  avatar: {
    saludo: (n) => `¡Hola${n ? ` ${n}` : ''}! Maestro Aire 🌀`,
    tituloTareas: 'Misiones del Avatar',
    kpi: {
      abiertas: '📜 Abiertas', mias: '🌀 Mías', vencidas: '🔥 Vencidas', semana: '⏳ Vencen en 7 días',
      sinAsignar: '🐒 Sin asignar', completadas: '🦬 Completadas (7 días)',
    },
    vacio: 'Momo buscó por todos lados y no encontró misiones con estos filtros 🍑',
    frase: {
      dormida: () => 'Appa está durmiendo: todavía no hay misiones por aquí 💤',
      preocupada: (n) => `Hay ${n} misión${n === 1 ? '' : 'es'} atrasada${n === 1 ? '' : 's'}. ¡Hora de recuperar el honor! 🔥`,
      feliz: () => '¡Yip yip! Vamos volando 🌀',
      contenta: () => 'El agua fluye: paso a paso se llega lejos 🌊',
    },
  },
};
export const useTextos = () => TEXTOS[useContext(TemaContext)] || TEXTOS.nexcommit;
