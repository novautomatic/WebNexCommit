// Microsoft Clarity (mapas de calor y grabaciones de sesión). Se carga en todas las
// páginas públicas sin aviso de cookies (Ley 19.628, decisión 22-10-2026), salvo que
// el visitante haya pedido no ser medido (src/lib/medicion.js), y nunca en el panel
// interno ni en páginas con datos personales. Los textos y formularios van
// enmascarados: clarity.microsoft.com → Configuración → Enmascaramiento → "Estricto" (hecho).
// Proyecto "NexCommit" en Clarity (cuenta de Google de NexCommit). Con CLARITY_ID vacío no hace nada.
import { medicionActiva } from './medicion';

export const CLARITY_ID = 'z0slg0b8z6';

const INTERNAS = /^\/(admin|login|reset-password|mi-tienda|mi-espacio|confirmar-datos|resena)(\/|$)/;

export function activarClarity() {
  if (!CLARITY_ID || typeof window === 'undefined' || window.clarity || INTERNAS.test(window.location.pathname)) return;
  if (!medicionActiva()) return;
  window.clarity = function clarity() {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
  document.head.appendChild(s);
}
