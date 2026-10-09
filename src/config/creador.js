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
    if (data.codigo === 'bloqueado') marcarBloqueado(err.message);
    if (data.codigo === 'advertencia') avisarModeracion({ tipo: 'advertencia', mensaje: err.message, n: data.advertencia, max: data.max_advertencias });
    throw err;
  }
  if (ruta === '/estado') limpiarBloqueo(); // si el equipo lo desbloqueó, la sesión vuelve a servir
  return data;
}

// ─── Moderación: advertencias y bloqueo ─────────────────────────────────────
// El backend responde codigo 'advertencia' (1 y 2) o 'bloqueado' (3.ª
// infracción). <GuardiaModeracion> escucha este evento y muestra el aviso o la
// pantalla roja. El bloqueo queda marcado en este navegador 7 días (el backend
// lo hace cumplir igual: no deja entrar ni con otro navegador).
const EVENTO = 'nc-creador-moderacion';
const CLAVE_BLOQUEO = 'nc_creador_bloqueado';

function avisarModeracion(detalle) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: detalle }));
}

function marcarBloqueado(mensaje) {
  try {
    window.localStorage.setItem(CLAVE_BLOQUEO, JSON.stringify({ hasta: Date.now() + 7 * 86_400_000, mensaje }));
  } catch {
    /* sin storage: el bloqueo dura lo que la pestaña (el backend lo sigue aplicando) */
  }
  avisarModeracion({ tipo: 'bloqueado', mensaje });
}

function limpiarBloqueo() {
  if (bloqueoGuardado() === null) return;
  try {
    window.localStorage.removeItem(CLAVE_BLOQUEO);
  } catch {
    /* nada que limpiar */
  }
  avisarModeracion({ tipo: 'desbloqueado' });
}

/** Mensaje del bloqueo guardado en este navegador, o null. */
export function bloqueoGuardado() {
  try {
    const b = JSON.parse(window.localStorage.getItem(CLAVE_BLOQUEO) || 'null');
    return b && b.hasta > Date.now() ? b.mensaje || '' : null;
  } catch {
    return null;
  }
}

export function escucharModeracion(fn) {
  const h = (e) => fn(e.detail);
  window.addEventListener(EVENTO, h);
  return () => window.removeEventListener(EVENTO, h);
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
