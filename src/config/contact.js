// Central contact + conversion-tracking config.
// Every WhatsApp / call button on the site goes through here, so the number,
// the pre-filled message and the Google Ads conversion events live in one place.

export const WHATSAPP_NUMBER = '56929237511';
export const PHONE_E164 = '+56929237511';
export const PHONE_DISPLAY = '+56 9 2923 7511';

// Google Ads conversion tracking.
// Fill these with the values from Google Ads → Objetivos → Conversiones
// (conversion ID looks like 'AW-123456789', each label like 'AbCdEfGhIjKl').
// While empty, only GA4 events are sent (nothing breaks).
export const GOOGLE_ADS = {
  conversionId: '',
  labels: {
    whatsapp: '',
    call: '',
  },
};

const DEFAULT_MESSAGE =
  'Hola! Vengo desde la web de NexCommit y me gustaría más información.';

const GCLID_KEY = 'nc_gclid';

/** Remember if the visitor arrived from a Google Ads click (gclid / gbraid / wbraid). */
export function captureAdClick() {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('gclid') || params.get('gbraid') || params.get('wbraid');
    if (id) window.sessionStorage.setItem(GCLID_KEY, id);
  } catch {
    /* storage unavailable — ignore */
  }
}

function cameFromAds() {
  try {
    return Boolean(window.sessionStorage.getItem(GCLID_KEY));
  } catch {
    return false;
  }
}

/**
 * Build a wa.me link. `topic` (e.g. "una landing page") personalises the
 * message; visitors coming from an ad get a short "[Google]" tag so you can
 * tell ad leads apart inside WhatsApp.
 */
export function whatsappUrl(topic) {
  let text = topic
    ? `Hola! Vengo desde la web de NexCommit y quiero cotizar ${topic}.`
    : DEFAULT_MESSAGE;
  if (typeof window !== 'undefined' && cameFromAds()) text += ' [Google]';
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const telUrl = `tel:${PHONE_E164}`;

/** Fire GA4 + Google Ads conversion events for a contact click. */
export function trackContact(channel, placement = 'unknown') {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', channel === 'call' ? 'click_call' : 'click_whatsapp', {
    placement,
    page_path: window.location.pathname,
  });
  window.gtag('event', 'generate_lead', { method: channel, placement });

  const label = GOOGLE_ADS.labels[channel];
  if (GOOGLE_ADS.conversionId && label) {
    window.gtag('event', 'conversion', {
      send_to: `${GOOGLE_ADS.conversionId}/${label}`,
    });
  }
}
