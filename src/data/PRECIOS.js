// Planes y precios públicos de NexCommit (página /precios y artículo del blog).
// Precios definidos por el dueño el 2026-10-20, en CLP + IVA. Cambiar un precio
// = cambiarlo SOLO aquí. Cada "incluye" repite lo que ya prometen /lp y /servicios.
export const PLANES = [
  {
    slug: 'landing-page',
    nombre: 'Landing page',
    precio: 300000,
    para: 'Para lanzar un producto, una campaña de Google o Meta Ads, o tener presencia rápida.',
    plazo: '~1 semana',
    topic: 'una landing page',
    incluye: [
      'Una página enfocada en que te escriban, te llamen o te compren',
      'Diseño con tu marca (colores, tipografía y tono), sin plantillas genéricas',
      'Adaptada a celular y de carga rápida',
      'Botones de WhatsApp y llamada, y formulario de contacto',
      'SEO técnico: títulos, descripción y sitemap listos para Google',
      'Lista para anuncios, con medición de conversiones',
    ],
  },
  {
    slug: 'ecommerce',
    nombre: 'E-commerce',
    precio: 800000,
    para: 'Para vender tus productos en línea y cobrar con medios de pago chilenos.',
    plazo: '~4 semanas',
    topic: 'una tienda online',
    incluye: [
      'Tienda con tu marca, pensada para comprar fácil desde el celular',
      'Un medio de pago incluido: Webpay (Transbank), Flow o Mercado Pago',
      'Panel para cargar productos, controlar stock y revisar pedidos',
      'Fichas de producto optimizadas para Google',
      'Medición de ventas para tus anuncios',
      'Despacho con retiro o tarifa fija; couriers (Chilexpress, Starken, Shipit) como adicional',
    ],
  },
  {
    slug: 'reservas-y-citas',
    nombre: 'Reservas y citas',
    precio: 1000000,
    para: 'Para clínicas, consultas, centros de estética, terapeutas y servicios con agenda.',
    plazo: 'según tu agenda y servicios',
    topic: 'un sistema de reservas y citas',
    incluye: [
      'Página web de tu negocio con agenda online',
      'Tus clientes ven las horas disponibles y reservan solos',
      'Pago online al reservar (Mercado Pago o Webpay) o pago en el local',
      'Correos de confirmación y recordatorio para reducir inasistencias',
      'Reagendar y cancelar con verificación por correo',
      'Panel para administrar horas, servicios, clientes y pagos',
    ],
  },
  {
    slug: 'web-empresarial',
    nombre: 'Página empresarial a medida',
    precio: 1200000,
    para: 'Para empresas que necesitan un sitio completo que represente su marca y capte clientes.',
    plazo: '~3 a 4 semanas',
    topic: 'una página web empresarial',
    incluye: [
      'Sitio de varias páginas: inicio, servicios, nosotros, casos y contacto',
      'Diseño UX/UI 100% a medida de tu marca',
      'SEO técnico y textos pensados para las búsquedas de tus clientes',
      'Blog para publicar novedades y artículos',
      'WhatsApp, llamada y formularios conectados para no perder contactos',
      'Medición con Google Analytics y conversiones para tus anuncios',
    ],
  },
];

export const NOTA_PRECIOS =
  'Valores en pesos chilenos + IVA, por el plan base. Si necesitas algo adicional (más páginas, otro medio de pago, integraciones), te lo cotizamos antes de partir: la propuesta llega con alcance, plazo y precio cerrado. Hosting, dominio y mantención se contratan aparte en un plan mensual.';

export const FAQ_PRECIOS = [
  {
    question: '¿Los precios incluyen IVA?',
    answer: 'No. Todos los valores son + IVA y corresponden al plan base de cada servicio.',
  },
  {
    question: '¿Qué pasa si necesito algo que no está en el plan?',
    answer:
      'Lo conversamos y te enviamos una propuesta con alcance, plazo y precio cerrado antes de empezar. Así sabes exactamente cuánto vas a pagar.',
  },
  {
    question: '¿El hosting y el dominio están incluidos?',
    answer:
      'Se contratan aparte en un plan mensual de hosting, mantención y soporte, para que tu sitio siga funcionando y actualizado después del lanzamiento.',
  },
  {
    question: '¿Trabajan con empresas de regiones?',
    answer: 'Sí. Trabajamos 100% remoto con clientes de todo Chile, por WhatsApp, llamada y videollamada.',
  },
];
