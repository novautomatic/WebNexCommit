import { useState, useMemo } from 'react';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const projects = [
  { name: 'Landing Page', price: 250000, weeks: 1, includedKeys: ['included_lp'] },
  { name: 'Sitio Corporativo', price: 580000, weeks: 3, includedKeys: ['included_sc'] },
  { name: 'Ecommerce', price: 890000, weeks: 4, includedKeys: ['included_eco'] },
  { name: 'Plataforma Operacional', price: 1750000, weeks: 8, includedKeys: ['included_po'] },
  { name: 'SaaS', price: 3500000, weeks: 10, includedKeys: ['included_saas'] },
  { name: 'Enterprise', price: 6000000, weeks: 12, includedKeys: ['included_ent'] },
];

const SERVICE_COPY = {
  flow: { label: 'Flow', description: 'Permite cobrar online de forma práctica y automatizar confirmaciones de pago.' },
  mercado_pago: { label: 'Mercado Pago', description: 'Abre una alternativa de pago conocida para facilitar conversiones en distintos perfiles de cliente.' },
  transbank: { label: 'Transbank / Webpay', description: 'Integra una pasarela reconocida en Chile para dar más confianza al momento de pagar.' },
  stripe: { label: 'Stripe', description: 'Facilita cobros online con una pasarela ampliamente usada.' },
  fintoc: { label: 'Fintoc', description: 'Permite conectar cobros o validaciones bancarias.' },
  subscriptions: { label: 'Suscripciones', description: 'Permite cobrar de forma recurrente y ordenar ingresos mensuales.' },
  multi_payment_gateway: { label: 'Multi pasarela de pago', description: 'Da flexibilidad para ofrecer más de una opción de cobro.' },
  uber_direct: { label: 'Uber Direct', description: 'Suma reparto de última milla y mejora tiempos de entrega.' },
  correos_chile: { label: 'CorreosChile', description: 'Despachos con un proveedor logístico conocido y trazable.' },
  chilexpress: { label: 'Chilexpress', description: 'Gestiona envíos con logística habitual para ecommerce.' },
  starken: { label: 'Starken', description: 'Alternativa de despacho para ampliar cobertura.' },
  order_tracking: { label: 'Tracking de pedidos', description: 'Cliente y equipo saben en qué etapa va cada pedido.' },
  shipping_quote: { label: 'Cotizador de despacho', description: 'Valor de envío antes del pago para evitar fricción.' },
  hubspot: { label: 'HubSpot', description: 'Ordena contactos y seguimiento comercial.' },
  activecampaign: { label: 'ActiveCampaign', description: 'Automatiza seguimiento comercial y campañas.' },
  gohighlevel: { label: 'GoHighLevel', description: 'Concentra gestión comercial y automatizaciones.' },
  custom_crm_base: { label: 'CRM personalizado base', description: 'Flujo comercial adaptado al negocio.' },
  whatsapp_api: { label: 'WhatsApp API', description: 'Automatiza conversaciones a mayor escala.' },
  email_marketing: { label: 'Email marketing', description: 'Reactivar contactos y nutrir leads.' },
  resend: { label: 'Resend', description: 'Envío técnico de correos automáticos.' },
  twilio: { label: 'Twilio', description: 'Mensajería y comunicaciones automatizadas.' },
  basic_ai_chatbot: { label: 'Chatbot IA básico', description: 'Responde preguntas frecuentes y reduce carga operativa.' },
  trained_ai_chatbot: { label: 'Chatbot entrenado', description: 'Respuestas alineadas al negocio en atención automática.' },
  sales_ai_agent: { label: 'Agente IA ventas', description: 'Califica y mueve oportunidades comerciales.' },
  voice_ai: { label: 'Voice AI', description: 'Automatiza interacciones por voz.' },
  support_ai: { label: 'IA soporte', description: 'Reduce tiempos de respuesta en atención.' },
  lead_classification_ai: { label: 'IA clasificación leads', description: 'Prioriza contactos con mayor potencial.' },
  ai_reports: { label: 'IA reportes', description: 'Resume información clave del negocio.' },
  basic_hosting: { label: 'Hosting básico', description: 'Mantiene el proyecto online.' },
  enterprise_hosting: { label: 'Hosting empresarial', description: 'Base robusta para alta exigencia.' },
  basic_maintenance: { label: 'Mantención básica', description: 'Operativo y actualizado.' },
  advanced_maintenance: { label: 'Mantención avanzada', description: 'Soporte activo con ajustes.' },
  priority_support: { label: 'Soporte prioritario', description: 'Atención rápida para proyecto crítico.' },
  monitoring: { label: 'Monitoreo', description: 'Detecta caídas antes de que impacten.' },
  backups: { label: 'Backups', description: 'Respaldos para reducir riesgos.' },
  chatbot_saas: { label: 'Chatbot SaaS', description: 'Atención automatizada mensual.' },
  crm_saas: { label: 'CRM SaaS', description: 'Operación comercial en la nube.' },
  ecommerce_saas: { label: 'Ecommerce SaaS', description: 'Venta online mensual administrada.' },
  reservations_saas: { label: 'Reservas SaaS', description: 'Agenda mensual con soporte.' },
  kds_saas: { label: 'KDS SaaS', description: 'Cocina digital mensual.' },
  analytics_saas: { label: 'Analytics SaaS', description: 'Métricas mensuales del negocio.' },
};

const groups = {
  paymentItems: [
    ['Flow', 90000, false, 'flow'], ['Mercado Pago', 120000, false, 'mercado_pago'], ['Transbank / Webpay', 200000, false, 'transbank'], ['Stripe', 200000, false, 'stripe'], ['Fintoc', 250000, false, 'fintoc'], ['Suscripciones', 300000, false, 'subscriptions'], ['Multi pasarela de pago', 400000, false, 'multi_payment_gateway'],
  ],
  logisticsItems: [
    ['Uber Direct', 350000, false, 'uber_direct'], ['CorreosChile', 150000, false, 'correos_chile'], ['Chilexpress', 150000, false, 'chilexpress'], ['Starken', 150000, false, 'starken'], ['Tracking de pedidos', 150000, false, 'order_tracking'], ['Cotizador de despacho', 200000, false, 'shipping_quote'],
  ],
  crmItems: [
    ['HubSpot', 350000, false, 'hubspot'], ['ActiveCampaign', 300000, false, 'activecampaign'], ['GoHighLevel', 400000, false, 'gohighlevel'], ['CRM personalizado base', 950000, false, 'custom_crm_base'], ['WhatsApp API', 400000, false, 'whatsapp_api'], ['Email marketing', 150000, false, 'email_marketing'], ['Resend', 90000, false, 'resend'], ['Twilio', 250000, false, 'twilio'],
  ],
  aiItems: [
    ['Chatbot IA básico', 600000, false, 'basic_ai_chatbot'], ['Chatbot entrenado', 1000000, false, 'trained_ai_chatbot'], ['Agente IA ventas', 2500000, false, 'sales_ai_agent'], ['Voice AI', 4000000, false, 'voice_ai'], ['IA soporte', 1200000, false, 'support_ai'], ['IA clasificación leads', 700000, false, 'lead_classification_ai'], ['IA reportes', 900000, false, 'ai_reports'],
  ],
  infraItems: [
    ['Supabase', 120000, false, 'supabase'], ['PostgreSQL avanzado', 90000, false, 'postgresql'], ['Vercel deploy', 60000, false, 'vercel_deploy'], ['Arquitectura dedicada', 2000000, false, 'dedicated_architecture'], ['Microservicios', 3000000, false, 'microservices'], ['Alta concurrencia', 2500000, false, 'high_concurrency_ready'], ['BI avanzado', 1500000, false, 'advanced_reports'],
  ],
  monthlyItems: [
    ['Hosting básico', 14990, true, 'basic_hosting'], ['Hosting empresarial', 39990, true, 'enterprise_hosting'], ['Mantención básica', 50000, true, 'basic_maintenance'], ['Mantención avanzada', 79990, true, 'advanced_maintenance'], ['Soporte prioritario', 149990, true, 'priority_support'], ['Monitoreo', 39990, true, 'monitoring'], ['Backups', 14990, true, 'backups'], ['Chatbot SaaS', 90000, true, 'chatbot_saas'], ['CRM SaaS', 100000, true, 'crm_saas'], ['Ecommerce SaaS', 149990, true, 'ecommerce_saas'], ['Reservas SaaS', 59990, true, 'reservations_saas'], ['KDS SaaS', 119990, true, 'kds_saas'], ['Analytics SaaS', 49990, true, 'analytics_saas'],
  ],
};

function getMeta(key, fallback) {
  const m = SERVICE_COPY[key];
  return { title: m?.label || fallback, description: m?.description || 'Servicio complementario.', key: key || '' };
}

function esc(v) { return String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }


export default function Cotizador() {
  const [f, setF] = useState(() => ({
    clientName: '', clientIndustry: '', clientContact: '', quoteDate: new Date().toISOString().slice(0, 10),
    projectGoal: '', projectIndex: 0, complexity: 1, extraMeetings: 0,
    discountType: 'none', discountValue: 0, discountReason: '',
    installments: 3, interestFreeInstallments: 3, installmentSurcharge: 8,
    downPaymentEnabled: 'yes', downPaymentPercent: 50, downPaymentLabel: 'Pago inicial para iniciar el proyecto',
    customNotes: '', selected: {},
  }));

  const upd = (key) => (e) => {
    const t = e.target;
    setF(prev => ({ ...prev, [key]: t.type === 'checkbox' ? t.checked : t.value }));
  };
  const updNum = (key) => (e) => setF(prev => ({ ...prev, [key]: Number(e.target.value) || 0 }));

  const handleCheck = (key) => (e) => {
    setF(prev => ({ ...prev, selected: { ...prev.selected, [key]: e.target.checked } }));
  };

  const d = useMemo(() => calc(f), [f]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#248bde] to-[#67c8f3] flex items-center justify-center text-white font-bold">NC</div>
            <h1 className="text-2xl font-bold text-white">Cotizador NexCommit</h1>
          </div>
          <p className="text-[#9aafc3] text-sm mt-2 max-w-2xl">Herramienta para crear cotizaciones con desglose de alcance, inversión, cuotas, descuento y condiciones generales.</p>
        </div>
        <div className="px-4 py-2 rounded-full border border-white/10 text-xs text-[#67c8f3] bg-[#67c8f3]/5 shrink-0">
          Precios actualizados mercado Chile 2026
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="space-y-5">
          {/* 1. Cliente */}
          <Section title="1. Datos del cliente">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Cliente / Empresa" value={f.clientName} onChange={upd('clientName')} placeholder="Ej: Clínica Los Andes" />
              <Input label="Rubro" value={f.clientIndustry} onChange={upd('clientIndustry')} placeholder="Ej: Salud, Ecommerce" />
              <Input label="Contacto" value={f.clientContact} onChange={upd('clientContact')} placeholder="Nombre del contacto" />
              <Input label="Fecha" type="date" value={f.quoteDate} onChange={upd('quoteDate')} />
            </div>
            <div className="mt-3">
              <Label>Objetivo del proyecto</Label>
              <textarea value={f.projectGoal} onChange={upd('projectGoal')} placeholder="Ej: centralizar ventas, agendamiento, pagos online y automatización."
                className="w-full bg-[#151f33] border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#67c8f3] transition-colors resize-none min-h-[72px]" />
            </div>
          </Section>

          {/* 2. Tipo de proyecto */}
          <Section title="2. Tipo de proyecto">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Proyecto base</Label>
                <select value={f.projectIndex} onChange={updNum('projectIndex')} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#67c8f3]">
                  {projects.map((p, i) => (
                    <option key={p.name} value={i}>{p.name} — {CLP.format(p.price)}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Complejidad</Label>
                <select value={f.complexity} onChange={updNum('complexity')} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#67c8f3]">
                  <option value={1}>Básico x1</option>
                  <option value={1.5}>Intermedio x1.5</option>
                  <option value={2}>Avanzado x2</option>
                  <option value={3}>Enterprise x3</option>
                </select>
              </div>
              <div>
                <Label>Reuniones extra</Label>
                <input type="number" min={0} value={f.extraMeetings} onChange={updNum('extraMeetings')} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#67c8f3]" />
              </div>
            </div>
          </Section>

          {/* 3-6. Extras */}
          {renderExtrasGroup('Pagos', groups.paymentItems)}
          {renderExtrasGroup('Logística', groups.logisticsItems)}
          {renderExtrasGroup('CRM y comunicación', groups.crmItems)}
          {renderExtrasGroup('IA', groups.aiItems)}

          {/* 7. Descuento */}
          <Section title="Descuento comercial">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tipo</Label>
                <select value={f.discountType} onChange={upd('discountType')} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#67c8f3]">
                  <option value="none">Sin descuento</option>
                  <option value="percent">Porcentaje</option>
                  <option value="fixed">Monto fijo</option>
                </select>
              </div>
              <div>
                <Label>Valor</Label>
                <input type="number" min={0} step={1000} value={f.discountValue} onChange={updNum('discountValue')} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#67c8f3]" />
              </div>
              <div>
                <Label>Motivo visible</Label>
                <input value={f.discountReason} onChange={upd('discountReason')} placeholder="Ej: descuento lanzamiento" className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#9aafc3] outline-none focus:border-[#67c8f3]" />
              </div>
            </div>
          </Section>

          {/* 8. Cuotas */}
          <Section title="Calculador de cuotas">
            <div className="grid grid-cols-3 gap-3">
              <Input label="Cantidad de cuotas" type="number" min={1} value={f.installments} onChange={updNum('installments')} />
              <Input label="Cuotas sin interés hasta" type="number" min={1} value={f.interestFreeInstallments} onChange={updNum('interestFreeInstallments')} />
              <Input label="% recargo cuota superior" type="number" min={0} step={0.1} value={f.installmentSurcharge} onChange={updNum('installmentSurcharge')} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <Label>¿Pago PIE?</Label>
                <select value={f.downPaymentEnabled} onChange={upd('downPaymentEnabled')} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#67c8f3]">
                  <option value="yes">Sí, aplicar PIE</option>
                  <option value="no">No aplicar PIE</option>
                </select>
              </div>
              <Input label="% PIE inicial" type="number" min={0} max={100} value={f.downPaymentPercent} onChange={updNum('downPaymentPercent')} />
              <Input label="Descripción PIE" value={f.downPaymentLabel} onChange={upd('downPaymentLabel')} />
            </div>
            <div className="mt-4 p-4 rounded-xl border border-[#67c8f3]/30 bg-[#67c8f3]/5">
              <h4 className="text-[#67c8f3] text-xs uppercase tracking-widest font-semibold mb-3">Resultado de pago en cuotas</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['PIE inicial', CLP.format(d.downPaymentAmount)],
                  ['Saldo a financiar', CLP.format(d.balanceToFinance)],
                  ['Total financiado', CLP.format(d.financedTotal)],
                  ['Valor por cuota', CLP.format(d.installmentAmount)],
                  ['Recargo aplicado', `${d.appliedSurcharge}%`],
                  ['Condición', d.installmentCondition],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between px-3 py-2 rounded-lg bg-[#0f172a]/60 border border-white/5">
                    <span className="text-[#9aafc3] text-xs">{l}</span>
                    <span className="text-white text-xs font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* 9. Notas */}
          <Section title="Condiciones personalizadas">
            <textarea value={f.customNotes} onChange={upd('customNotes')} placeholder="Condiciones particulares, hitos, exclusiones o notas comerciales."
              className="w-full bg-[#151f33] border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#67c8f3] transition-colors resize-none min-h-[80px]" />
          </Section>
        </div>

        {/* Summary sidebar */}
        <div className="sticky top-6 space-y-4">
          <div className="bg-[#0d1e30] border border-white/10 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 text-base">Resumen comercial</h2>
            <div className="bg-gradient-to-br from-[#67c8f3]/20 to-[#248bde]/20 border border-[#67c8f3]/30 rounded-xl p-4 mb-4">
              <div className="text-[#9aafc3] text-xs">Total final con IVA</div>
              <div className="text-3xl font-extrabold text-white mt-1 tracking-tight">{CLP.format(d.grand)}</div>
            </div>
            {[
              ['Subtotal implementación', CLP.format(d.subtotal)],
              ['Descuento', d.discountAmount ? `-${CLP.format(d.discountAmount)}` : '$0'],
              ['Subtotal c/ descuento', CLP.format(d.discountedSubtotal)],
              ['IVA 19%', CLP.format(d.tax)],
              ['PIE inicial', `${CLP.format(d.downPaymentAmount)}${d.downPaymentPercent ? ` (${d.downPaymentPercent}%)` : ''}`],
              ['Saldo a financiar', CLP.format(d.balanceToFinance)],
              ['Mensualidad', d.monthly ? `${CLP.format(d.monthly)}/mes` : '$0'],
              ['Tiempo estimado', `${d.estimatedWeeks} sem.`],
              ['Extras', `${d.selectedCount} items`],
              ['Cuotas', `${d.installments} x ${CLP.format(d.installmentAmount)}`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-2 border-b border-white/5 text-sm">
                <span className="text-[#9aafc3]">{l}</span>
                <span className="text-white font-medium">{v}</span>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={() => generateProposal(f, d)} className="py-3 rounded-xl bg-gradient-to-r from-[#67c8f3] to-[#248bde] text-white font-bold text-sm hover:opacity-90 transition-all">
                Generar propuesta
              </button>
              <button onClick={() => window.print()} className="py-3 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/15 transition-all">
                Descargar PDF
              </button>
            </div>
          </div>

          {/* Propuesta generada */}
          <div id="proposalContainer" className="bg-white text-gray-900 rounded-2xl p-8 hidden print:block" />
        </div>
      </div>
    </div>
  );

  function renderExtrasGroup(title, items) {
    return (
      <Section title={title}>
        <div className="grid grid-cols-2 gap-2">
          {items.map(([name, price, monthly, key]) => {
            const meta = getMeta(key, name);
            const checked = !!f.selected[key];
            return (
              <label key={key} className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-[#0f172a]/60 cursor-pointer hover:border-white/10 transition-colors">
                <input type="checkbox" checked={checked} onChange={handleCheck(key)} className="mt-0.5 w-4 h-4 accent-[#67c8f3]" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <span className="text-white text-sm font-medium">{meta.title}</span>
                    <span className="text-[#9aafc3] text-xs shrink-0">{CLP.format(price)}{monthly ? '/mes' : ''}</span>
                  </div>
                  <p className="text-[#9aafc3] text-xs mt-1 leading-relaxed">{meta.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </Section>
    );
  }
}

function Section({ title, children }) {
  return (
    <div className="bg-[#0d1e30] border border-white/5 rounded-2xl p-5">
      <h2 className="text-white font-semibold text-base mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <label className="block text-[#9aafc3] text-xs mb-1.5">{children}</label>;
}

function Input({ label, type = 'text', ...props }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <input type={type} {...props} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#9aafc3] outline-none focus:border-[#67c8f3] transition-colors" />
    </div>
  );
}

function calc(f) {
  const project = projects[f.projectIndex] || projects[0];
  const selected = Object.entries(f.selected).filter(([, v]) => v).map(([key]) => key);
  const oneTime = [];
  const monthly = [];
  Object.entries(groups).forEach(([, items]) => {
    items.forEach(([, price, isMonth, key]) => {
      if (selected.includes(key)) {
        if (isMonth) monthly.push(price);
        else oneTime.push(price);
      }
    });
  });

  const rawSubtotal = project.price + oneTime.reduce((a, b) => a + b, 0) + Math.max(0, f.extraMeetings) * 70000;
  const subtotal = Math.round(rawSubtotal * f.complexity);
  let discountAmount = 0;
  if (f.discountType === 'percent') discountAmount = Math.round(subtotal * Math.min(f.discountValue, 100) / 100);
  else if (f.discountType === 'fixed') discountAmount = Math.min(Math.round(f.discountValue), subtotal);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(discountedSubtotal * 0.19);
  const grand = discountedSubtotal + tax;
  const monthlyTotal = monthly.reduce((a, b) => a + b, 0);
  const estimatedWeeks = Math.ceil(project.weeks * Math.max(1, f.complexity * 0.75) + Math.floor(oneTime.length / 4));
  const downPaymentEnabled = f.downPaymentEnabled === 'yes';
  const downPaymentPercent = downPaymentEnabled ? Math.min(100, Math.max(0, f.downPaymentPercent)) : 0;
  const downPaymentAmount = Math.round(grand * downPaymentPercent / 100);
  const balanceToFinance = Math.max(0, grand - downPaymentAmount);
  const appliedSurcharge = f.installments <= f.interestFreeInstallments ? 0 : f.installmentSurcharge;
  const financedTotal = Math.round(balanceToFinance * (1 + appliedSurcharge / 100));
  const installmentAmount = Math.round(financedTotal / f.installments);
  const installmentCondition = appliedSurcharge === 0
    ? `${f.installments} cuota${f.installments === 1 ? '' : 's'} sin interés`
    : `${f.installments} cuotas con ${appliedSurcharge}% recargo`;
  return {
    subtotal, discountAmount, discountedSubtotal, tax, grand, monthly: monthlyTotal,
    estimatedWeeks, installments: f.installments, downPaymentAmount, downPaymentPercent,
    balanceToFinance, appliedSurcharge, financedTotal, installmentAmount, installmentCondition, selectedCount: selected.length,
  };
}

function generateProposal(f, d) {
  const project = projects[f.projectIndex] || projects[0];
  const selected = Object.entries(f.selected).filter(([, v]) => v).map(([key]) => key);
  const oneTimeRows = [];
  const monthlyRows = [];
  Object.entries(groups).forEach(([, items]) => {
    items.forEach(([name, price, isMonth, key]) => {
      if (selected.includes(key)) {
        if (isMonth) monthlyRows.push(`<tr><td>${esc(name)}</td><td>${CLP.format(price)}/mes</td></tr>`);
        else oneTimeRows.push(`<tr><td>${esc(name)}</td><td>${CLP.format(price)}</td></tr>`);
      }
    });
  });

  const discountLabel = d.discountAmount
    ? `${CLP.format(d.discountAmount)}${f.discountType === 'percent' ? ` (${f.discountValue}%)` : ''}${f.discountReason ? ' — ' + esc(f.discountReason) : ''}`
    : 'No aplica';

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:32px;color:#111827;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e5e7eb;padding-bottom:20px;margin-bottom:24px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#248bde,#67c8f3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">NC</div>
            <span style="font-weight:bold;font-size:20px;">NexCommit</span>
          </div>
          <h1 style="margin:0;font-size:22px;">Propuesta Comercial</h1>
          <p style="color:#4b5563;margin:4px 0 0;"><strong>Proyecto:</strong> ${esc(project.name)}</p>
        </div>
        <div style="text-align:right;font-size:13px;color:#4b5563;">
          <p><strong>Cliente:</strong> ${esc(f.clientName || '—')}</p>
          <p><strong>Rubro:</strong> ${esc(f.clientIndustry || '—')}</p>
          <p><strong>Contacto:</strong> ${esc(f.clientContact || '—')}</p>
          <p><strong>Fecha:</strong> ${esc(f.quoteDate)}</p>
        </div>
      </div>

      <h2 style="font-size:16px;margin:24px 0 8px;">1. Contexto y objetivo</h2>
      <div style="background:#f8fafc;border:1px solid #e5e7eb;padding:16px;border-radius:12px;margin-bottom:16px;">
        <p style="margin:0;color:#374151;">${esc(f.projectGoal || 'Desarrollo de solución tecnológica.')}</p>
      </div>

      <h2 style="font-size:16px;margin:24px 0 8px;">2. Detalle de inversión</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead><tr style="background:#f3f4f6;"><th style="border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px;">Concepto</th><th style="border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px;">Valor</th></tr></thead>
        <tbody>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Proyecto base: ${esc(project.name)}</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(project.price)}</td></tr>
          ${oneTimeRows.join('')}
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Reuniones extra</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(Math.max(0, f.extraMeetings) * 70000)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Complejidad</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">x${f.complexity}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;"><strong>Subtotal implementación</strong></td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;"><strong>${CLP.format(d.subtotal)}</strong></td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Descuento</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${discountLabel}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Subtotal c/ descuento</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(d.discountedSubtotal)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">IVA 19%</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(d.tax)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;background:#eff6ff;"><strong>Total final con IVA</strong></td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;background:#eff6ff;"><strong>${CLP.format(d.grand)}</strong></td></tr>
        </tbody>
      </table>

      <h2 style="font-size:16px;margin:24px 0 8px;">3. Pago en cuotas</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tbody>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">PIE inicial</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${d.downPaymentAmount ? `${CLP.format(d.downPaymentAmount)} (${d.downPaymentPercent}%)` : 'No aplica'}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Detalle PIE</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${esc(f.downPaymentLabel)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Saldo a financiar</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(d.balanceToFinance)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Cuotas</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${d.installments} x ${CLP.format(d.installmentAmount)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Total financiado</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(d.financedTotal)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Condición</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${esc(d.installmentCondition)}</td></tr>
        </tbody>
      </table>

      ${monthlyRows.length ? `
      <h2 style="font-size:16px;margin:24px 0 8px;">4. Servicios mensuales</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead><tr style="background:#f3f4f6;"><th style="border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px;">Servicio</th><th style="border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px;">Valor</th></tr></thead>
        <tbody>${monthlyRows.join('')}</tbody>
      </table>` : ''}

      <h2 style="font-size:16px;margin:24px 0 8px;">5. Plazos</h2>
      <p style="color:#374151;font-size:13px;line-height:1.6;">Plazo estimado: <strong>${d.estimatedWeeks} semana${d.estimatedWeeks === 1 ? '' : 's'}</strong>. El plazo comienza desde la aprobación y pago inicial. Se considera una reunión semanal de avance.</p>

      <h2 style="font-size:16px;margin:24px 0 8px;">6. Condiciones generales</h2>
      <ul style="color:#374151;font-size:13px;line-height:1.6;">
        <li>Precios en pesos chilenos con IVA 19% incluido.</li>
        <li>Si aplica PIE, corresponde al pago inicial para comenzar el proyecto.</li>
        <li>Compra de dominio web es responsabilidad del cliente.</li>
        <li>Integraciones dependen de cada proveedor externo.</li>
        <li>Cambios de alcance se cotizan por separado.</li>
      </ul>

      ${f.customNotes ? `<h2 style="font-size:16px;margin:24px 0 8px;">7. Notas</h2><p style="color:#374151;font-size:13px;">${esc(f.customNotes)}</p>` : ''}
    </div>
  `;

  const el = document.getElementById('proposalContainer');
  if (el) {
    el.innerHTML = html;
    el.classList.remove('hidden');
    el.scrollIntoView({ behavior: 'smooth' });
  }
}
