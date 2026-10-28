// Formatos, colores y traducciones del panel Herramientas Google.
// Color de serie validado con dataviz/validate_palette.js en modo oscuro (#0d1e30);
// estados = paleta de estado reservada (siempre con ícono + texto).
export const SERIE = '#3987e5';
// Periodo de comparación («Resumen claro»): 2.º color categórico, validado junto al azul
// sobre #0d1e30 (CVD y visión normal OK). Siempre punteado + leyenda, nunca color solo.
export const COMPARA = '#d95926';
export const ESTADO = { bien: '#0ca30c', mejorar: '#fab219', alerta: '#d03b3b' };

export const clp = (n) => (n == null ? '—' : `$${Math.round(n).toLocaleString('es-CL')}`);
export const entero = (n) => (n == null ? '—' : Math.round(n).toLocaleString('es-CL'));
export const pct = (f, dec = 0) => (f == null || Number.isNaN(f) ? '—' : `${(f * 100).toLocaleString('es-CL', { maximumFractionDigits: dec })}%`);
export const dec1 = (n) => (n == null ? '—' : Number(n).toLocaleString('es-CL', { maximumFractionDigits: 1 }));
export const diaCorto = (iso) => (iso ? `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}` : '');

// Completa los días sin datos con 0 para que el eje de tiempo sea honesto.
export function serieDiaria(filas, campoFecha, campoValor, dias) {
  const mapa = new Map();
  for (const f of filas || []) {
    let k = String(f[campoFecha]);
    if (/^\d{8}$/.test(k)) k = `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
    mapa.set(k, (mapa.get(k) || 0) + (Number(f[campoValor]) || 0));
  }
  const out = [];
  const hoy = new Date();
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy.getTime() - i * 864e5).toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
    out.push({ x: d, v: mapa.get(d) || 0 });
  }
  return out;
}

const T = {
  MOBILE: 'Celular', DESKTOP: 'Computador', TABLET: 'Tablet', CONNECTED_TV: 'TV', OTHER: 'Otro',
  URL_CLICKS: 'Título del anuncio', SITELINKS: 'Enlaces del anuncio', CALLS: 'Llamada', MOBILE_CALL_TRACKING: 'Llamada',
  CALL_TRACKING: 'Llamada', LOCATION_EXPANSION: 'Ubicación', PRODUCT_EXTENSION_CLICKS: 'Producto',
  MALE: 'Hombres', FEMALE: 'Mujeres', UNDETERMINED: 'Desconocido',
  AGE_RANGE_18_24: '18–24', AGE_RANGE_25_34: '25–34', AGE_RANGE_35_44: '35–44', AGE_RANGE_45_54: '45–54',
  AGE_RANGE_55_64: '55–64', AGE_RANGE_65_UP: '65+', AGE_RANGE_UNDETERMINED: 'Desconocida',
  EXCELLENT: 'Excelente', GOOD: 'Buena', AVERAGE: 'Promedio', POOR: 'Mala', PENDING: 'Pendiente', UNKNOWN: '—',
  BEST: 'Mejor', LOW: 'Bajo', LEARNING: 'Aprendiendo', NOT_APPLICABLE: 'Aún sin calificar',
  ONE_PER_CLICK: 'Una por clic', MANY_PER_CLICK: 'Todas', HIDDEN: 'Oculta',
  ABOVE_AVERAGE: 'Sobre el promedio', BELOW_AVERAGE: 'Bajo el promedio',
  ENABLED: 'Activa', PAUSED: 'Pausada', REMOVED: 'Eliminada', ELIGIBLE: 'Apta', RARELY_SERVED: 'Casi no se muestra',
  ADDED: 'Agregada', EXCLUDED: 'Excluida', NONE: '—', ADDED_EXCLUDED: 'Agregada y excluida',
  BROAD: 'Amplia', PHRASE: 'Frase', EXACT: 'Exacta', NEAR_EXACT: 'Exacta (variante)', NEAR_PHRASE: 'Frase (variante)',
  APPROVED: 'Aprobado', APPROVED_LIMITED: 'Aprobado (limitado)', DISAPPROVED: 'Rechazado', AREA_OF_INTEREST: 'Interés',
  LOCATION_OF_PRESENCE: 'Presencia', HEADLINE: 'Título', DESCRIPTION: 'Descripción',
  TARGET_SPEND: 'Maximizar clics', MAXIMIZE_CONVERSIONS: 'Maximizar conversiones', TARGET_CPA: 'CPA objetivo', MANUAL_CPC: 'CPC manual',
  SITELINK: 'Enlace', CALLOUT: 'Texto destacado', STRUCTURED_SNIPPET: 'Fragmento', CALL: 'Llamada', BUSINESS_NAME: 'Nombre', BUSINESS_LOGO: 'Logo',
};
export const tr = (v) => T[v] ?? v ?? '—';

// Estados de indexación de Search Console (URL Inspection API).
export const INDEXACION = {
  'Submitted and indexed': { texto: 'En Google', nivel: 'bien' },
  'Indexed, not submitted in sitemap': { texto: 'En Google (fuera del sitemap)', nivel: 'bien' },
  'Discovered - currently not indexed': { texto: 'Descubierta: en la fila de Google', nivel: 'mejorar' },
  'Crawled - currently not indexed': { texto: 'Rastreada pero NO indexada: mejorar contenido', nivel: 'alerta' },
  'URL is unknown to Google': { texto: 'Google no la conoce', nivel: 'alerta' },
  'Page with redirect': { texto: 'Redirige a otra', nivel: 'mejorar' },
  'Excluded by ‘noindex’ tag': { texto: 'Excluida (noindex)', nivel: 'alerta' },
};

// Los títulos del anuncio llegan como texto con estructura; sacamos solo los textos.
export function textos(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => x.text || x).filter(Boolean);
  const s = String(v);
  const m = [...s.matchAll(/text=(.*?)(?=, [a-zA-Z]+=|\})/g)].map((x) => x[1].trim());
  return m.length ? m : [s];
}
