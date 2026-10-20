// Medición de clics de toda la web con UN solo listener (no hay que tocar cada botón):
//
//  - Enlaces a NUESTRO WhatsApp o teléfono que no pasan por <WhatsAppLink>/<CallLink>
//    (Creador, Mi Tienda, avisos…) → mismo contacto que el resto: trackContact().
//    Los que sí pasan por esos componentes llevan data-tracked y se saltan aquí.
//  - Navegación interna (menú, "Ver servicios", tarjetas…) y cualquier elemento con
//    data-track="nombre" → evento GA4 `cta_click` con el texto y el destino.
//
// No guarda datos personales: solo el texto del botón (recortado), la ruta y el destino.
// /admin, /login y /mi-tienda no se miden (panel interno).
import { PHONE_E164, WHATSAPP_NUMBER, trackContact } from '../config/contact';

const INTERNAS = /^\/(admin|login|reset-password|mi-tienda)(\/|$)/;

function texto(el) {
  return (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

export function instalarMedicionDeClics() {
  if (typeof window === 'undefined' || window.__ncClics) return;
  window.__ncClics = true;
  document.addEventListener('click', (e) => {
    if (INTERNAS.test(window.location.pathname)) return;
    const el = e.target.closest?.('a[href], button[data-track], [data-track]');
    if (!el || el.dataset.tracked) return;
    const href = el.getAttribute('href') || '';
    const placement = el.dataset.placement || `auto${window.location.pathname}`;

    if (href.includes(`wa.me/${WHATSAPP_NUMBER}`) || href.includes(`api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}`)) {
      trackContact('whatsapp', placement);
      return;
    }
    if (href.startsWith('tel:') && href.replace(/[^\d+]/g, '').endsWith(PHONE_E164.replace('+', ''))) {
      trackContact('call', placement);
      return;
    }
    if (typeof window.gtag !== 'function') return;
    const interno = href.startsWith('/') || href.startsWith('#') || href.startsWith(window.location.origin);
    if (el.dataset.track || (interno && el.tagName === 'A')) {
      window.gtag('event', 'cta_click', {
        cta_text: texto(el),
        cta_name: el.dataset.track || undefined,
        destino: href.replace(window.location.origin, '').slice(0, 100) || undefined,
        page_path: window.location.pathname,
      });
    }
  }, { capture: true });
}
