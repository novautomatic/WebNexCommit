export const PROJECT_PRICING = {
  landing: { price: 250000, weeks: 1 },
  corporativo: { price: 580000, weeks: 3 },
  ecommerce: { price: 890000, weeks: 4 },
  saas: { price: 3500000, weeks: 10 },
  enterprise: { price: 6000000, weeks: 12 },
};

export const SERVICE_PRICES = {
  flow: { price: 90000, monthly: false },
  mercado_pago: { price: 120000, monthly: false },
  transbank: { price: 200000, monthly: false },
  stripe: { price: 200000, monthly: false },
  fintoc: { price: 250000, monthly: false },
  one_payment_gateway_base: { price: 0, monthly: false },
  subscriptions: { price: 300000, monthly: false },
  multi_payment_gateway: { price: 400000, monthly: false },

  shipping_quote: { price: 200000, monthly: false },
  order_tracking: { price: 150000, monthly: false },
  uber_direct: { price: 350000, monthly: false },
  correos_chile: { price: 150000, monthly: false },
  chilexpress: { price: 150000, monthly: false },
  starken: { price: 150000, monthly: false },
  shipit: { price: 200000, monthly: false },

  hubspot: { price: 350000, monthly: false },
  activecampaign: { price: 300000, monthly: false },
  gohighlevel: { price: 400000, monthly: false },
  custom_crm_base: { price: 950000, monthly: false },
  whatsapp_api: { price: 400000, monthly: false },
  email_marketing: { price: 150000, monthly: false },
  resend: { price: 90000, monthly: false },
  twilio: { price: 250000, monthly: false },
  erp_integration: { price: 2500000, monthly: false },
  erp_ready: { price: 500000, monthly: false },
  webhooks: { price: 200000, monthly: false },
  etl_sync: { price: 600000, monthly: false },
  controlled_scraping: { price: 550000, monthly: false },

  basic_ai_chatbot: { price: 600000, monthly: false },
  trained_ai_chatbot: { price: 1000000, monthly: false },
  sales_ai_agent: { price: 2500000, monthly: false },
  voice_ai: { price: 4000000, monthly: false },
  support_ai: { price: 1200000, monthly: false },
  lead_classification_ai: { price: 700000, monthly: false },
  ai_reports: { price: 900000, monthly: false },
  automatic_quote: { price: 420000, monthly: false },
  automatic_scheduling: { price: 280000, monthly: false },

  supabase: { price: 120000, monthly: false },
  postgresql: { price: 90000, monthly: false },
  vercel_deploy: { price: 60000, monthly: false },
  dedicated_architecture: { price: 2000000, monthly: false },
  high_concurrency_ready: { price: 2500000, monthly: false },
  enterprise_modules: { price: 3000000, monthly: false },
  aws: { price: 500000, monthly: true },
  gcp: { price: 500000, monthly: true },
  azure: { price: 600000, monthly: true },
  vercel_enterprise: { price: 300000, monthly: true },

  users_roles: { price: 200000, monthly: false },
  advanced_permissions: { price: 250000, monthly: false },
  stock_management: { price: 200000, monthly: false },
  order_management: { price: 200000, monthly: false },
  basic_reports: { price: 300000, monthly: false },
  advanced_reports: { price: 1500000, monthly: false },
  commercial_dashboard: { price: 320000, monthly: false },
  executive_dashboard: { price: 500000, monthly: false },
  multi_branch: { price: 650000, monthly: false },
  billing: { price: 420000, monthly: false },
  reservations: { price: 320000, monthly: false },
  kds: { price: 900000, monthly: false },
  audit_logs: { price: 350000, monthly: false },
  basic_export: { price: 150000, monthly: false },
  content_management: { price: 200000, monthly: false },
  customer_management: { price: 250000, monthly: false },
  basic_activity_logs: { price: 150000, monthly: false },
  initial_bi: { price: 800000, monthly: false },
  automatic_reports: { price: 320000, monthly: false },
  main_dashboard: { price: 300000, monthly: false },

  crm_pipeline: { price: 420000, monthly: false },
  internal_alerts: { price: 150000, monthly: false },
  cart_recovery: { price: 280000, monthly: false },
  lead_scoring: { price: 350000, monthly: false },
  whatsapp_followup: { price: 220000, monthly: false },
  email_sequence: { price: 220000, monthly: false },

  basic_hosting: { price: 14990, monthly: true },
  enterprise_hosting: { price: 39990, monthly: true },
  basic_maintenance: { price: 50000, monthly: true },
  advanced_maintenance: { price: 79990, monthly: true },
  priority_support: { price: 149990, monthly: true },
  monitoring: { price: 39990, monthly: true },
  backups: { price: 14990, monthly: true },
  chatbot_saas: { price: 90000, monthly: true },
  crm_saas: { price: 100000, monthly: true },
  ecommerce_saas: { price: 149990, monthly: true },
  reservations_saas: { price: 59990, monthly: true },
  kds_saas: { price: 119990, monthly: true },
  analytics_saas: { price: 49990, monthly: true },

  auth: { price: 0, monthly: false },
  user_management: { price: 0, monthly: false },
  plans_access_levels: { price: 0, monthly: false },
  admin_panel: { price: 0, monthly: false },
  user_panel: { price: 0, monthly: false },
  roles_permissions: { price: 0, monthly: false },
  manual_subscription_access: { price: 0, monthly: false },
  basic_email_notifications: { price: 0, monthly: false },
  reinforced_security: { price: 0, monthly: false },
  bank_grade: { price: 500000, monthly: false },
};

export function getServicePrice(key) {
  return SERVICE_PRICES[key] || null;
}

export function isMonthly(key) {
  const p = getServicePrice(key);
  return p ? p.monthly : false;
}

export function getPrice(key) {
  const p = getServicePrice(key);
  return p ? p.price : 0;
}
