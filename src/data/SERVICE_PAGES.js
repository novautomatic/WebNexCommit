// Content for the /servicios and /servicios/:slug pages (also listed on the home).
// Copy is grounded in the real service catalog and in systems we have built.
// No prices or third-party commissions here: those change and are quoted per project.
//
// Optional fields per page:
//   topic     — text for the pre-filled WhatsApp message ("quiero cotizar <topic>")
//   visual    — 'kds' renders the animated kitchen display demo
//   sections  — [{ title, text, bullets?, badge? }] rendered after the benefits
//   faqs      — [{ question, answer }] rendered as FAQ + FAQPage structured data
export const SERVICE_PAGES = [
  {
    slug: 'desarrollo-web',
    navLabel: 'Páginas web',
    title: 'Diseño y Desarrollo de Páginas Web',
    metaTitle: 'Diseño de Páginas Web a Medida en Chile | NexCommit',
    metaDescription:
      'Creamos páginas web para empresas en Chile: landing pages, sitios corporativos, tiendas online y plataformas a medida. Rápidas, adaptadas a celular y con SEO.',
    intro:
      'Diseñamos y desarrollamos sitios web a medida, desde landing pages hasta plataformas completas, con foco en velocidad, posicionamiento en Google y en que cada visita se convierta en un contacto.',
    topic: 'una página web',
    benefits: [
      'Landing pages en cerca de 1 semana, sitios corporativos en cerca de 3 semanas y tiendas online en cerca de 4 semanas',
      'Diseño propio con la identidad de tu marca, sin plantillas genéricas',
      'SEO técnico desde el día uno: velocidad, estructura, metadatos y sitemap',
      'Botón de WhatsApp, llamada y formularios conectados para captar clientes',
      'Medición con Google Analytics y conversiones listas para Google Ads',
      'Planes de hosting, mantención y soporte después de publicar',
    ],
    noIndex: false,
  },
  {
    slug: 'tiendas-online',
    navLabel: 'Tiendas online',
    title: 'Tiendas Online para Vender en Chile',
    metaTitle: 'Tiendas Online con Webpay y Mercado Pago en Chile | NexCommit',
    metaDescription:
      'Creamos tu tienda online con Webpay, Flow o Mercado Pago, despacho integrado, boleta electrónica y un panel simple para productos, stock y pedidos.',
    intro:
      'Tu tienda online lista para vender: pagos chilenos, despacho integrado y un panel donde tú mismo cargas productos, controlas stock y revisas pedidos.',
    topic: 'una tienda online',
    benefits: [
      'Pagos con Webpay, Mercado Pago, Flow o transferencia',
      'Despacho con Chilexpress, Starken, Shipit o la flota de Uber',
      'Panel simple para productos, variantes, stock y pedidos',
      'Diseño pensado para comprar fácil desde el celular',
      'Recuperación de carritos abandonados por correo o WhatsApp',
      'Fichas de producto optimizadas para aparecer en Google',
    ],
    sections: [
      {
        title: 'Hecha a medida o sobre una plataforma',
        text: 'Si tu negocio necesita algo propio (precios por cliente, reservas, suscripciones, integración con tu sistema), la construimos a medida. Si te conviene una plataforma como Shopify, la montamos y la conectamos con tus pagos y despachos.',
      },
    ],
    noIndex: false,
  },
  {
    slug: 'restaurantes',
    navLabel: 'Restaurantes y Uber Eats',
    title: 'Restaurantes: Uber Eats, KDS y Delivery',
    metaTitle: 'Sistema para Restaurantes, KDS y Uber Eats en Chile | NexCommit',
    metaDescription:
      'Llevamos tu restaurante a Uber Eats, instalamos pantallas de cocina (KDS), delivery con la flota de Uber, carta online con pedidos, punto de venta e inventario.',
    intro:
      'Llevamos tu restaurante a Uber Eats y te damos el sistema para operar todo desde un solo lugar: pedidos del salón, de tu web y de delivery llegan ordenados a la cocina, y los despachos salen con la flota de Uber.',
    topic: 'un sistema para mi restaurante',
    visual: 'kds',
    benefits: [
      'Alta y configuración de tu local en Uber Eats',
      'Pantallas de cocina (KDS) que reemplazan las comandas de papel',
      'Delivery desde tu propia web con repartidores de Uber',
      'Carta online con pedidos y pago para tu propio sitio',
      'Punto de venta, mesas y cuentas abiertas',
      'Inventario, impresión de comandas y reportes de venta',
    ],
    sections: [
      {
        title: 'Lleva tu restaurante a Uber Eats',
        text: 'Te acompañamos en todo el alta: creamos y configuramos tu local, armamos el menú con categorías, modificadores y fotos, definimos horarios y zonas, y dejamos todo listo para que empieces a recibir pedidos desde el panel de Uber Eats.',
        bullets: ['Cuenta y local configurados', 'Menú con fotos, combos y modificadores', 'Horarios, precios y disponibilidad'],
      },
      {
        title: '¿Qué es un KDS?',
        text: 'Un KDS (Kitchen Display System) es una pantalla en la cocina que reemplaza las comandas de papel. Cada pedido aparece al instante, con sus modificaciones y notas a la vista, ordenado por llegada. Cada estación (parrilla, fríos, bebidas) ve solo lo suyo, el color avisa cuando un pedido se está demorando, y con un toque el cocinero lo marca listo y el salón se entera. Funciona en tablets o monitores y puede mantener una impresora de respaldo.',
        bullets: ['Adiós comandas perdidas o ilegibles', 'Salón, web y delivery en una sola pantalla', 'Tiempos medidos para mejorar la cocina'],
      },
      {
        title: 'Delivery con la flota de Uber',
        text: 'Con Uber Direct vendes en tu propia web o por teléfono y Uber pone el repartidor. No es el marketplace: el cliente es tuyo y pagas por envío. Si tienes repartidores propios, el sistema les asigna primero y llama a Uber solo cuando no hay nadie libre o la dirección queda fuera de tu radio.',
        bullets: ['Tu marca, tu cliente', 'Seguimiento del envío en tiempo real', 'Flota propia primero, Uber de respaldo'],
      },
      {
        title: 'Pedidos de Uber Eats directo a tu cocina',
        badge: 'Próximamente',
        text: 'Estamos preparando la integración para que los pedidos de Uber Eats entren solos a tu sistema y a la pantalla de cocina, con el menú y la disponibilidad sincronizados. Sin tablet aparte y sin transcribir pedidos a mano.',
      },
      {
        title: 'Cobra como prefieras',
        text: 'Pagos online con Mercado Pago o Flow en tu carta web, y cobro presencial con tarjeta y boleta electrónica en cada venta con terminales TUU de Haulmer conectados a tu sistema.',
      },
    ],
    faqs: [
      {
        question: '¿Cuánto cobra Uber Eats a un restaurante?',
        answer:
          'Uber Eats cobra una comisión por pedido según el plan que elijas, y las tarifas vigentes están publicadas en su portal para comercios. Te ayudamos a elegir el plan que conviene a tu volumen antes de darte de alta.',
      },
      {
        question: '¿Necesito comprar pantallas especiales para el KDS?',
        answer:
          'No. El KDS funciona en tablets o monitores comunes con navegador, y puedes mantener una impresora térmica de respaldo para las comandas.',
      },
      {
        question: '¿Uber Direct es lo mismo que Uber Eats?',
        answer:
          'No. En Uber Eats el cliente te encuentra en la app de Uber. Con Uber Direct el cliente compra en tu web o te llama, y Uber solo pone el repartidor: pagas por envío y el cliente sigue siendo tuyo.',
      },
    ],
    noIndex: false,
  },
  {
    slug: 'inteligencia-artificial',
    navLabel: 'Chatbots con IA',
    title: 'Chatbots e Inteligencia Artificial para Empresas',
    metaTitle: 'Chatbots con IA para WhatsApp, Instagram y Web | NexCommit',
    metaDescription:
      'Chatbots con inteligencia artificial para WhatsApp, Instagram, Facebook Messenger y tu web: atención y ventas, agendamiento, toma de pedidos y asistentes internos.',
    intro:
      'Creamos chatbots con inteligencia artificial entrenados con la información de tu negocio, que atienden 24/7 en WhatsApp, Instagram, Facebook Messenger y tu web, y derivan a una persona cuando hace falta.',
    topic: 'un chatbot con IA',
    benefits: [
      'Conectado a tu número oficial de WhatsApp Business',
      'Entrenado con tus productos, precios, horarios y políticas',
      'Deriva a tu equipo con todo el contexto cuando es necesario',
      'Registra cada contacto en tu CRM o planilla',
      'También en Instagram, Facebook Messenger y como chat en tu web',
      'Revisión de conversaciones y mejora continua',
    ],
    sections: [
      {
        title: 'Un solo asistente en todos tus canales',
        text: 'El mismo chatbot responde en WhatsApp, en los mensajes directos de Instagram, en Facebook Messenger y en el chat de tu sitio web, con la misma información y el mismo tono. Todas las conversaciones quedan registradas en un solo lugar, sin importar por dónde te escribieron.',
        bullets: ['WhatsApp Business', 'Instagram y Facebook Messenger', 'Chat en tu sitio web'],
      },
      {
        title: 'Atención y ventas por WhatsApp',
        text: 'Responde preguntas frecuentes, recomienda productos, arma cotizaciones y envía links de pago. Cuando el cliente quiere hablar con una persona, la conversación pasa a tu equipo sin perder nada.',
      },
      {
        title: 'Agendamiento de horas',
        text: 'Muestra la disponibilidad real de tu agenda, reserva, confirma y envía recordatorios para reducir las inasistencias. Ideal para clínicas, centros de estética, talleres y servicios profesionales.',
      },
      {
        title: 'Toma de pedidos para restaurantes',
        text: 'Muestra la carta, arma el pedido con sus modificaciones, cobra y lo envía directo a la cocina o a la pantalla KDS.',
      },
      {
        title: 'Asistente interno para tu equipo',
        text: 'Responde a tus trabajadores usando los manuales, procesos y documentos de la empresa, para que nadie dependa de preguntarle siempre a la misma persona.',
      },
    ],
    faqs: [
      {
        question: '¿El chatbot responde como una persona?',
        answer:
          'Usa inteligencia artificial para entender lo que te escriben y responder con tu información y en tu tono. Si no sabe algo o el cliente lo pide, deriva a una persona de tu equipo.',
      },
      {
        question: '¿Funciona en Instagram y Facebook?',
        answer:
          'Sí. Conectamos el chatbot a los mensajes directos de Instagram y a Facebook Messenger de tu página. Responde a quienes te escriben, siguiendo las reglas de Meta para esos canales, y deriva a tu equipo cuando hace falta.',
      },
      {
        question: '¿Necesito WhatsApp Business API?',
        answer:
          'Para un chatbot en WhatsApp sí, y nos encargamos de conectarlo a tu número. Meta cobra por algunos mensajes de plantilla; responder a los clientes que te escriben dentro de la ventana de atención no tiene costo.',
      },
    ],
    noIndex: false,
  },
  {
    slug: 'pagos',
    navLabel: 'Pagos online y presenciales',
    title: 'Pagos Online y Presenciales',
    metaTitle: 'Integración de Pagos: Webpay, Mercado Pago, Flow y TUU | NexCommit',
    metaDescription:
      'Integramos Webpay, Mercado Pago, Flow y terminales TUU de Haulmer a tu web o sistema: pagos online, links de pago, suscripciones y cobro presencial con boleta.',
    intro:
      'Conectamos tu web o tu sistema con los medios de pago que usan tus clientes, online y en el local, para que cada venta quede registrada y conciliada sin trabajo manual.',
    topic: 'una integración de pagos',
    benefits: [
      'Webpay / Transbank para tarjetas de crédito y débito',
      'Mercado Pago: checkout online y terminales Point',
      'Flow: botón de pago, links por WhatsApp y suscripciones',
      'TUU de Haulmer: cobro con tarjeta y boleta electrónica en cada venta',
      'Pagos recurrentes y tarjetas guardadas para tus clientes',
      'Cada pago confirmado actualiza tu sistema automáticamente',
    ],
    sections: [
      {
        title: 'En tu web',
        text: 'Pago dentro de tu sitio o en la página de la pasarela, con confirmación automática del pedido y aviso al cliente.',
      },
      {
        title: 'En tu local',
        text: 'Tu sistema envía el monto al terminal de pago, el cliente paga con tarjeta y el resultado vuelve solo a la venta. Con TUU, cada venta emite su boleta o factura electrónica.',
      },
      {
        title: 'Por WhatsApp',
        text: 'Links de pago que tu equipo o tu chatbot envían en la conversación, para cerrar ventas sin que el cliente salga del chat.',
      },
    ],
    noIndex: false,
  },
  {
    slug: 'integraciones',
    navLabel: 'APIs e integraciones',
    title: 'APIs e Integraciones',
    metaTitle: 'Integraciones por API: Pagos, Delivery, CRM y ERP | NexCommit',
    metaDescription:
      'Conectamos tu negocio con cualquier sistema que tenga API: pasarelas de pago, Uber Direct, couriers, CRMs, ERPs, WhatsApp y facturación electrónica.',
    intro:
      'Si un sistema tiene API, lo conectamos. Hacemos que tu web, tu plataforma y las herramientas que ya usas se hablen entre sí, sin copiar datos a mano.',
    topic: 'una integración por API',
    benefits: [
      'Pasarelas de pago: Webpay, Mercado Pago, Flow, Stripe y Fintoc',
      'Terminales de pago TUU de Haulmer y Mercado Pago Point',
      'Delivery y despacho: Uber Direct, Chilexpress, Starken, Shipit y CorreosChile',
      'CRMs y marketing: HubSpot, ActiveCampaign y GoHighLevel',
      'Mensajería: WhatsApp Business API y Twilio',
      'ERPs, facturación electrónica y APIs propias a medida',
    ],
    sections: [
      {
        title: 'Cómo lo hacemos',
        text: 'Conectamos por API REST y webhooks, con credenciales guardadas de forma segura, registro de cada sincronización y alertas si algo falla. Si tu sistema no tiene API, te construimos una.',
      },
    ],
    noIndex: false,
  },
  {
    slug: 'aulas-virtuales',
    navLabel: 'Aulas virtuales',
    title: 'Aulas Virtuales y Plataformas de Cursos',
    metaTitle: 'Aulas Virtuales y Plataformas de Cursos Online | NexCommit',
    metaDescription:
      'Creamos tu aula virtual: cursos por módulos, videos, evaluaciones, certificados, pagos con medios chilenos, clases en vivo y seguimiento de cada alumno.',
    intro:
      'Creamos tu plataforma de cursos con tu marca: tus alumnos se inscriben, pagan, avanzan por módulos y obtienen su certificado, y tú ves el progreso de cada uno.',
    topic: 'un aula virtual',
    benefits: [
      'Cursos organizados por módulos y lecciones',
      'Videos, audios, material descargable y ejercicios',
      'Evaluaciones con corrección automática y calificaciones',
      'Certificados con el nombre del alumno al terminar',
      'Inscripción y pago con Webpay, Mercado Pago o Flow',
      'Seguimiento del avance de cada alumno y reportes',
    ],
    sections: [
      {
        title: 'Clases en vivo y a tu ritmo',
        text: 'Combina cursos grabados que el alumno avanza a su ritmo con clases en vivo por videollamada, y perfiles para profesores, alumnos y administradores.',
      },
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
    topic: 'una automatización',
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
    slug: 'dashboards',
    navLabel: 'Sistemas y dashboards',
    title: 'Sistemas a Medida, Dashboards y Reportes',
    metaTitle: 'Sistemas a Medida y Dashboards para Empresas | NexCommit',
    metaDescription:
      'Sistemas web a medida para agenda, inventario, asistencia y operaciones, con dashboards, reportes automáticos y exportación de datos.',
    intro:
      'Construimos sistemas y paneles a medida para que tu operación funcione ordenada y tengas visibilidad clara de tus ventas e indicadores clave.',
    topic: 'un sistema a medida',
    benefits: [
      'Sistemas de agenda, inventario, asistencia y portales de clientes',
      'Dashboards operacionales, comerciales y ejecutivos',
      'Reportes automáticos periódicos y exportación a Excel o CSV',
      'Roles y permisos para controlar qué ve cada usuario',
      'Logs y auditoría para trazabilidad de acciones críticas',
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
    benefits: ['Dyetales', 'Nova Dialing', 'Fiedler Corredores', 'Vizzion 360', 'Acupuntura Mtch', 'Dropit', 'Frances NomadLexis'],
    noIndex: true,
  },
];

export function getServicePage(slug) {
  return SERVICE_PAGES.find((service) => service.slug === slug) || null;
}
