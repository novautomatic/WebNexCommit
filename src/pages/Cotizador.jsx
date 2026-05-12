import { useState, useMemo } from 'react';
import { PROJECT_MODULES, PROJECT_KEYS, PROJECT_LABELS, getProjectConfig } from '../data/PROJECT_MODULES';
import { PROJECT_PRICING, getServicePrice, isMonthly } from '../data/PROJECT_PRICING';
import { getServiceMeta, getAllServiceKeys } from '../data/SERVICE_CATEGORIES';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const META_OPTIONS = new Set(['manual', 'mensual', 'anual', 'mixto', 'email', 'sap', 'odoo', 'oracle', 'custom', 'none', 'standard', 'bank_grade']);
const CONFIG_EXTRA_PRICES = { bank_grade: 500000 };

function esc(v) {
  return String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function getConfigurableServicePrice(key) {
  if (CONFIG_EXTRA_PRICES[key]) return CONFIG_EXTRA_PRICES[key];
  const p = getServicePrice(key);
  return p ? p.price : 0;
}

function getFirstConfigurableOptions(configurables) {
  const result = {};
  for (const [groupKey, config] of Object.entries(configurables)) {
    if (config.options && config.options.length > 0) {
      result[groupKey] = config.options[0];
    }
  }
  return result;
}

function getCoveredKeys(projectKey) {
  const config = getProjectConfig(projectKey);
  if (!config) return new Set();
  const covered = new Set(config.required);
  for (const cfg of Object.values(config.configurable)) {
    for (const opt of cfg.options) {
      if (!META_OPTIONS.has(opt)) covered.add(opt);
    }
  }
  return covered;
}

function getAllOptionKeys(configurable) {
  return Object.values(configurable).flatMap(cfg => cfg.options.filter(o => !META_OPTIONS.has(o)));
}

export default function Cotizador() {
  const [f, setF] = useState(() => {
    const firstProject = PROJECT_KEYS[0];
    const config = getProjectConfig(firstProject);
    return {
      clientName: '', clientIndustry: '', clientContact: '', quoteDate: new Date().toISOString().slice(0, 10),
      projectGoal: '', projectKey: firstProject, complexity: 1, extraMeetings: 0,
      discountType: 'none', discountValue: 0, discountReason: '',
      installments: 3, interestFreeInstallments: 3, installmentSurcharge: 8,
      downPaymentEnabled: 'yes', downPaymentPercent: 50, downPaymentLabel: 'Pago inicial para iniciar el proyecto',
      customNotes: '', selected: {},
      configurables: getFirstConfigurableOptions(config ? config.configurable : {}),
    };
  });

  const upd = (key) => (e) => {
    const t = e.target;
    setF(prev => ({ ...prev, [key]: t.type === 'checkbox' ? t.checked : t.value }));
  };
  const updNum = (key) => (e) => setF(prev => ({ ...prev, [key]: Number(e.target.value) || 0 }));

  const handleCheck = (key) => (e) => {
    setF(prev => ({ ...prev, selected: { ...prev.selected, [key]: e.target.checked } }));
  };

  const handleProjectChange = (e) => {
    const newKey = e.target.value;
    const config = getProjectConfig(newKey);
    setF(prev => ({
      ...prev,
      projectKey: newKey,
      configurables: getFirstConfigurableOptions(config ? config.configurable : {}),
      selected: {},
    }));
  };

  const handleConfigurableChange = (groupKey) => (e) => {
    setF(prev => ({
      ...prev,
      configurables: { ...prev.configurables, [groupKey]: e.target.value },
    }));
  };

  const d = useMemo(() => calc(f), [f]);

  const projectConfig = getProjectConfig(f.projectKey);
  const projectInfo = PROJECT_LABELS[f.projectKey] || { name: f.projectKey, description: '' };
  const projectPricing = PROJECT_PRICING[f.projectKey] || { price: 0, weeks: 0 };
  const coveredKeys = getCoveredKeys(f.projectKey);
  const allServiceKeys = getAllServiceKeys();

  const configurableKeysSet = new Set(getAllOptionKeys(projectConfig ? projectConfig.configurable : {}));

  const validationErrors = [];
  if (projectConfig) {
    for (const [groupKey, cfg] of Object.entries(projectConfig.configurable)) {
      if (!f.configurables[groupKey]) {
        if (cfg.label.includes('OBLIGATORIA') || cfg.label.includes('obligatoria')) {
          validationErrors.push(cfg.label);
        }
      }
    }
  }
  const hasValidationErrors = validationErrors.length > 0;

  const handleGenerateProposal = () => {
    const html = generateProposal(f, d, projectConfig, projectInfo, projectPricing);
    setProposalHtml(html);
    setTimeout(() => {
      const el = document.getElementById('proposalContainer');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const [proposalHtml, setProposalHtml] = useState('');

  return (
    <div className="space-y-6">
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
                <select value={f.projectKey} onChange={handleProjectChange} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#67c8f3]">
                  {PROJECT_KEYS.map(key => (
                    <option key={key} value={key}>{PROJECT_LABELS[key]?.name || key} — {CLP.format(PROJECT_PRICING[key]?.price || 0)}</option>
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

          {/* BLOQUE 1: Módulos Base (Requeridos) */}
          {projectConfig && projectConfig.required.length > 0 && (
            <Section title="3. Módulos incluidos (base del proyecto)">
              <div className="grid grid-cols-2 gap-2">
                {projectConfig.required.map(key => {
                  const meta = getServiceMeta(key);
                  return (
                    <div key={key} className="flex flex-col px-3 py-2 rounded-lg bg-[#0f172a]/60 border border-white/5">
                      <span className="text-white text-xs font-medium">✓ {meta ? meta.label : key}</span>
                      {meta && <span className="text-[#9aafc3] text-[11px] mt-0.5 leading-relaxed">{meta.description}</span>}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* BLOQUE 2: Configurables Obligatorios */}
          {projectConfig && Object.keys(projectConfig.configurable).length > 0 && (
            <Section title="4. Decisiones obligatorias del proyecto">
              {Object.entries(projectConfig.configurable).map(([groupKey, cfg]) => (
                <div key={groupKey} className="mb-4 last:mb-0">
                  <h3 className="text-[#67c8f3] text-xs uppercase tracking-widest font-semibold mb-3">{cfg.label}</h3>
                  <div className="flex flex-wrap gap-3">
                    {cfg.options.map(opt => {
                      const meta = getServiceMeta(opt);
                      const label = meta ? meta.label : opt.charAt(0).toUpperCase() + opt.slice(1);
                      const selected = f.configurables[groupKey] === opt;
                      return (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                            selected
                              ? 'border-[#67c8f3] bg-[#67c8f3]/10 text-white'
                              : 'border-white/10 bg-[#0f172a]/60 text-[#9aafc3] hover:border-white/20'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`config_${groupKey}`}
                            value={opt}
                            checked={selected}
                            onChange={handleConfigurableChange(groupKey)}
                            className="w-4 h-4 accent-[#67c8f3]"
                          />
                          <span className="text-sm font-medium">{label}</span>
                          {meta && (
                            <span className="text-xs opacity-70 ml-1 hidden sm:inline">{meta.description}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* BLOQUE 3: Extras Opcionales */}
          <Section title="5. Módulos opcionales adicionales">
            {allServiceKeys
              .filter(key => !coveredKeys.has(key))
              .filter(key => !configurableKeysSet.has(key))
              .length === 0 ? (
              <p className="text-[#9aafc3] text-sm">Todos los módulos disponibles están incluidos en este proyecto.</p>
            ) : (
              <div>
                {(() => {
                  const extraKeys = allServiceKeys.filter(key => !coveredKeys.has(key) && !configurableKeysSet.has(key));
                  const monthlyKeys = extraKeys.filter(k => isMonthly(k));
                  const oneTimeKeys = extraKeys.filter(k => !isMonthly(k));
                  return (
                    <>
                      {oneTimeKeys.length > 0 && (
                        <div className="mb-4">
                          <h3 className="text-[#67c8f3] text-xs uppercase tracking-widest font-semibold mb-2">Implementación única</h3>
                          <div className="grid grid-cols-2 gap-2">
                            {oneTimeKeys.map(key => renderExtraCheckbox(key))}
                          </div>
                        </div>
                      )}
                      {monthlyKeys.length > 0 && (
                        <div>
                          <h3 className="text-[#67c8f3] text-xs uppercase tracking-widest font-semibold mb-2">Servicios mensuales</h3>
                          <div className="grid grid-cols-2 gap-2">
                            {monthlyKeys.map(key => renderExtraCheckbox(key))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </Section>

          {/* 6. Descuento */}
          <Section title="6. Descuento comercial">
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

          {/* 7. Cuotas */}
          <Section title="7. Calculador de cuotas">
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

          {/* 8. Notas */}
          <Section title="8. Condiciones personalizadas">
            <textarea value={f.customNotes} onChange={upd('customNotes')} placeholder="Condiciones particulares, hitos, exclusiones o notas comerciales."
              className="w-full bg-[#151f33] border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#67c8f3] transition-colors resize-none min-h-[80px]" />
          </Section>
        </div>

        {/* Summary sidebar */}
        <div className="xl:sticky xl:top-6 space-y-4">
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
              <button
                onClick={handleGenerateProposal}
                disabled={hasValidationErrors}
                className="py-3 rounded-xl bg-gradient-to-r from-[#67c8f3] to-[#248bde] text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={hasValidationErrors ? `Completa: ${validationErrors.join(', ')}` : ''}
              >
                Generar propuesta
              </button>
              <button onClick={() => window.print()} className="py-3 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/15 transition-all">
                Descargar PDF
              </button>
            </div>
            {hasValidationErrors && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <p className="text-red-400 text-xs font-medium">Completa las siguientes opciones obligatorias:</p>
                <ul className="mt-1 space-y-1">
                  {validationErrors.map((err, i) => (
                    <li key={i} className="text-red-400/80 text-xs">• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {proposalHtml && (
        <div
          id="proposalContainer"
          className="bg-white text-gray-900 rounded-2xl p-8 print:block"
          dangerouslySetInnerHTML={{ __html: proposalHtml }}
        />
      )}
    </div>
  );

  function renderExtraCheckbox(key) {
    const meta = getServiceMeta(key);
    const priceInfo = getServicePrice(key);
    const label = meta ? meta.label : key;
    const description = meta ? meta.description : '';
    const price = priceInfo ? priceInfo.price : 0;
    const monthly = priceInfo ? priceInfo.monthly : false;
    const checked = !!f.selected[key];

    return (
      <label key={key} className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-[#0f172a]/60 cursor-pointer hover:border-white/10 transition-colors">
        <input type="checkbox" checked={checked} onChange={handleCheck(key)} className="mt-0.5 w-4 h-4 accent-[#67c8f3]" />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between gap-2">
            <span className="text-white text-sm font-medium">{label}</span>
            {price > 0 && (
              <span className="text-[#9aafc3] text-xs shrink-0">{CLP.format(price)}{monthly ? '/mes' : ''}</span>
            )}
          </div>
          {description && <p className="text-[#9aafc3] text-xs mt-1 leading-relaxed">{description}</p>}
        </div>
      </label>
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
  const pricing = PROJECT_PRICING[f.projectKey] || { price: 0, weeks: 0 };
  const selected = Object.entries(f.selected).filter(([, v]) => v).map(([key]) => key);

  let oneTimeSum = 0;
  let monthlySum = 0;
  for (const key of selected) {
    const p = getServicePrice(key);
    if (p) {
      if (p.monthly) monthlySum += p.price;
      else oneTimeSum += p.price;
    }
  }

  let configurableExtraSum = 0;
  const config = getProjectConfig(f.projectKey);
  if (config) {
    for (const [groupKey, cfg] of Object.entries(config.configurable)) {
      const selectedOpt = f.configurables[groupKey];
      if (selectedOpt && cfg.options.indexOf(selectedOpt) > 0) {
        configurableExtraSum += getConfigurableServicePrice(selectedOpt);
      }
    }
  }

  const rawSubtotal = pricing.price + oneTimeSum + configurableExtraSum + Math.max(0, f.extraMeetings) * 70000;
  const subtotal = Math.round(rawSubtotal * f.complexity);
  let discountAmount = 0;
  if (f.discountType === 'percent') discountAmount = Math.round(subtotal * Math.min(f.discountValue, 100) / 100);
  else if (f.discountType === 'fixed') discountAmount = Math.min(Math.round(f.discountValue), subtotal);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(discountedSubtotal * 0.19);
  const grand = discountedSubtotal + tax;
  const monthlyTotal = monthlySum;
  const estimatedWeeks = Math.ceil(pricing.weeks * Math.max(1, f.complexity * 0.75) + Math.floor(selected.length / 4));
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

function generateProposal(f, d, projectConfig, projectInfo, projectPricing) {
  const selected = Object.entries(f.selected).filter(([, v]) => v).map(([key]) => key);
  const oneTimeRows = [];
  const monthlyRows = [];

  for (const key of selected) {
    const p = getServicePrice(key);
    if (p) {
      const meta = getServiceMeta(key);
      const label = meta ? meta.label : key;
      if (p.monthly) monthlyRows.push(`<tr><td>${esc(label)}</td><td>${CLP.format(p.price)}/mes</td></tr>`);
      else oneTimeRows.push(`<tr><td>${esc(label)}</td><td>${CLP.format(p.price)}</td></tr>`);
    }
  }

  const configurableRows = [];
  if (projectConfig) {
    for (const [groupKey, cfg] of Object.entries(projectConfig.configurable)) {
      const selectedOpt = f.configurables[groupKey];
      if (selectedOpt) {
        const meta = getServiceMeta(selectedOpt);
        const label = meta ? meta.label : selectedOpt;
        const isExtra = cfg.options.indexOf(selectedOpt) > 0;
        if (isExtra) {
          const price = getConfigurableServicePrice(selectedOpt);
          if (price > 0) configurableRows.push(`<tr><td>${esc(cfg.label)} — ${esc(label)}</td><td>${CLP.format(price)}</td></tr>`);
        }
      }
    }
  }

  const discountLabel = d.discountAmount
    ? `${CLP.format(d.discountAmount)}${f.discountType === 'percent' ? ` (${f.discountValue}%)` : ''}${f.discountReason ? ' — ' + esc(f.discountReason) : ''}`
    : 'No aplica';

  const includeItems = projectConfig ? projectConfig.required.map(key => {
    const meta = getServiceMeta(key);
    return { title: meta ? meta.label : key, description: meta ? meta.description : '' };
  }) : [];

  const includeList = includeItems.map(item => `
    <li>
      <strong>${esc(item.title)}</strong>
      ${item.description ? `<span>${esc(item.description)}</span>` : ''}
    </li>
  `).join('');

  const extrasSelected = selected.map(key => {
    const meta = getServiceMeta(key);
    const p = getServicePrice(key);
    return {
      title: meta ? meta.label : key,
      description: meta ? meta.description : '',
      monthly: p ? p.monthly : false,
    };
  });

  const extrasList = extrasSelected.length
    ? extrasSelected.map(item => `
        <li>
          <strong>${esc(item.title)}${item.monthly ? ' — servicio mensual' : ''}</strong>
          <span>${esc(item.description || 'Implementación complementaria solicitada.')}</span>
        </li>
      `).join('')
    : '<li><strong>No se agregaron extras adicionales.</strong><span>El proyecto se cotiza con el paquete base seleccionado.</span></li>';

  const clientName = f.clientName || 'Cliente';
  const clientIndustry = f.clientIndustry || 'No especificado';
  const clientContact = f.clientContact || 'No especificado';
  const quoteDate = f.quoteDate || '';
  const projectGoal = f.projectGoal || 'Desarrollo de solución tecnológica para mejorar presencia digital, operación, ventas y automatización del negocio.';
  const customNotes = f.customNotes || 'No se agregaron condiciones adicionales.';

  const configurableSections = projectConfig ? Object.entries(projectConfig.configurable).map(([groupKey, cfg]) => {
    const selectedOpt = f.configurables[groupKey];
    if (!selectedOpt) return '';
    const meta = getServiceMeta(selectedOpt);
    const label = meta ? meta.label : selectedOpt;
    return `<li><strong>${esc(cfg.label)}:</strong> ${esc(label)}</li>`;
  }).filter(Boolean).join('') : '';

  return `
    <div style="font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:32px;color:#111827;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e5e7eb;padding-bottom:20px;margin-bottom:24px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#248bde,#67c8f3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">NC</div>
            <span style="font-weight:bold;font-size:20px;">NexCommit</span>
          </div>
          <h1 style="margin:0;font-size:22px;">Propuesta Comercial</h1>
          <p style="color:#4b5563;margin:4px 0 0;"><strong>Proyecto:</strong> ${esc(projectInfo.name)}</p>
        </div>
        <div style="text-align:right;font-size:13px;color:#4b5563;">
          <p><strong>Cliente:</strong> ${esc(clientName)}</p>
          <p><strong>Rubro:</strong> ${esc(clientIndustry)}</p>
          <p><strong>Contacto:</strong> ${esc(clientContact)}</p>
          <p><strong>Fecha:</strong> ${esc(quoteDate)}</p>
        </div>
      </div>

      <h2 style="font-size:16px;margin:24px 0 8px;">1. Contexto y objetivo</h2>
      <div style="background:#f8fafc;border:1px solid #e5e7eb;padding:16px;border-radius:12px;margin-bottom:16px;">
        <p style="margin:0;color:#374151;">${esc(projectGoal)}</p>
      </div>

      <h2 style="font-size:16px;margin:24px 0 8px;">2. Alcance general del proyecto</h2>
      <p style="color:#374151;font-size:13px;line-height:1.6;">Se propone desarrollar una soluci&oacute;n tipo <strong>${esc(projectInfo.name)}</strong>, orientada a entregar una presencia digital profesional, mejorar la gesti&oacute;n comercial y facilitar la operaci&oacute;n diaria del negocio.</p>
      <p style="color:#374151;font-size:13px;line-height:1.6;">${esc(projectInfo.description)}</p>

      <h2 style="font-size:16px;margin:24px 0 8px;">3. M&oacute;dulos incluidos en el proyecto</h2>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:16px 18px;margin:14px 0;">
        <ul style="margin:0;padding-left:0;list-style:none;">${includeList}</ul>
      </div>

      ${configurableSections ? `
      <h2 style="font-size:16px;margin:24px 0 8px;">4. Decisiones de configuraci&oacute;n del proyecto</h2>
      <ul style="color:#374151;font-size:13px;line-height:1.6;">${configurableSections}</ul>
      ` : ''}

      <h2 style="font-size:16px;margin:24px 0 8px;">${configurableSections ? '5' : '4'}. Extras, integraciones o m&oacute;dulos adicionales seleccionados</h2>
      <p style="color:#374151;font-size:13px;line-height:1.6;">Adem&aacute;s del alcance base, se consideran los siguientes elementos adicionales solicitados para complementar la soluci&oacute;n:</p>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:16px 18px;margin:14px 0;">
        <ul style="margin:0;padding-left:0;list-style:none;">${extrasList}</ul>
      </div>

      <h2 style="font-size:16px;margin:24px 0 8px;">${configurableSections ? '6' : '5'}. Detalle comercial de implementaci&oacute;n</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead><tr style="background:#f3f4f6;"><th style="border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px;">Concepto</th><th style="border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px;">Valor</th></tr></thead>
        <tbody>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Proyecto base: ${esc(projectInfo.name)}</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(projectPricing.price)}</td></tr>
          ${configurableRows.join('')}
          ${oneTimeRows.join('')}
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Reuniones extra</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(Math.max(0, f.extraMeetings) * 70000)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Complejidad</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">x${f.complexity}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;"><strong>Subtotal implementaci&oacute;n</strong></td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;"><strong>${CLP.format(d.subtotal)}</strong></td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Descuento</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${discountLabel}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Subtotal c/ descuento</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(d.discountedSubtotal)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">IVA 19%</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(d.tax)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;background:#eff6ff;"><strong>Total final con IVA</strong></td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;background:#eff6ff;"><strong>${CLP.format(d.grand)}</strong></td></tr>
        </tbody>
      </table>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:18px;border-radius:14px;font-size:20px;font-weight:800;margin-top:20px;">Total final con IVA: ${CLP.format(d.grand)}</div>

      <h2 style="font-size:16px;margin:24px 0 8px;">${configurableSections ? '7' : '6'}. Alternativa de pago en cuotas</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tbody>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">PIE inicial</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${d.downPaymentAmount ? `${CLP.format(d.downPaymentAmount)} (${d.downPaymentPercent}%)` : 'No aplica'}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Detalle PIE</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${esc(f.downPaymentLabel)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Saldo a financiar</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(d.balanceToFinance)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Cuotas</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${d.installments} x ${CLP.format(d.installmentAmount)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Total financiado</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(d.financedTotal)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Condici&oacute;n</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${esc(d.installmentCondition)}</td></tr>
        </tbody>
      </table>

      ${monthlyRows.length ? `
      <h2 style="font-size:16px;margin:24px 0 8px;">${configurableSections ? '8' : '7'}. Servicios mensuales</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead><tr style="background:#f3f4f6;"><th style="border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px;">Servicio</th><th style="border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px;">Valor</th></tr></thead>
        <tbody>${monthlyRows.join('')}</tbody>
      </table>` : ''}

      <h2 style="font-size:16px;margin:24px 0 8px;">${configurableSections ? '9' : '8'}. Plazos y forma de trabajo</h2>
      <ul style="color:#374151;font-size:13px;line-height:1.6;">
        <li>El plazo estimado de desarrollo es de <strong>${d.estimatedWeeks} semana${d.estimatedWeeks === 1 ? '' : 's'}</strong>.</li>
        <li>El plazo comienza desde la aprobaci&oacute;n de la propuesta, pago inicial y entrega de la informaci&oacute;n necesaria por parte del cliente.</li>
        <li>Se considera una reuni&oacute;n semanal de avance durante el desarrollo.</li>
        <li>Los ajustes fuera del alcance original se revisan y cotizan por separado antes de ejecutarse.</li>
      </ul>

      <h2 style="font-size:16px;margin:24px 0 8px;">${configurableSections ? '10' : '9'}. Qu&eacute; no incluye, salvo acuerdo previo</h2>
      <ul style="color:#374151;font-size:13px;line-height:1.6;">
        <li>Compra de dominio web.</li>
        <li>Costos de hosting, servidores, correos corporativos o servicios externos no seleccionados.</li>
        <li>Comisiones de pasarelas de pago, bancos o plataformas externas.</li>
        <li>Consumos variables de APIs, WhatsApp, inteligencia artificial, email marketing u otros proveedores.</li>
        <li>Redacci&oacute;n completa de contenidos, fotograf&iacute;a profesional, producci&oacute;n audiovisual o carga masiva de informaci&oacute;n no indicada en el alcance.</li>
        <li>Campa&ntilde;as publicitarias, inversi&oacute;n en anuncios o gesti&oacute;n mensual de marketing, salvo que se indique expresamente.</li>
      </ul>

      <h2 style="font-size:16px;margin:24px 0 8px;">${configurableSections ? '11' : '10'}. Condiciones generales</h2>
      <ul style="color:#374151;font-size:13px;line-height:1.6;">
        <li>Precios en pesos chilenos con IVA 19% incluido.</li>
        <li>Si aplica PIE, corresponde al pago inicial para comenzar el proyecto.</li>
        <li>Compra de dominio web es responsabilidad del cliente.</li>
        <li>Integraciones dependen de cada proveedor externo.</li>
        <li>Cambios de alcance se cotizan por separado.</li>
      </ul>

      ${customNotes !== 'No se agregaron condiciones adicionales.' ? `<h2 style="font-size:16px;margin:24px 0 8px;">${configurableSections ? '12' : '11'}. Notas personalizadas</h2><p style="color:#374151;font-size:13px;">${esc(customNotes)}</p>` : ''}

      <h2 style="font-size:16px;margin:24px 0 8px;">${configurableSections ? '13' : '12'}. Cierre</h2>
      <p style="color:#374151;font-size:13px;line-height:1.6;">NexCommit desarrolla soluciones digitales para ordenar procesos, mejorar la experiencia del cliente y facilitar el crecimiento comercial de cada negocio.</p>
    </div>
  `;
}
