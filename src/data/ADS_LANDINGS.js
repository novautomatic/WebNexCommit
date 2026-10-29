// Landing pages for the Google Ads search campaign (routes /lp/:slug).
// Each one mirrors one ad group: the H1 repeats the search intent so the
// visitor sees exactly what they searched for (better Quality Score + CTR).
// Pages are noindex so they don't compete with /servicios in organic search.
// The "desde $X" in the hero comes from the cheapest plan in `planes` (src/data/PRECIOS.js).
// Copy rule: plain words for a business owner (no "SEO", "UX/UI", "leads"):
// what they get, how much it costs and how fast.

import { PAGO, PLANES, PLANES_FOCO } from './PRECIOS.js'; // con extensión: scripts/generate-sitemap.mjs lo importa desde Node

export const ADS_LANDINGS = [
  {
    slug: 'paginas-web',
    // Las búsquedas que más clics traen (Ads, 14–28 oct 2026).
    queries: ['cotizar pagina web', 'precio pagina web', 'pagina web para mi negocio', 'landing page para empresas'],
    planes: PLANES_FOCO,
    topic: 'una página web',
    eyebrow: 'Páginas web para negocios en Chile',
    title: 'Tu página web profesional,',
    highlight: 'lista para recibir clientes',
    subtitle:
      'La diseñamos con tu marca, la dejamos lista para aparecer en Google y con WhatsApp para que te contacten con un toque. Antes de empezar te mandamos el precio y el plazo por escrito.',
    bullets: [
      'Lista en 1 a 4 semanas, según lo que necesites',
      'Se ve perfecta en el celular, donde te buscan tus clientes',
      'Preparada para aparecer en Google',
      'Precio cerrado: lo que cotizamos es lo que pagas',
    ],
  },
  {
    slug: 'landing-page',
    queries: ['landing page para empresas', 'landing page precio', 'diseño landing page'],
    planes: ['landing-page', 'web-empresarial'],
    topic: 'una landing page',
    eyebrow: 'Landing pages para campañas y ventas',
    title: 'Una landing page para tu negocio,',
    highlight: 'lista en 1 semana',
    subtitle:
      'Una sola página con un objetivo: que te escriban, te llamen o te compren. Ideal para tus anuncios en Google, Instagram o Facebook, o para lanzar algo nuevo.',
    bullets: [
      'Lista en aproximadamente 1 semana',
      'Textos pensados para que te contacten, no solo para verse bien',
      'WhatsApp, llamada y formulario a la vista',
      'Lista para medir qué anuncios te traen clientes',
    ],
  },
  {
    slug: 'aplicaciones-web',
    queries: ['sistema web a medida', 'desarrollo de software a medida chile', 'sistema de agenda online'],
    planes: ['reservas-y-citas'],
    topic: 'una aplicación o sistema a medida',
    eyebrow: 'Software y aplicaciones web a medida',
    title: 'Aplicaciones web y sistemas',
    highlight: 'hechos a la medida de tu negocio',
    subtitle:
      'Desarrollamos plataformas para agenda, inventario, reportes, portales de clientes y operaciones críticas, con bases de datos seguras y automatizaciones.',
    bullets: [
      'Desarrollo 100% a medida de tus procesos',
      'Bases de datos seguras (Supabase/PostgreSQL)',
      'Roles, permisos y dashboards en tiempo real',
      'Integraciones con pagos, CRM, WhatsApp e IA',
    ],
    includes: [
      { title: 'Levantamiento del proceso', text: 'Entendemos cómo opera tu negocio antes de escribir una línea de código.' },
      { title: 'Paneles y reportes', text: 'Dashboards operacionales y comerciales, con exportación a Excel/CSV.' },
      { title: 'Usuarios y permisos', text: 'Cada persona ve y hace solo lo que le corresponde, con trazabilidad.' },
      { title: 'Integraciones', text: 'Pasarelas de pago, CRMs, WhatsApp API, ERPs y logística conectados.' },
      { title: 'Automatización e IA', text: 'Chatbots, clasificación de leads, cotizaciones y agendamiento automático.' },
      { title: 'Infraestructura cloud', text: 'Despliegue en Vercel, AWS, GCP o Azure según lo que necesites.' },
    ],
  },
  {
    slug: 'chatbot-ia',
    queries: ['chatbot para whatsapp business', 'chatbot con ia para empresas', 'agente de ia para whatsapp'],
    planes: [],
    topic: 'un chatbot con IA',
    eyebrow: 'Chatbots con inteligencia artificial',
    title: 'Chatbot con IA para tu empresa',
    highlight: 'que atiende y vende 24/7',
    subtitle:
      'Creamos tu chatbot para WhatsApp, Instagram, Facebook y tu sitio web, entrenado con la información de tu negocio: responde consultas, cotiza, agenda y te deriva los clientes listos para comprar.',
    bullets: [
      'Funciona en WhatsApp, Instagram, Facebook y tu web',
      'Entrenado con tus productos, precios y preguntas frecuentes',
      'Agenda, cotiza y captura datos de contacto',
      'Te pasa la conversación cuando el cliente quiere hablar con una persona',
    ],
    includes: [
      { title: 'WhatsApp Business API', text: 'Conectamos el chatbot a tu número oficial de WhatsApp, con plantillas aprobadas por Meta.' },
      { title: 'Entrenado con tu negocio', text: 'Aprende de tus servicios, precios, horarios y políticas para responder como tu equipo.' },
      { title: 'Agenda y cotizaciones', text: 'Reserva horas, envía cotizaciones y hace seguimiento sin intervención manual.' },
      { title: 'Derivación a humano', text: 'Cuando una consulta lo requiere, la conversación pasa a tu equipo con todo el contexto.' },
      { title: 'Conectado a tu CRM', text: 'Cada contacto queda registrado en tu CRM o planilla, clasificado según su potencial.' },
      { title: 'Mejora continua', text: 'Revisamos las conversaciones y ajustamos las respuestas para que convierta cada vez más.' },
    ],
    faqs: [
      {
        question: '¿En qué canales funciona el chatbot?',
        answer:
          'En WhatsApp (lo conectamos a WhatsApp Business API con tu propio número), en los mensajes directos de Instagram, en Facebook Messenger y como chat en tu página web. Es el mismo asistente en todos los canales.',
      },
      {
        question: '¿Cuánto se demora?',
        answer:
          'Un chatbot básico queda funcionando en pocas semanas. Uno entrenado con todo tu catálogo e integrado a tu agenda o CRM toma algo más; el plazo exacto va en la propuesta.',
      },
      {
        question: '¿Responde como una persona?',
        answer:
          'Usa inteligencia artificial para entender lo que te escriben y responder con tu información, en tu tono. Si no sabe algo o el cliente lo pide, deriva a una persona de tu equipo.',
      },
      {
        question: '¿Qué pasa después de lanzarlo?',
        answer:
          'Ofrecemos un plan mensual de soporte y mejora continua: revisamos conversaciones, actualizamos la información y ajustamos respuestas.',
      },
    ],
  },
  {
    slug: 'tienda-online',
    queries: ['tienda online con webpay', 'pagina web con carrito de compras', 'cuanto cuesta una tienda online'],
    planes: ['ecommerce'],
    topic: 'una tienda online',
    eyebrow: 'Ecommerce para vender en Chile',
    title: 'Tienda online para tu negocio',
    highlight: 'lista para vender con Webpay',
    subtitle:
      'Creamos tu tienda online con pagos chilenos (Webpay, Flow, Mercado Pago), despacho integrado y un panel simple para administrar productos, stock y pedidos.',
    bullets: [
      'Tienda lista en ~4 semanas',
      'Pagos con Webpay/Transbank, Flow o Mercado Pago',
      'Despacho con Chilexpress, Starken, Shipit o Uber Direct',
      'Panel para administrar productos, stock y pedidos',
    ],
    includes: [
      { title: 'Diseño con tu marca', text: 'Una tienda con la identidad de tu negocio, pensada para que comprar sea fácil desde el celular.' },
      { title: 'Pagos chilenos', text: 'Webpay/Transbank, Flow, Mercado Pago o transferencia, con confirmación automática.' },
      { title: 'Despacho integrado', text: 'Cálculo de envío y etiquetas con los couriers que ya usas.' },
      { title: 'Administración simple', text: 'Carga productos, controla stock y revisa pedidos sin depender de un programador.' },
      { title: 'Lista para Google', text: 'SEO técnico, fichas de producto optimizadas y medición de ventas para tus anuncios.' },
      { title: 'Recuperación de carritos', text: 'Recordatorios automáticos por correo o WhatsApp para no perder ventas.' },
    ],
  },
];

export const PROCESS_STEPS = [
  { title: 'Nos escribes', text: 'Por WhatsApp, llamada o el formulario. Nos cuentas de tu negocio en 5 minutos, sin compromiso.' },
  { title: 'Te mandamos precio y plazo', text: 'El mismo día hábil y por escrito: qué incluye, cuánto cuesta y cuándo está lista. Sin sorpresas después.' },
  { title: 'La construimos contigo', text: 'Te mostramos avances durante el proyecto y la publicamos juntos. Hablas directo con el equipo que la hace.' },
];

const clp = (n) => '$' + n.toLocaleString('es-CL');
const precioDe = (slug) => clp(PLANES.find((p) => p.slug === slug).precio);

export const LANDING_FAQS = [
  {
    question: '¿Cuánto cuesta una página web?',
    answer:
      `Una landing page cuesta ${precioDe('landing-page')} + IVA, una tienda online ${precioDe('ecommerce')} + IVA y una página empresarial de varias secciones ${precioDe('web-empresarial')} + IVA. Si necesitas algo extra, te lo cotizamos antes de empezar: el precio que acordamos por escrito es el que pagas.`,
  },
  {
    question: '¿Cómo se paga?',
    answer: `En dos partes: ${PAGO}. No pagas nada por cotizar.`,
  },
  {
    question: '¿Cuánto se demora?',
    answer:
      'Una landing page está lista en alrededor de 1 semana, una página empresarial en 3 a 4 semanas y una tienda online en unas 4 semanas, desde que apruebas la propuesta. La fecha exacta va por escrito.',
  },
  {
    question: '¿Qué necesito para empezar?',
    answer:
      'Tu logo si lo tienes, fotos de tus productos o servicios y una idea de lo que quieres contar. Si te faltan textos o fotos, lo vemos juntos en la propuesta.',
  },
  {
    question: '¿El hosting y el dominio están incluidos?',
    answer:
      'Se contratan aparte en un plan mensual de hosting, mantención y soporte, para que tu página siga funcionando y al día después de publicarla.',
  },
  {
    question: '¿Trabajan con negocios de regiones?',
    answer:
      'Sí. Trabajamos 100% remoto con clientes de todo Chile, por WhatsApp, llamada y videollamada.',
  },
];

export function getAdLanding(slug) {
  return ADS_LANDINGS.find((l) => l.slug === slug) || null;
}
