// Landing pages for the Google Ads search campaign (routes /lp/:slug).
// Each one mirrors one ad group: the H1 repeats the search intent so the
// visitor sees exactly what they searched for (better Quality Score + CTR).
// Pages are noindex so they don't compete with /servicios in organic search.

// Set to true if you decide to show "desde $X" on the landings.
export const SHOW_PRICES = false;

export const ADS_LANDINGS = [
  {
    slug: 'paginas-web',
    topic: 'una página web',
    eyebrow: 'Diseño y desarrollo web en Chile',
    title: 'Páginas web profesionales para tu empresa',
    highlight: 'que consiguen clientes',
    subtitle:
      'Creamos tu sitio web a medida: rápido, adaptado a celulares, con SEO desde el día uno y WhatsApp integrado para que las visitas te contacten.',
    priceFrom: 580000,
    priceNote: 'sitio corporativo',
    bullets: [
      'Sitio corporativo listo en ~3 semanas',
      'Diseño 100% a medida, sin plantillas genéricas',
      'Optimizado para Google (SEO técnico)',
      'Botón de WhatsApp y formularios para captar contactos',
    ],
    includes: [
      { title: 'Diseño UX/UI a medida', text: 'Una web con la identidad de tu marca, pensada para convertir visitas en clientes.' },
      { title: 'Responsive y veloz', text: 'Se ve perfecta en celular, tablet y computador, con tiempos de carga mínimos.' },
      { title: 'SEO técnico incluido', text: 'Estructura, metadatos y sitemap listos para posicionar en Google.' },
      { title: 'Captura de leads', text: 'WhatsApp, llamada y formularios conectados para que no pierdas ningún contacto.' },
      { title: 'Ecommerce opcional', text: 'Tienda online con Webpay/Transbank, Flow o Mercado Pago y despacho integrado.' },
      { title: 'Soporte post-lanzamiento', text: 'Planes de hosting, mantención y soporte para que tu web siga funcionando.' },
    ],
  },
  {
    slug: 'landing-page',
    topic: 'una landing page',
    eyebrow: 'Landing pages para campañas y ventas',
    title: 'Landing page profesional',
    highlight: 'lista en aproximadamente 1 semana',
    subtitle:
      'Una página enfocada en una sola meta: que tu cliente te escriba, te llame o compre. Ideal para campañas de Google Ads, Meta Ads y lanzamientos.',
    priceFrom: 250000,
    priceNote: 'landing page',
    bullets: [
      'Entrega en ~1 semana',
      'Copy y estructura orientados a conversión',
      'WhatsApp, llamada y formulario integrados',
      'Medición de conversiones para tus anuncios',
    ],
    includes: [
      { title: 'Estructura que convierte', text: 'Mensaje claro, beneficios, prueba social y llamados a la acción en el lugar correcto.' },
      { title: 'Lista para anuncios', text: 'Preparada para Google Ads y Meta Ads, con seguimiento de conversiones.' },
      { title: 'Carga ultrarrápida', text: 'Cada segundo cuenta: menos rebote y más contactos por el mismo presupuesto.' },
      { title: 'Diseño con tu marca', text: 'Colores, tipografía y tono de tu negocio, no una plantilla genérica.' },
      { title: 'Contacto directo', text: 'Botones de WhatsApp y llamada visibles en todo momento, sobre todo en celular.' },
      { title: 'Escalable', text: 'Si tu negocio crece, la convertimos en un sitio completo o una plataforma.' },
    ],
  },
  {
    slug: 'aplicaciones-web',
    topic: 'una aplicación o sistema a medida',
    eyebrow: 'Software y aplicaciones web a medida',
    title: 'Aplicaciones web y sistemas',
    highlight: 'hechos a la medida de tu negocio',
    subtitle:
      'Desarrollamos plataformas para agenda, inventario, reportes, portales de clientes y operaciones críticas, con bases de datos seguras y automatizaciones.',
    priceFrom: 3500000,
    priceNote: 'plataforma SaaS',
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
];

export const PROCESS_STEPS = [
  { title: 'Conversamos', text: 'Nos escribes por WhatsApp o nos llamas y entendemos tu negocio y objetivo.' },
  { title: 'Propuesta clara', text: 'Te enviamos alcance, plazos y precio antes de partir, sin letra chica.' },
  { title: 'Desarrollo y lanzamiento', text: 'Construimos con hitos y comunicación constante hasta publicar.' },
];

export const LANDING_FAQS = [
  {
    question: '¿Cuánto cuesta?',
    answer:
      'Depende del alcance. Tras una conversación corta te enviamos una propuesta con alcance, plazos y precio cerrado antes de empezar.',
  },
  {
    question: '¿Cuánto se demora?',
    answer:
      'Una landing page toma alrededor de 1 semana, un sitio corporativo cerca de 3 semanas, un ecommerce cerca de 4 semanas y una plataforma a medida entre 10 y 12 semanas.',
  },
  {
    question: '¿Trabajan con empresas de regiones?',
    answer:
      'Sí. Trabajamos 100% remoto con clientes de todo Chile, por WhatsApp, llamada y videollamada.',
  },
  {
    question: '¿Qué pasa después de lanzar?',
    answer:
      'Ofrecemos planes de hosting, mantención y soporte para que tu web o plataforma siga funcionando sin fricción.',
  },
];

export function getAdLanding(slug) {
  return ADS_LANDINGS.find((l) => l.slug === slug) || null;
}
