// Content for the home page (src/pages/Home.jsx).
// Images are the optimized copies in public/home/ (≈50–110 KB each).

// Real client sites for the projects carousel.
export const SHOWCASE = [
  { name: 'Acupuntura MTCH', kind: 'Sitio + agenda online', url: 'https://www.acupunturamtch.cl/', img: '/home/acupuntura.jpg' },
  { name: 'Dye Tales', kind: 'Tienda online', url: 'https://dyetales.cl/', img: '/home/dyetales.jpg' },
  { name: 'Dropit', kind: 'Tienda online', url: 'https://www.dropit.cl/', img: '/home/dropit.jpg' },
  { name: 'Nova Attendance', kind: 'Sistema a medida', url: 'https://nova-dialing.vercel.app/', img: '/home/nova-dialing.jpg' },
  { name: 'Fiedler Corredores', kind: 'Sitio corporativo', url: 'https://fiedlercorredores.cl/', img: '/home/fiedler-corredores.jpg' },
  { name: 'Vizzion 360', kind: 'Sitio corporativo', url: 'https://vizzion360.cl/', img: '/home/vizzion-360.jpg' },
  { name: 'Frances NomadLexis', kind: 'Plataforma de cursos', url: 'https://frances.nomadlexis.com/', img: '/home/frances_nomadlexis.jpg' },
];

// Usual delivery times in weeks (same figures as the FAQ / Ads landings).
export const PLAZOS_MAX_WEEKS = 12;
export const PLAZOS = [
  { slug: 'landing', name: 'Landing page', desc: 'Una página para campañas y anuncios', from: 1, to: 1, label: '~1 semana', topic: 'una landing page' },
  { slug: 'corporativo', name: 'Sitio web corporativo', desc: 'Tu empresa completa, lista para Google', from: 3, to: 3, label: '~3 semanas', topic: 'una página web' },
  { slug: 'tienda', name: 'Tienda online', desc: 'Webpay, Flow o Mercado Pago y despacho', from: 4, to: 4, label: '~4 semanas', topic: 'una tienda online' },
  { slug: 'chatbot', name: 'Chatbot con IA', desc: 'WhatsApp y web, entrenado con tu negocio', from: null, to: null, label: 'según integración', topic: 'un chatbot con IA' },
  { slug: 'sistema', name: 'Sistema o plataforma a medida', desc: 'Agenda, inventario, reportes, portales', from: 10, to: 12, label: '10 a 12 semanas', topic: 'un sistema a medida' },
];

export const STEPS = [
  { title: 'Conversamos', text: 'Nos escribes por WhatsApp o nos llamas, y entendemos tu negocio y lo que quieres lograr.' },
  { title: 'Propuesta clara', text: 'Te enviamos alcance, plazo y precio cerrado antes de partir.' },
  { title: 'Desarrollo y lanzamiento', text: 'Construimos por hitos, te mostramos avances y publicamos. Después seguimos con soporte.' },
];

// Queries typed in the hero search pill (what our buyers actually search).
export const SEARCH_QUERIES = [
  'crear página web para mi negocio',
  'empresa que haga páginas web',
  'chatbot para WhatsApp business',
  'tienda online con Webpay',
  'cuánto cuesta una página web en Chile',
];
