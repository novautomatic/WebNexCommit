export const SERVICE_CATEGORIES = [
  {
    category: 'Diseño y experiencia',
    items: {
      ux_ui: { label: 'Diseño UX/UI personalizado', description: 'Interfaces diseñadas según la identidad y objetivos del negocio.' },
      responsive: { label: 'Responsive', description: 'Adaptación optimizada para móvil, tablet y escritorio.' },
      scalable_structure: { label: 'Estructura corporativa', description: 'Arquitectura pensada para presentar servicios y contenido de forma clara.' },
      contact_form: { label: 'Formulario de contacto', description: 'Recepción ordenada de consultas y solicitudes comerciales.' },
      whatsapp_button: { label: 'Botón WhatsApp', description: 'Acceso rápido a contacto comercial desde la plataforma.' },
    },
  },
  {
    category: 'SEO y marketing',
    items: {
      basic_seo: { label: 'SEO básico', description: 'Optimización técnica inicial para indexación en buscadores.' },
      basic_seo_extended: { label: 'SEO ampliado', description: 'Estructura optimizada para mejorar visibilidad orgánica.' },
      email_marketing: { label: 'Email marketing', description: 'Automatización y envío de campañas comerciales.' },
      cart_recovery: { label: 'Recuperación de carrito', description: 'Automatización para recuperar compras no finalizadas.' },
      lead_scoring: { label: 'Lead scoring', description: 'Clasificación automática de oportunidades comerciales.' },
      whatsapp_followup: { label: 'Seguimiento WhatsApp', description: 'Automatización de seguimiento comercial mediante WhatsApp.' },
      email_sequence: { label: 'Secuencia emails', description: 'Flujos automáticos de seguimiento y nutrición de leads.' },
    },
  },
  {
    category: 'Ecommerce',
    items: {
      catalog: { label: 'Catálogo', description: 'Visualización estructurada de productos o servicios.' },
      cart: { label: 'Carrito de compras', description: 'Gestión de productos antes de finalizar la compra.' },
      checkout: { label: 'Checkout', description: 'Proceso de pago optimizado para conversión.' },
      product_management: { label: 'Gestión de productos', description: 'Crear, editar y administrar productos del catálogo.' },
      order_management: { label: 'Pedidos', description: 'Administración y seguimiento de órdenes de compra.' },
      stock_management: { label: 'Gestión de stock', description: 'Control de inventario y disponibilidad en tiempo real.' },
      product_variants: { label: 'Variantes', description: 'Gestión de versiones y atributos de productos.' },
      basic_coupons: { label: 'Cupones básicos', description: 'Promociones y descuentos aplicables al carrito.' },
      basic_transactional_emails: { label: 'Emails transaccionales', description: 'Correos automáticos de confirmación y notificación.' },
      shipping_quote: { label: 'Cotizador de despacho', description: 'Cálculo automático de costos de envío.' },
      order_tracking: { label: 'Tracking de pedidos', description: 'Seguimiento de estado y trazabilidad de envíos.' },
    },
  },
  {
    category: 'Pagos y suscripciones',
    items: {
      one_payment_gateway_base: { label: '1 pasarela de pago base', description: 'Cobros online con una pasarela integrada.' },
      flow: { label: 'Flow', description: 'Integración de pagos online mediante Flow.' },
      mercado_pago: { label: 'Mercado Pago', description: 'Pasarela de pago para cobros online.' },
      transbank: { label: 'Transbank / Webpay', description: 'Integración de pagos con Webpay.' },
      stripe: { label: 'Stripe', description: 'Pasarela internacional para pagos y suscripciones.' },
      fintoc: { label: 'Fintoc', description: 'Conexión de cobros y validaciones bancarias directas.' },
      subscriptions: { label: 'Suscripciones', description: 'Cobros recurrentes y gestión de membresías.' },
      multi_payment_gateway: { label: 'Multi pasarela de pago', description: 'Soporte para múltiples métodos de cobro.' },
    },
  },
  {
    category: 'Logística y despacho',
    items: {
      shipping_quote: { label: 'Cotizador de despacho', description: 'Cálculo automático de costos de envío.' },
      order_tracking: { label: 'Tracking de pedidos', description: 'Seguimiento de estado y trazabilidad de envíos.' },
      uber_direct: { label: 'Uber Direct', description: 'Reparto de última milla integrado.' },
      correos_chile: { label: 'CorreosChile', description: 'Logística de despachos con Correos de Chile.' },
      chilexpress: { label: 'Chilexpress', description: 'Gestión de envíos con Chilexpress.' },
      starken: { label: 'Starken', description: 'Alternativa de despacho con Starken.' },
      shipit: { label: 'Shipit', description: 'Plataforma de gestión logística y envíos.' },
    },
  },
  {
    category: 'Administración y operación',
    items: {
      basic_admin_panel: { label: 'Panel admin básico', description: 'Administración inicial de información y contenido.' },
      full_admin_panel: { label: 'Panel administrativo completo', description: 'Control centralizado de la operación del sistema.' },
      admin_panel: { label: 'Panel administrador', description: 'Gestión general del producto o negocio.' },
      user_panel: { label: 'Panel usuario/cliente', description: 'Autonomía al cliente para revisar y ejecutar acciones.' },
      users_roles: { label: 'Usuarios y roles', description: 'Gestión de perfiles y niveles de acceso.' },
      basic_permissions: { label: 'Permisos básicos', description: 'Restricción de accesos según perfil.' },
      advanced_permissions: { label: 'Permisos avanzados', description: 'Control granular de accesos y funcionalidades.' },
      customer_management: { label: 'Gestión de clientes', description: 'Administración de clientes y usuarios del sistema.' },
      content_management: { label: 'Gestión de contenidos', description: 'Edición dinámica de textos y secciones.' },
      custom_internal_flows: { label: 'Flujos internos personalizados', description: 'Procesos adaptados a la operación del negocio.' },
      multi_branch: { label: 'Multi sucursal', description: 'Operación de distintas sedes en una misma solución.' },
      billing: { label: 'Facturación', description: 'Gestión ligada a cobros y emisión de documentos.' },
      reservations: { label: 'Reservas', description: 'Agendamiento de cupos, horas o espacios.' },
      kds: { label: 'KDS cocina', description: 'Organización de pedidos en cocina para reducción de errores.' },
    },
  },
  {
    category: 'Dashboards y reportes',
    items: {
      dashboard_basic: { label: 'Dashboard operacional', description: 'Visualización rápida de métricas operativas.' },
      executive_dashboard: { label: 'Dashboard ejecutivo', description: 'Vista estratégica de indicadores del negocio.' },
      commercial_dashboard: { label: 'Dashboard comercial', description: 'Seguimiento de ventas y oportunidades.' },
      basic_reports: { label: 'Reportes básicos', description: 'Informes operativos y métricas principales.' },
      advanced_reports: { label: 'Reportes avanzados', description: 'Análisis más profundo de métricas y rendimiento.' },
      automatic_reports: { label: 'Reportes automáticos', description: 'Generación periódica automatizada de reportes.' },
      basic_export: { label: 'Exportación básica', description: 'Exportación de información a Excel o CSV.' },
      initial_bi: { label: 'BI inicial', description: 'Base inicial para análisis e inteligencia de negocio.' },
      main_dashboard: { label: 'Dashboard principal', description: 'Resumen del estado general de la plataforma.' },
    },
  },
  {
    category: 'IA y automatización',
    items: {
      basic_ai_chatbot: { label: 'Chatbot IA básico', description: 'Automatización básica de respuestas frecuentes.' },
      trained_ai_chatbot: { label: 'Chatbot entrenado', description: 'Asistente ajustado al contexto del negocio.' },
      sales_ai_agent: { label: 'Agente IA ventas', description: 'Automatización comercial y seguimiento de oportunidades.' },
      voice_ai: { label: 'Voice AI', description: 'Interacciones automatizadas por voz para atención o seguimiento.' },
      support_ai: { label: 'IA soporte', description: 'Asistencia automatizada para atención al cliente.' },
      lead_classification_ai: { label: 'IA clasificación leads', description: 'Priorización de contactos con mayor potencial comercial.' },
      ai_reports: { label: 'IA reportes', description: 'Resúmenes automáticos de métricas e indicadores.' },
      automatic_quote: { label: 'Cotización automática', description: 'Generación automática de propuestas comerciales.' },
      automatic_scheduling: { label: 'Agendamiento automático', description: 'Coordinación automática de reuniones o reservas.' },
    },
  },
  {
    category: 'Automatización comercial',
    items: {
      crm_pipeline: { label: 'Pipeline CRM', description: 'Visibilidad de etapas de cada oportunidad comercial.' },
      custom_crm_base: { label: 'CRM personalizado base', description: 'Flujo comercial adaptado al negocio.' },
      internal_alerts: { label: 'Alertas internas', description: 'Notificación de eventos importantes del sistema.' },
      webhooks: { label: 'Webhooks', description: 'Comunicación automática entre sistemas en tiempo real.' },
      etl_sync: { label: 'ETL / sincronización', description: 'Movimiento y orden de datos entre sistemas.' },
      controlled_scraping: { label: 'Scraping controlado', description: 'Recopilación automatizada de información útil.' },
    },
  },
  {
    category: 'Integraciones',
    items: {
      hubspot: { label: 'HubSpot', description: 'Integración con CRM y automatización comercial.' },
      activecampaign: { label: 'ActiveCampaign', description: 'Automatización de marketing y seguimiento.' },
      gohighlevel: { label: 'GoHighLevel', description: 'Gestión centralizada de automatizaciones y ventas.' },
      whatsapp_api: { label: 'WhatsApp API', description: 'Integración de mensajería automatizada.' },
      resend: { label: 'Resend', description: 'Infraestructura para correos automáticos.' },
      twilio: { label: 'Twilio', description: 'Servicios de comunicación y automatización.' },
      erp_integration: { label: 'Integración ERP', description: 'Conexión con sistemas empresariales externos.' },
      erp_ready: { label: 'Preparación para ERP', description: 'Base para futuras integraciones con sistemas centrales.' },
    },
  },
  {
    category: 'Infraestructura y escalabilidad',
    items: {
      supabase: { label: 'Supabase/PostgreSQL', description: 'Base de datos moderna y escalable.' },
      postgresql: { label: 'PostgreSQL avanzado', description: 'Estructura robusta para manejo avanzado de datos.' },
      structured_database: { label: 'Base de datos estructurada', description: 'Organización eficiente de información y relaciones.' },
      vercel_deploy: { label: 'Deploy en Vercel', description: 'Publicación optimizada para alto rendimiento.' },
      saas_architecture: { label: 'Arquitectura SaaS', description: 'Base preparada para crecimiento multiusuario.' },
      dedicated_architecture: { label: 'Arquitectura dedicada', description: 'Infraestructura para sistemas de alta exigencia.' },
      high_concurrency_ready: { label: 'Alta concurrencia', description: 'Optimización para múltiples usuarios simultáneos.' },
      enterprise_modules: { label: 'Módulos empresariales', description: 'Funcionalidades avanzadas a medida del negocio.' },
      aws: { label: 'AWS', description: 'Infraestructura cloud en Amazon Web Services.' },
      gcp: { label: 'Google Cloud', description: 'Infraestructura cloud en Google Cloud Platform.' },
      azure: { label: 'Azure', description: 'Infraestructura cloud en Microsoft Azure.' },
      vercel_enterprise: { label: 'Vercel Enterprise', description: 'Infraestructura enterprise en Vercel.' },
    },
  },
  {
    category: 'Seguridad y continuidad',
    items: {
      reinforced_security: { label: 'Seguridad reforzada', description: 'Capas adicionales de protección y control de accesos.' },
      basic_activity_logs: { label: 'Logs básicos', description: 'Registro de actividad y eventos del sistema.' },
      audit_logs: { label: 'Logs y auditoría', description: 'Trazabilidad detallada de acciones y cambios.' },
      monitoring: { label: 'Monitoreo', description: 'Supervisión continua de disponibilidad y rendimiento.' },
      backups: { label: 'Backups', description: 'Respaldos automáticos de información crítica.' },
      basic_maintenance: { label: 'Mantención básica', description: 'Actualizaciones y soporte operativo esencial.' },
      advanced_maintenance: { label: 'Mantención avanzada', description: 'Soporte técnico continuo y mejoras evolutivas.' },
      priority_support: { label: 'Soporte prioritario', description: 'Atención preferencial para incidencias críticas.' },
    },
  },
  {
    category: 'SaaS y mensualidades',
    items: {
      basic_hosting: { label: 'Hosting básico', description: 'Mantiene el proyecto online con costo controlado.' },
      enterprise_hosting: { label: 'Hosting empresarial', description: 'Base robusta para proyectos con mayor exigencia.' },
      chatbot_saas: { label: 'Chatbot SaaS', description: 'Atención automatizada como servicio mensual.' },
      crm_saas: { label: 'CRM SaaS', description: 'Operación comercial como servicio mensual.' },
      ecommerce_saas: { label: 'Ecommerce SaaS', description: 'Operación de venta online como servicio mensual.' },
      reservations_saas: { label: 'Reservas SaaS', description: 'Sistema de agenda como servicio mensual.' },
      kds_saas: { label: 'KDS SaaS', description: 'Operación de cocina digital como servicio mensual.' },
      analytics_saas: { label: 'Analytics SaaS', description: 'Métricas y visibilidad continua como servicio mensual.' },
    },
  },
  {
    category: 'Autenticación y usuarios',
    items: {
      auth: { label: 'Autenticación', description: 'Registro e inicio de sesión seguro para usuarios.' },
      user_management: { label: 'Gestión de usuarios', description: 'Altas, cambios y control de usuarios.' },
      plans_access_levels: { label: 'Planes y niveles de acceso', description: 'Funcionalidades según plan o tipo de cliente.' },
      roles_permissions: { label: 'Roles y permisos', description: 'Separación de responsabilidades y accesos por perfil.' },
      manual_subscription_access: { label: 'Acceso por suscripción manual', description: 'Control de activaciones iniciales de clientes.' },
      basic_email_notifications: { label: 'Notificaciones básicas', description: 'Correos automáticos sobre acciones importantes.' },
    },
  },
];

export function getServiceMeta(key) {
  for (const cat of SERVICE_CATEGORIES) {
    if (cat.items[key]) return cat.items[key];
  }
  return null;
}

export function getServiceLabel(key) {
  const meta = getServiceMeta(key);
  return meta ? meta.label : key;
}

export function getServiceDescription(key) {
  const meta = getServiceMeta(key);
  return meta ? meta.description : '';
}

export function getAllServiceKeys() {
  const keys = [];
  for (const cat of SERVICE_CATEGORIES) {
    for (const key of Object.keys(cat.items)) {
      keys.push(key);
    }
  }
  return keys;
}

export function getServicesNotIn(keysSet) {
  const result = [];
  for (const cat of SERVICE_CATEGORIES) {
    const items = {};
    let hasItems = false;
    for (const [key, val] of Object.entries(cat.items)) {
      if (!keysSet.has(key)) {
        items[key] = val;
        hasItems = true;
      }
    }
    if (hasItems) result.push({ category: cat.category, items });
  }
  return result;
}
