// Reseñas de clientes (migraciones 20261021130*_resenas_*.sql).
// `slug` = la página /servicios/:slug donde se muestra la reseña; `frase` va en
// el correo («¿cómo te fue con tu página web?»).
export const SERVICIOS_RESENA = [
  { slug: 'desarrollo-web', label: 'Página web', frase: 'tu página web' },
  { slug: 'tiendas-online', label: 'Tienda online', frase: 'tu tienda online' },
  { slug: 'inteligencia-artificial', label: 'Chatbot con IA', frase: 'tu chatbot con IA' },
  { slug: 'automatizacion', label: 'Sistema a medida', frase: 'tu sistema a medida' },
  { slug: 'restaurantes', label: 'Sistema para restaurante', frase: 'el sistema de tu restaurante' },
  { slug: 'pagos', label: 'Pagos en línea', frase: 'tu integración de pagos' },
  { slug: 'integraciones', label: 'Integraciones', frase: 'tus integraciones' },
  { slug: 'aulas-virtuales', label: 'Aula virtual', frase: 'tu aula virtual' },
  { slug: 'dashboards', label: 'Dashboard', frase: 'tu dashboard' },
];
export const SERVICIO_RESENA = Object.fromEntries(SERVICIOS_RESENA.map((s) => [s.slug, s]));

// Landing de Google Ads (/lp/:slug) → servicio cuyas reseñas van primero.
export const LANDING_SERVICIO = {
  'paginas-web': 'desarrollo-web',
  'landing-page': 'desarrollo-web',
  'aplicaciones-web': 'automatizacion',
  'chatbot-ia': 'inteligencia-artificial',
  'tienda-online': 'tiendas-online',
};

export const RESENA_MIN = 30;
export const RESENA_MAX = 1200;
