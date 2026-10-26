// Medición de visitas (GA4, Google Ads, Clarity) sin aviso de cookies: rige la
// Ley 19.628 y los rastreadores nunca reciben datos que identifiquen a la persona.
// Quien no quiera ser medido lo pide desde la política de privacidad; se guarda en
// el navegador con la misma clave que usaba el antiguo aviso, así que quien lo
// rechazó antes sigue sin ser medido. index.html lee esta clave antes de cargar gtag.
const CLAVE = 'nc_cookie_consent';

export function medicionActiva() {
  try {
    return window.localStorage.getItem(CLAVE) !== 'denied';
  } catch {
    return true;
  }
}

/** Activa o desactiva la medición en este navegador y recarga para aplicarlo. */
export function cambiarMedicion(activa) {
  try {
    if (activa) window.localStorage.removeItem(CLAVE);
    else window.localStorage.setItem(CLAVE, 'denied');
  } catch {
    /* sin almacenamiento: no se puede recordar la elección */
  }
  if (typeof window.gtag === 'function') {
    const v = activa ? 'granted' : 'denied';
    window.gtag('consent', 'update', { analytics_storage: v, ad_storage: v, ad_user_data: v });
  }
  window.location.reload();
}
