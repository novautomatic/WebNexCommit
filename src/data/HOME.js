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

// "Todo lo que hacemos" grid. `icon` is a lucide-react name mapped in Home.jsx;
// each card links to /servicios/<slug>.
export const SERVICE_GRID = [
  { slug: 'desarrollo-web', icon: 'Globe', title: 'Páginas web y landing pages', text: 'Sitios rápidos, con tu marca y listos para Google y para tus anuncios.' },
  { slug: 'tiendas-online', icon: 'ShoppingBag', title: 'Tiendas online', text: 'Vende con Webpay, Mercado Pago o Flow y despacho integrado.' },
  { slug: 'restaurantes', icon: 'UtensilsCrossed', title: 'Restaurantes y Uber Eats', text: 'Alta en Uber Eats, pantallas de cocina, delivery con la flota de Uber.' },
  { slug: 'inteligencia-artificial', icon: 'Bot', title: 'Chatbots con IA', text: 'Atención y ventas, agendamiento, toma de pedidos y asistentes internos.' },
  { slug: 'pagos', icon: 'CreditCard', title: 'Pagos online y presenciales', text: 'Webpay, Mercado Pago, Flow y terminales TUU conectados a tu sistema.' },
  { slug: 'integraciones', icon: 'Plug', title: 'APIs e integraciones', text: 'Si un sistema tiene API, lo conectamos: pagos, despacho, CRM, ERP.' },
  { slug: 'aulas-virtuales', icon: 'GraduationCap', title: 'Aulas virtuales', text: 'Cursos por módulos, evaluaciones, certificados y pagos en línea.' },
  { slug: 'automatizacion', icon: 'Workflow', title: 'Automatización', text: 'Seguimiento de clientes, recordatorios y datos que se sincronizan solos.' },
  { slug: 'dashboards', icon: 'LayoutDashboard', title: 'Sistemas y dashboards', text: 'Agenda, inventario, asistencia y reportes hechos a tu medida.' },
];

export const STEPS = [
  { title: 'Conversamos', text: 'Nos escribes por WhatsApp o nos llamas, y entendemos tu negocio y lo que quieres lograr.' },
  { title: 'Propuesta clara', text: 'Te enviamos alcance, plazo y precio cerrado antes de partir.' },
  { title: 'Desarrollo y lanzamiento', text: 'Construimos por hitos, te mostramos avances y publicamos. Después seguimos con soporte.' },
];

// Home FAQ (also published as FAQPage structured data).
export const HOME_FAQS = [
  {
    question: '¿Qué servicios ofrece NexCommit?',
    answer:
      'Creamos páginas web, landing pages y tiendas online; chatbots con inteligencia artificial para WhatsApp y web; sistemas para restaurantes con pantallas de cocina (KDS), alta en Uber Eats y delivery con la flota de Uber; integración de pagos online y presenciales (Webpay, Mercado Pago, Flow y TUU); conexiones por API con cualquier sistema; aulas virtuales y plataformas de cursos; automatizaciones y sistemas a medida con dashboards. Partimos por lo que tu negocio necesita hoy y crecemos contigo.',
  },
  {
    question: '¿Cuánto cuesta una página web?',
    answer:
      'Depende del alcance: no cuesta lo mismo una landing page para una campaña que una tienda online con pagos y despacho. Tras una conversación corta por WhatsApp te enviamos una propuesta por escrito con alcance, plazo y precio cerrado, sin letra chica y antes de empezar.',
  },
  {
    question: '¿Cuánto tiempo toma un proyecto?',
    answer:
      'Una landing page toma alrededor de 1 semana, un sitio corporativo cerca de 3 semanas, una tienda online cerca de 4 semanas y un sistema o plataforma a medida entre 10 y 12 semanas. Un chatbot depende de los canales e integraciones que necesites. El plazo exacto queda en la propuesta y trabajamos por hitos para que veas avances desde la primera semana.',
  },
  {
    question: '¿Qué tipos de chatbot pueden hacer?',
    answer:
      'Hacemos chatbots con inteligencia artificial para atención y ventas por WhatsApp (responden dudas, cotizan y envían links de pago), para agendar horas con recordatorios automáticos, para tomar pedidos de restaurantes y enviarlos directo a cocina, y asistentes internos que responden a tu equipo con los documentos de la empresa. Todos se entrenan con la información de tu negocio y derivan a una persona cuando hace falta.',
  },
  {
    question: '¿Pueden llevar mi restaurante a Uber Eats?',
    answer:
      'Sí. Te acompañamos en el alta de tu local en Uber Eats: menú con fotos y modificadores, horarios y precios. Además podemos instalar pantallas de cocina (KDS) que reemplazan las comandas de papel, darte una carta online con pedidos y pago para tu propia web, y despachar esos pedidos con repartidores de Uber mediante Uber Direct. Estamos preparando la integración para que los pedidos de Uber Eats lleguen solos a tu cocina.',
  },
  {
    question: '¿Qué es un KDS y para qué sirve?',
    answer:
      'Un KDS (Kitchen Display System) es una pantalla en la cocina donde aparecen los pedidos del salón, la web y el delivery apenas se toman, con sus modificaciones a la vista. Cada estación ve solo lo suyo, los pedidos cambian de color si se demoran y con un toque se marcan listos. Se acaban las comandas perdidas o ilegibles y puedes medir los tiempos de tu cocina.',
  },
  {
    question: '¿Qué medios de pago pueden integrar?',
    answer:
      'Webpay de Transbank, Mercado Pago (pagos online y terminales Point), Flow (botón de pago, links por WhatsApp y suscripciones) y terminales TUU de Haulmer para cobrar con tarjeta en tu local con boleta electrónica en cada venta. También conectamos Stripe y Fintoc. Cada pago confirmado se registra solo en tu sistema.',
  },
  {
    question: '¿Pueden conectar mi negocio con otros sistemas?',
    answer:
      'Sí. Si un sistema tiene API, lo conectamos: pasarelas de pago, Uber Direct y couriers como Chilexpress, Starken o Shipit, CRMs como HubSpot o ActiveCampaign, WhatsApp Business API, ERPs y facturación electrónica. Si tu sistema no tiene API, te construimos una.',
  },
  {
    question: '¿Hacen aulas virtuales o plataformas de cursos?',
    answer:
      'Sí. Creamos plataformas de cursos con tu marca: módulos y lecciones con video y material descargable, evaluaciones, certificados al terminar, inscripción y pago en línea con medios chilenos, clases en vivo y seguimiento del avance de cada alumno.',
  },
  {
    question: '¿Trabajan con empresas de regiones o fuera de Chile?',
    answer:
      'Sí, trabajamos 100% remoto con clientes de todo Chile y de otros países. Coordinamos por WhatsApp, correo y videollamada, y publicamos en infraestructura cloud que no depende de dónde estés.',
  },
  {
    question: '¿Ofrecen soporte después de lanzar?',
    answer:
      'Sí. Tenemos planes de hosting, mantención y soporte para que tu web o sistema siga funcionando, con monitoreo, respaldos y mejoras continuas. En chatbots revisamos las conversaciones y ajustamos las respuestas para que conviertan cada vez más.',
  },
];

// Queries typed in the hero search pill (what our buyers actually search).
export const SEARCH_QUERIES = [
  'crear página web para mi negocio',
  'empresa que haga páginas web',
  'chatbot para WhatsApp business',
  'tienda online con Webpay',
  'cuánto cuesta una página web en Chile',
];
