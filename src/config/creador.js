// Creador de páginas con IA (/crea-tu-web). El backend vive en Agente-Next
// (src/routes/creador.js) y los datos en el Supabase de NexCommit.

export const CREADOR_API = (import.meta.env.VITE_CREADOR_API || 'https://back-chat-next.vercel.app/creador').replace(/\/+$/, '');

// Cloudflare Turnstile: site key PÚBLICA (la secret va solo en el backend).
// Vacía = sin captcha (el backend también lo omite si no tiene TURNSTILE_SECRET).
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

export const SITIO = 'https://www.nexcommit.com';

const CLAVE_TOKEN = 'nc_creador_token';

export function leerToken() {
  try {
    return window.localStorage.getItem(CLAVE_TOKEN) || '';
  } catch {
    return '';
  }
}

export function guardarToken(token) {
  try {
    if (token) window.localStorage.setItem(CLAVE_TOKEN, token);
    else window.localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* storage unavailable — the session lasts only while the tab is open */
  }
}

export async function api(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  let r;
  try {
    r = await fetch(`${CREADOR_API}${ruta}`, {
      method: metodo,
      headers: {
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new Error('No pudimos conectarnos. Revisa tu internet e intenta de nuevo.');
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data.error || 'Algo salió mal. Intenta de nuevo.');
    err.status = r.status;
    err.codigo = data.codigo;
    throw err;
  }
  return data;
}

export const ESTILOS = [
  { id: '', label: 'Que lo elija la IA' },
  { id: 'moderno', label: 'Moderno' },
  { id: 'elegante', label: 'Elegante' },
  { id: 'calido', label: 'Cálido' },
  { id: 'minimalista', label: 'Minimalista' },
  { id: 'vibrante', label: 'Vibrante' },
  { id: 'natural', label: 'Natural' },
];
