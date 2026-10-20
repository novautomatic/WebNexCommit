// Microsoft Clarity (mapas de calor y grabaciones de sesión). Solo se carga si el
// visitante ACEPTÓ las cookies (Ley 21.719: consentimiento previo y revocable) y
// nunca en el panel interno. Los textos y formularios van enmascarados: configúralo
// también en clarity.microsoft.com → Configuración → Enmascaramiento → "Estricto".
// Mientras CLARITY_ID esté vacío no hace nada.
export const CLARITY_ID = '';

const CLAVE_CONSENTIMIENTO = 'nc_cookie_consent';
const INTERNAS = /^\/(admin|login|reset-password|mi-tienda)(\/|$)/;

export function activarClarity() {
  if (!CLARITY_ID || typeof window === 'undefined' || window.clarity || INTERNAS.test(window.location.pathname)) return;
  window.clarity = function clarity() {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
  document.head.appendChild(s);
  window.clarity('consent');
}

export function activarClaritySiHayConsentimiento() {
  try {
    if (window.localStorage.getItem(CLAVE_CONSENTIMIENTO) === 'granted') activarClarity();
  } catch {
    /* storage no disponible: sin consentimiento guardado, no se carga */
  }
}
