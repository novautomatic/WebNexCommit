export const PROJECT_MODULES = {
  ecommerce: {
    required: [
      'ux_ui',
      'responsive',
      'catalog',
      'cart',
      'checkout',
      'product_management',
      'order_management',
      'stock_management',
    ],
    configurable: {
      payment_gateway: {
        label: 'Pasarela de pago (obligatoria)',
        type: 'single',
        options: ['flow', 'stripe', 'mercado_pago', 'transbank'],
      },
      logistics: {
        label: 'Logística / Envíos (obligatoria)',
        type: 'single',
        options: ['shipit', 'chilexpress', 'starken', 'manual'],
      },
    },
  },

  landing: {
    required: [
      'ux_ui',
      'responsive',
      'basic_seo',
      'contact_form',
      'whatsapp_button',
    ],
    configurable: {},
  },

  corporativo: {
    required: [
      'ux_ui',
      'responsive',
      'scalable_structure',
      'basic_seo_extended',
      'contact_form',
      'whatsapp_button',
      'content_management',
    ],
    configurable: {},
  },

  saas: {
    required: [
      'ux_ui',
      'responsive',
      'saas_architecture',
      'auth',
      'user_management',
      'plans_access_levels',
      'admin_panel',
      'user_panel',
      'users_roles',
      'basic_permissions',
      'dashboard_basic',
    ],
    configurable: {
      payment_gateway: {
        label: 'Pasarela de pago (OBLIGATORIA)',
        type: 'single',
        options: ['stripe', 'mercado_pago', 'flow'],
      },
      subscription_model: {
        label: 'Modelo de suscripción (OBLIGATORIO)',
        type: 'single',
        options: ['mensual', 'anual', 'mixto'],
      },
      communication: {
        label: 'Canal de comunicación base (OBLIGATORIO)',
        type: 'single',
        options: ['email', 'whatsapp_api', 'twilio'],
      },
    },
  },

  enterprise: {
    required: [
      'ux_ui',
      'responsive',
      'saas_architecture',
      'dedicated_architecture',
      'high_concurrency_ready',
      'auth',
      'user_management',
      'plans_access_levels',
      'admin_panel',
      'user_panel',
      'users_roles',
      'advanced_permissions',
      'dashboard_basic',
      'executive_dashboard',
      'basic_reports',
      'advanced_reports',
      'audit_logs',
      'reinforced_security',
    ],
    configurable: {
      payment_gateway: {
        label: 'Pasarela de pago corporativa (OBLIGATORIA si hay transacciones)',
        type: 'single',
        options: ['stripe', 'mercado_pago', 'flow', 'transbank'],
      },
      erp_integration: {
        label: 'Integración ERP (OBLIGATORIA según operación)',
        type: 'single',
        options: ['sap', 'odoo', 'oracle', 'custom', 'none'],
      },
      infrastructure: {
        label: 'Infraestructura dedicada (OBLIGATORIA)',
        type: 'single',
        options: ['aws', 'gcp', 'azure', 'vercel_enterprise'],
      },
      security_level: {
        label: 'Nivel de seguridad',
        type: 'single',
        options: ['standard', 'reinforced', 'bank_grade'],
      },
    },
  },
};

export const PROJECT_KEYS = Object.keys(PROJECT_MODULES);

export const PROJECT_LABELS = {
  ecommerce: { name: 'Ecommerce', description: 'Tienda online con catálogo, carrito, checkout y panel de administración.' },
  landing: { name: 'Landing Page', description: 'Página profesional de presentación con formulario y SEO básico.' },
  corporativo: { name: 'Sitio Corporativo', description: 'Presencia digital completa con estructura corporativa y contenido.' },
  saas: { name: 'SaaS', description: 'Plataforma multiusuario con suscripciones, paneles y escalabilidad.' },
  enterprise: { name: 'Enterprise', description: 'Solución robusta con alta concurrencia, seguridad reforzada y módulos empresariales.' },
};

export function getProjectConfig(key) {
  return PROJECT_MODULES[key] || null;
}

export function getConfigurableWithServiceData(configurables) {
  return Object.entries(configurables).map(([groupKey, config]) => ({
    groupKey,
    ...config,
  }));
}
