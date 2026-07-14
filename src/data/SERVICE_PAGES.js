// Content for the /servicios and /servicios/:slug landing pages.
// Copy is grounded in the real service catalog (SERVICE_CATEGORIES.js,
// PROJECT_PRICING.js, PROJECT_MODULES.js) but does not expose internal
// service codes or specific prices — that's a deferred business decision.
export const SERVICE_PAGES = [
  {
    slug: 'desarrollo-web',
    navLabel: 'Desarrollo Web',
    title: 'Desarrollo Web a Medida',
    metaTitle: 'Desarrollo Web a Medida | NexCommit',
    metaDescription:
      'Sitios y aplicaciones web a medida con React, Supabase y despliegue en Vercel. Landing pages, sitios corporativos, ecommerce y plataformas SaaS.',
    intro:
      'Diseñamos y desarrollamos sitios web y aplicaciones a medida, desde landing pages hasta plataformas SaaS completas, con foco en performance, SEO y conversión.',
    benefits: [
      'Landing pages en cerca de 1 semana, sitios corporativos en cerca de 3 semanas y ecommerce en cerca de 4 semanas',
      'Stack moderno: React, Supabase/PostgreSQL y despliegue en Vercel',
      'SEO técnico incorporado desde el día uno para mejorar visibilidad orgánica',
      'Diseño UX/UI responsive, pensado para convertir visitas en clientes',
      'Formularios de contacto y botón de WhatsApp integrados para capturar leads',
    ],
    noIndex: false,
  },
  {
    slug: 'automatizacion',
    navLabel: 'Automatización',
    title: 'Automatización de Procesos',
    metaTitle: 'Automatización de Procesos | NexCommit',
    metaDescription:
      'Automatizamos flujos comerciales y operativos: seguimiento por WhatsApp, email marketing, recuperación de carritos y sincronización entre sistemas.',
    intro:
      'Conectamos tus herramientas y automatizamos flujos repetitivos para que tu equipo gane tiempo y tu operación reduzca fricción.',
    benefits: [
      'Seguimiento automático de leads por WhatsApp y email',
      'Recuperación de carritos abandonados y secuencias de nutrición',
      'Integración con CRMs como HubSpot, ActiveCampaign y GoHighLevel',
      'Webhooks y sincronización de datos (ETL) entre sistemas',
      'Alertas internas y pipeline comercial visible en tiempo real',
    ],
    noIndex: false,
  },
  {
    slug: 'integraciones',
    navLabel: 'Integraciones',
    title: 'Integraciones de Pago, Logística y CRM',
    metaTitle: 'Integraciones de Pago, Logística y CRM | NexCommit',
    metaDescription:
      'Integramos pasarelas de pago, logística de despacho y CRMs a tu plataforma: Stripe, Flow, Mercado Pago, Transbank, Chilexpress, HubSpot y más.',
    intro:
      'Conectamos tu sitio o plataforma con las herramientas que tu negocio ya usa —o necesita— para cobrar, despachar y vender.',
    benefits: [
      'Pasarelas de pago: Stripe, Flow, Mercado Pago, Transbank y Fintoc',
      'Logística y despacho: Uber Direct, Chilexpress, Starken, Shipit y CorreosChile',
      'CRMs y marketing: HubSpot, ActiveCampaign y GoHighLevel',
      'Mensajería automatizada: WhatsApp API y Twilio',
      'Integración con sistemas ERP para operaciones más complejas',
    ],
    noIndex: false,
  },
  {
    slug: 'dashboards',
    navLabel: 'Dashboards',
    title: 'Dashboards y Reportes',
    metaTitle: 'Dashboards y Reportes a Medida | NexCommit',
    metaDescription:
      'Dashboards operacionales, comerciales y ejecutivos con reportes automáticos y exportación de datos, para tomar decisiones con información real.',
    intro:
      'Construimos paneles y reportes a medida para que tengas visibilidad clara de tu operación, tus ventas y tus indicadores clave.',
    benefits: [
      'Dashboards operacionales, comerciales y ejecutivos según el nivel de decisión',
      'Reportes automáticos periódicos y exportación a Excel o CSV',
      'Base de datos estructurada en Supabase/PostgreSQL',
      'Roles y permisos para controlar qué ve cada usuario',
      'Logs y auditoría para trazabilidad de acciones críticas',
    ],
    noIndex: false,
  },
  {
    slug: 'inteligencia-artificial',
    navLabel: 'Inteligencia Artificial',
    title: 'Inteligencia Artificial Aplicada',
    metaTitle: 'Inteligencia Artificial Aplicada | NexCommit',
    metaDescription:
      'Chatbots, agentes de ventas y automatización con IA: atención al cliente, clasificación de leads, cotizaciones y agendamiento automático.',
    intro:
      'Aplicamos IA donde realmente aporta: atención al cliente, clasificación de oportunidades y automatización de tareas comerciales repetitivas.',
    benefits: [
      'Chatbots entrenados con el contexto de tu negocio',
      'Agentes de IA para ventas y seguimiento de oportunidades',
      'Clasificación automática de leads según potencial',
      'Cotizaciones y agendamiento automático',
      'Resúmenes e informes generados automáticamente con IA',
    ],
    noIndex: false,
  },
  {
    slug: 'casos-de-exito',
    navLabel: 'Casos de Éxito',
    title: 'Casos de Éxito',
    metaTitle: 'Casos de Éxito | NexCommit',
    metaDescription:
      'Estamos documentando el impacto real de nuestros proyectos. Pronto vas a encontrar aquí casos de éxito detallados con métricas y resultados.',
    intro:
      'Estamos documentando el impacto de nuestros proyectos — pronto vas a encontrar aquí casos de éxito detallados con métricas y resultados reales.',
    benefits: ['Fibra Eyewear', 'Dyetales', 'Tarot-Dann', 'Nova Dialing', 'Fiedler Corredores', 'Vizzion 360'],
    noIndex: true,
  },
];

export function getServicePage(slug) {
  return SERVICE_PAGES.find((service) => service.slug === slug) || null;
}
