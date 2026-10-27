// Panel → Avisos: un lugar para todos los avisos de la empresa por WhatsApp y/o
// correo. Cada aviso dice CUÁNDO sale (saldo de OpenAI bajo, una fecha
// programada o a mano), POR DÓNDE (WhatsApp y correo, cada uno con su
// interruptor) y QUÉ dice (texto propio, que puede partir de una plantilla).
// Los evalúa y envía el back de Agente-Next cada 5 minutos (cron
// avisos-sistema-revisar). Solo dueños.
import React, { useMemo, useState } from 'react';
import {
  BellRing, Clock, Copy, FileText, Hand, History, Mail, MessageCircle, Pencil, Plus, Send, Trash2, Wallet,
} from 'lucide-react';
import {
  useAnotarSaldo, useAvisos, useBorrarAviso, useBorrarPlantilla, useEnviarAviso, useEnviosAvisos,
  useEstadoAvisos, useGuardarAviso, useGuardarPlantilla, usePlantillasAvisos,
} from '../../hooks/avisos';
import { ErrorBox, Modal, Pill, btnGhost, btnPrimary, card, inputClass, labelClass } from '../tareas/ui';

const TIPOS = {
  saldo_openai: { label: 'Saldo de OpenAI bajo', icon: Wallet, color: '#f59e0b', desc: 'Sale cuando el saldo estimado queda en el monto que elijas o menos.' },
  programado: { label: 'Programado', icon: Clock, color: '#67c8f3', desc: 'Sale en una fecha y hora, una vez o repitiéndose.' },
  manual: { label: 'A mano', icon: Hand, color: '#a78bfa', desc: 'Solo sale cuando aprietas «Enviar ahora».' },
};
const FRECUENCIAS = { una_vez: 'Una vez', diaria: 'Todos los días', semanal: 'Cada semana', mensual: 'Cada mes' };
const CATEGORIAS = { saldo: 'Saldo OpenAI', cobros: 'Cobros', pagos: 'Pagos', marketing: 'Marketing', equipo: 'Equipo', chatbots: 'Chatbots', general: 'General' };
const VARIABLES = ['aviso', 'fecha', 'hora', 'saldo_usd', 'saldo_clp', 'umbral_usd', 'umbral_clp', 'enlace_recarga', 'panel'];

const usd = (n) => `US$ ${Number(n || 0).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const clp = (n) => `$${Math.round(Number(n || 0)).toLocaleString('es-CL')}`;
const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '—');
// <input type="datetime-local"> trabaja en hora local sin zona.
const aLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const rellenar = (t, vars) => String(t ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (vars?.[k] ?? m));

function Interruptor({ activo, onChange, label, icon: Icon, color = '#22c55e', disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!activo)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${activo ? 'text-white' : 'border-white/10 text-[#9aafc3] hover:text-white'}`}
      style={activo ? { borderColor: `${color}80`, background: `${color}26` } : undefined}
      aria-pressed={activo}
    >
      {Icon && <Icon className="w-3.5 h-3.5" style={activo ? { color } : undefined} />}
      {label}
      <span className={`relative h-4 w-7 rounded-full transition-colors ${activo ? '' : 'bg-white/15'}`} style={activo ? { background: color } : undefined}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${activo ? 'left-3.5' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

// ─── Saldo de OpenAI ──────────────────────────────────────────────────────────
function TarjetaSaldo({ estado }) {
  const anotar = useAnotarSaldo();
  const [forma, setForma] = useState(null); // 'saldo_conocido' | 'recarga'
  const [monto, setMonto] = useState('');
  const s = estado?.saldo;
  const tasa = estado?.usd_clp || 950;

  const guardar = async (e) => {
    e.preventDefault();
    await anotar.mutateAsync({ tipo: forma, monto_usd: Number(String(monto).replace(',', '.')) });
    setForma(null);
    setMonto('');
  };

  return (
    <div className={`${card} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-[#9aafc3]"><Wallet className="w-4 h-4 text-[#f59e0b]" /> Saldo estimado de OpenAI</div>
          {s?.configurado ? (
            <>
              <div className="mt-1 text-3xl font-semibold text-white">{usd(s.saldo_usd)} <span className="text-base font-normal text-[#9aafc3]">≈ {clp(s.saldo_usd * tasa)}</span></div>
              <p className="mt-1 text-xs text-[#9aafc3]">
                Anotado {usd(s.base.monto_usd)} el {fechaHora(s.base.fecha)} + recargas {usd(s.recargado_usd)} − gasto {usd(s.gasto_usd)} ({s.fuente_gasto}).
              </p>
            </>
          ) : (
            <p className="mt-1 max-w-lg text-sm text-amber-300">
              Falta anotar el saldo actual. Míralo en{' '}
              <a className="underline" href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noreferrer">OpenAI → Billing</a>{' '}
              y anótalo aquí: desde ahí el sistema descuenta lo que se gasta.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnGhost} onClick={() => setForma('saldo_conocido')}><Pencil className="w-4 h-4" /> Anotar saldo actual</button>
          <button type="button" className={btnGhost} onClick={() => setForma('recarga')}><Plus className="w-4 h-4" /> Registrar recarga</button>
        </div>
      </div>
      {forma && (
        <form onSubmit={guardar} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <div>
            <label className={labelClass}>{forma === 'recarga' ? 'Monto recargado (US$)' : 'Saldo que muestra OpenAI ahora (US$)'}</label>
            <input className={`${inputClass} w-44`} inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="10,00" autoFocus required />
          </div>
          <button className={btnPrimary} disabled={anotar.isPending}>Guardar</button>
          <button type="button" className={btnGhost} onClick={() => setForma(null)}>Cancelar</button>
          <ErrorBox error={anotar.error} />
        </form>
      )}
    </div>
  );
}

// ─── Editor de aviso ──────────────────────────────────────────────────────────
const NUEVO = {
  nombre: '', tipo: 'saldo_openai', umbral_usd: 5, repetir_horas: 6, proximo_envio: null, frecuencia: 'una_vez',
  plantilla_id: null, asunto: '', cuerpo: '', whatsapp_activo: true, whatsapp_destinos: '', correo_activo: true,
  correo_destinos: '', activo: true,
};

function EditorAviso({ inicial, plantillas, estado, onClose }) {
  const guardar = useGuardarAviso();
  const [a, setA] = useState(() => ({ ...NUEVO, ...inicial }));
  const set = (cambios) => setA((p) => ({ ...p, ...cambios }));
  const tasa = estado?.usd_clp || 950;

  const usarPlantilla = (id) => {
    const p = plantillas.find((x) => x.id === id);
    set({ plantilla_id: id || null, ...(p ? { asunto: p.asunto, cuerpo: p.cuerpo, nombre: a.nombre || p.nombre } : {}) });
  };
  const insertar = (v) => set({ cuerpo: `${a.cuerpo}${a.cuerpo && !a.cuerpo.endsWith(' ') ? ' ' : ''}{{${v}}}` });

  const vars = {
    ...estado?.variables,
    aviso: a.nombre,
    ...(a.umbral_usd != null ? { umbral_usd: Number(a.umbral_usd).toLocaleString('es-CL', { minimumFractionDigits: 2 }), umbral_clp: clp(a.umbral_usd * tasa) } : {}),
  };

  const enviar = async (e) => {
    e.preventDefault();
    const { id, nombre, tipo, umbral_usd, repetir_horas, proximo_envio, frecuencia, plantilla_id, asunto, cuerpo,
      whatsapp_activo, whatsapp_destinos, correo_activo, correo_destinos, activo } = a;
    await guardar.mutateAsync({
      id, nombre: nombre.trim(), tipo, plantilla_id, asunto, cuerpo, whatsapp_activo, whatsapp_destinos, correo_activo, correo_destinos, activo,
      umbral_usd: tipo === 'saldo_openai' ? Number(String(umbral_usd).replace(',', '.')) : null,
      repetir_horas: Number(repetir_horas) || 6,
      proximo_envio: tipo === 'programado' ? proximo_envio : null,
      frecuencia: tipo === 'programado' ? frecuencia : null,
      // Editar la condición rearma el aviso: puede volver a salir enseguida.
      disparado_at: null,
    });
    onClose();
  };

  const porCategoria = useMemo(() => {
    const g = {};
    for (const p of plantillas) (g[p.categoria] ??= []).push(p);
    return g;
  }, [plantillas]);

  return (
    <Modal titulo={a.id ? 'Editar aviso' : 'Nuevo aviso'} onClose={onClose} ancho="max-w-3xl">
      <form onSubmit={enviar} className="space-y-5">
        <div>
          <label className={labelClass}>¿Cuándo sale?</label>
          <div className="grid gap-2 sm:grid-cols-3">
            {Object.entries(TIPOS).map(([k, t]) => {
              const Icon = t.icon;
              return (
                <button key={k} type="button" onClick={() => set({ tipo: k })}
                  className={`rounded-lg border p-3 text-left transition-colors ${a.tipo === k ? 'border-[#67c8f3] bg-[#67c8f3]/10' : 'border-white/10 hover:border-white/25'}`}>
                  <div className="flex items-center gap-2 text-sm font-medium text-white"><Icon className="w-4 h-4" style={{ color: t.color }} /> {t.label}</div>
                  <div className="mt-1 text-xs text-[#9aafc3]">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {a.tipo === 'saldo_openai' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Avisar cuando queden (US$) o menos</label>
              <input className={inputClass} inputMode="decimal" value={a.umbral_usd ?? ''} onChange={(e) => set({ umbral_usd: e.target.value })} required />
              <p className="mt-1 text-xs text-[#9aafc3]">≈ {clp(Number(String(a.umbral_usd).replace(',', '.')) * tasa)} · Ponlo con margen: con poco saldo, un día movido lo agota en horas.</p>
            </div>
            <div>
              <label className={labelClass}>Mientras siga bajo, repetir cada</label>
              <select className={inputClass} value={a.repetir_horas} onChange={(e) => set({ repetir_horas: Number(e.target.value) })}>
                {[1, 3, 6, 12, 24].map((h) => <option key={h} value={h}>{h === 1 ? '1 hora' : `${h} horas`}</option>)}
              </select>
            </div>
          </div>
        )}

        {a.tipo === 'programado' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Fecha y hora</label>
              <input type="datetime-local" className={inputClass} value={aLocal(a.proximo_envio)}
                onChange={(e) => set({ proximo_envio: e.target.value ? new Date(e.target.value).toISOString() : null })} required />
            </div>
            <div>
              <label className={labelClass}>Se repite</label>
              <select className={inputClass} value={a.frecuencia || 'una_vez'} onChange={(e) => set({ frecuencia: e.target.value })}>
                {Object.entries(FRECUENCIAS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="space-y-3 rounded-lg border border-white/10 p-3">
          <label className={labelClass}>¿Por dónde sale? (puedes usar uno o los dos)</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Interruptor activo={a.whatsapp_activo} onChange={(v) => set({ whatsapp_activo: v })} label="WhatsApp" icon={MessageCircle} />
              <textarea className={`${inputClass} resize-none`} rows={2} placeholder="56912345678, 56987654321" disabled={!a.whatsapp_activo}
                value={a.whatsapp_destinos || ''} onChange={(e) => set({ whatsapp_destinos: e.target.value })} />
              <p className="text-xs text-[#9aafc3]">Sale desde NexCommit {estado?.whatsapp?.numero || '+56 9 8511 0430'}. Con código de país; varios separados por coma.</p>
            </div>
            <div className="space-y-2">
              <Interruptor activo={a.correo_activo} onChange={(v) => set({ correo_activo: v })} label="Correo" icon={Mail} color="#67c8f3" />
              <textarea className={`${inputClass} resize-none`} rows={2} placeholder="tu@correo.cl, socio@correo.cl" disabled={!a.correo_activo}
                value={a.correo_destinos || ''} onChange={(e) => set({ correo_destinos: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Partir de una plantilla</label>
              <select className={inputClass} value={a.plantilla_id || ''} onChange={(e) => usarPlantilla(e.target.value)}>
                <option value="">— Escribirlo a mano —</option>
                {Object.entries(porCategoria).map(([cat, ps]) => (
                  <optgroup key={cat} label={CATEGORIAS[cat] || cat}>
                    {ps.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Nombre del aviso (solo lo ves tú)</label>
              <input className={inputClass} value={a.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="Saldo OpenAI bajo" required />
            </div>
          </div>
          <div>
            <label className={labelClass}>Título (asunto del correo y primera línea del WhatsApp)</label>
            <input className={inputClass} value={a.asunto} onChange={(e) => set({ asunto: e.target.value })} required />
          </div>
          <div>
            <label className={labelClass}>Mensaje</label>
            <textarea className={`${inputClass} resize-y`} rows={4} value={a.cuerpo} onChange={(e) => set({ cuerpo: e.target.value })} required />
            <div className="mt-1 flex flex-wrap gap-1">
              {VARIABLES.map((v) => (
                <button key={v} type="button" onClick={() => insertar(v)} className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[11px] text-[#9aafc3] hover:text-white">{`{{${v}}}`}</button>
              ))}
            </div>
            <p className="mt-1 text-xs text-[#9aafc3]">Lo que está entre [corchetes] en las plantillas es para que lo reemplaces tú.</p>
          </div>
          <div className="rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/5 p-3 text-sm">
            <div className="mb-1 text-xs font-medium text-[#86efac]">Así se verá</div>
            <div className="font-semibold text-white">{rellenar(a.asunto, vars) || '(sin título)'}</div>
            <div className="mt-1 whitespace-pre-wrap text-[#cfe0f0]">{rellenar(a.cuerpo, vars)}</div>
          </div>
        </div>

        <ErrorBox error={guardar.error} />
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary} disabled={guardar.isPending}>{guardar.isPending ? 'Guardando…' : 'Guardar aviso'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Lista de avisos ──────────────────────────────────────────────────────────
function condicion(a, tasa) {
  if (a.tipo === 'saldo_openai') return `Cuando el saldo baje de ${usd(a.umbral_usd)} (≈ ${clp(a.umbral_usd * tasa)}) · repite cada ${a.repetir_horas} h mientras siga bajo`;
  if (a.tipo === 'programado') return `${FRECUENCIAS[a.frecuencia] || ''} · próximo: ${fechaHora(a.proximo_envio)}`;
  return 'Solo cuando aprietes «Enviar ahora»';
}

function FilaAviso({ a, tasa, onEditar }) {
  const guardar = useGuardarAviso();
  const borrar = useBorrarAviso();
  const enviar = useEnviarAviso();
  const t = TIPOS[a.tipo];
  const Icon = t.icon;
  const cambiar = (c) => guardar.mutate({ id: a.id, ...c });

  return (
    <div className={`${card} p-4 ${a.activo ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${t.color}26` }}>
          <Icon className="w-4 h-4" style={{ color: t.color }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white">{a.nombre}</span>
            <Pill color={t.color}>{t.label}</Pill>
            {!a.activo && <Pill color="#9aafc3">Apagado</Pill>}
          </div>
          <p className="mt-0.5 text-xs text-[#9aafc3]">{condicion(a, tasa)}</p>
          {a.ultimo_envio_at && <p className="mt-0.5 text-xs text-[#9aafc3]">Último envío: {fechaHora(a.ultimo_envio_at)} · {a.ultimo_resultado}</p>}
          {!a.ultimo_envio_at && a.ultimo_resultado && <p className="mt-0.5 text-xs text-amber-300">{a.ultimo_resultado}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Interruptor activo={a.whatsapp_activo} onChange={(v) => cambiar({ whatsapp_activo: v })} label="WhatsApp" icon={MessageCircle} />
          <Interruptor activo={a.correo_activo} onChange={(v) => cambiar({ correo_activo: v })} label="Correo" icon={Mail} color="#67c8f3" />
          <Interruptor activo={a.activo} onChange={(v) => cambiar({ activo: v })} label={a.activo ? 'Encendido' : 'Apagado'} color="#248bde" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btnGhost} disabled={enviar.isPending} onClick={() => enviar.mutate(a.id)}>
          <Send className="w-4 h-4" /> {enviar.isPending ? 'Enviando…' : a.tipo === 'manual' ? 'Enviar ahora' : 'Enviar prueba'}
        </button>
        <button type="button" className={btnGhost} onClick={() => onEditar(a)}><Pencil className="w-4 h-4" /> Editar</button>
        <button type="button" className={btnGhost} onClick={() => confirm(`¿Borrar el aviso «${a.nombre}»?`) && borrar.mutate(a.id)}><Trash2 className="w-4 h-4" /> Borrar</button>
      </div>
      {enviar.data && (
        <ul className="mt-2 space-y-0.5 text-xs">
          {enviar.data.filas.map((f, i) => (
            <li key={i} className={f.estado === 'enviado' ? 'text-[#86efac]' : 'text-red-300'}>
              {f.estado === 'enviado' ? '✓' : '✗'} {f.canal === 'whatsapp' ? 'WhatsApp' : 'Correo'} {f.destino || ''} {f.detalle ? `— ${f.detalle}` : ''}
            </li>
          ))}
        </ul>
      )}
      <ErrorBox error={enviar.error || guardar.error || borrar.error} />
    </div>
  );
}

// ─── Plantillas ───────────────────────────────────────────────────────────────
function EditorPlantilla({ inicial, onClose }) {
  const guardar = useGuardarPlantilla();
  const [p, setP] = useState({ nombre: '', categoria: 'general', asunto: '', cuerpo: '', ...inicial });
  const enviar = async (e) => {
    e.preventDefault();
    await guardar.mutateAsync({ id: p.id, nombre: p.nombre.trim(), categoria: p.categoria, asunto: p.asunto, cuerpo: p.cuerpo });
    onClose();
  };
  return (
    <Modal titulo={p.id ? 'Editar plantilla' : 'Nueva plantilla'} onClose={onClose}>
      <form onSubmit={enviar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={labelClass}>Nombre</label><input className={inputClass} value={p.nombre} onChange={(e) => setP({ ...p, nombre: e.target.value })} required /></div>
          <div>
            <label className={labelClass}>Categoría</label>
            <select className={inputClass} value={p.categoria} onChange={(e) => setP({ ...p, categoria: e.target.value })}>
              {Object.entries(CATEGORIAS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        </div>
        <div><label className={labelClass}>Título</label><input className={inputClass} value={p.asunto} onChange={(e) => setP({ ...p, asunto: e.target.value })} required /></div>
        <div>
          <label className={labelClass}>Mensaje</label>
          <textarea className={`${inputClass} resize-y`} rows={5} value={p.cuerpo} onChange={(e) => setP({ ...p, cuerpo: e.target.value })} required />
          <p className="mt-1 text-xs text-[#9aafc3]">Variables: {VARIABLES.map((v) => `{{${v}}}`).join(' ')} · Usa [corchetes] para lo que se completa en cada aviso.</p>
        </div>
        <ErrorBox error={guardar.error} />
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary} disabled={guardar.isPending}>Guardar plantilla</button>
        </div>
      </form>
    </Modal>
  );
}

function Plantillas({ plantillas, onUsar }) {
  const borrar = useBorrarPlantilla();
  const [editando, setEditando] = useState(null);
  const grupos = useMemo(() => {
    const g = {};
    for (const p of plantillas) (g[p.categoria] ??= []).push(p);
    return g;
  }, [plantillas]);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button type="button" className={btnPrimary} onClick={() => setEditando({})}><Plus className="w-4 h-4" /> Nueva plantilla</button>
      </div>
      {Object.entries(grupos).map(([cat, ps]) => (
        <div key={cat}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#5f7891]">{CATEGORIAS[cat] || cat}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {ps.map((p) => (
              <div key={p.id} className={`${card} p-4`}>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{p.nombre}</span>
                  {p.es_sistema ? <Pill color="#9aafc3">De sistema</Pill> : <Pill color="#22c55e">Tuya</Pill>}
                </div>
                <p className="mt-1 text-sm text-[#cfe0f0]">{p.asunto}</p>
                <p className="mt-1 line-clamp-3 text-xs text-[#9aafc3]">{p.cuerpo}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={btnGhost} onClick={() => onUsar(p)}><BellRing className="w-4 h-4" /> Crear aviso</button>
                  {p.es_sistema ? (
                    <button type="button" className={btnGhost} onClick={() => setEditando({ nombre: `${p.nombre} (copia)`, categoria: p.categoria, asunto: p.asunto, cuerpo: p.cuerpo })}><Copy className="w-4 h-4" /> Duplicar</button>
                  ) : (
                    <>
                      <button type="button" className={btnGhost} onClick={() => setEditando(p)}><Pencil className="w-4 h-4" /> Editar</button>
                      <button type="button" className={btnGhost} onClick={() => confirm(`¿Borrar la plantilla «${p.nombre}»?`) && borrar.mutate(p.id)}><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <ErrorBox error={borrar.error} />
      {editando && <EditorPlantilla inicial={editando} onClose={() => setEditando(null)} />}
    </div>
  );
}

// ─── Historial ────────────────────────────────────────────────────────────────
function Historial() {
  const { data = [], error } = useEnviosAvisos();
  if (error) return <ErrorBox error={error} />;
  if (!data.length) return <p className="text-sm text-[#9aafc3]">Todavía no se ha enviado ningún aviso.</p>;
  return (
    <div className={`${card} overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-[#9aafc3]">
          <tr><th className="px-4 py-2">Cuándo</th><th className="px-4 py-2">Aviso</th><th className="px-4 py-2">Por</th><th className="px-4 py-2">A</th><th className="px-4 py-2">Resultado</th></tr>
        </thead>
        <tbody>
          {data.map((f) => (
            <tr key={f.id} className="border-t border-white/5">
              <td className="whitespace-nowrap px-4 py-2 text-[#9aafc3]">{fechaHora(f.created_at)}</td>
              <td className="px-4 py-2 text-white">{f.aviso_nombre}</td>
              <td className="px-4 py-2 text-[#cfe0f0]">{f.canal === 'whatsapp' ? 'WhatsApp' : 'Correo'}</td>
              <td className="px-4 py-2 text-[#cfe0f0]">{f.destino || '—'}</td>
              <td className={`px-4 py-2 ${f.estado === 'enviado' ? 'text-[#86efac]' : 'text-red-300'}`}>{f.estado === 'enviado' ? 'Enviado' : 'Error'}{f.detalle ? ` · ${f.detalle}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
const PESTANAS = [
  { id: 'avisos', label: 'Mis avisos', icon: BellRing },
  { id: 'plantillas', label: 'Plantillas', icon: FileText },
  { id: 'historial', label: 'Historial', icon: History },
];

export default function AvisosAdmin() {
  const avisos = useAvisos();
  const plantillas = usePlantillasAvisos();
  const estado = useEstadoAvisos();
  const [pestana, setPestana] = useState('avisos');
  const [editando, setEditando] = useState(null);
  const tasa = estado.data?.usd_clp || 950;
  const lista = plantillas.data || [];
  const plantillaWa = estado.data?.whatsapp?.plantilla_estado;

  const nuevoSaldo = () => {
    const p = lista.find((x) => x.nombre === 'Saldo OpenAI bajo');
    setEditando({ nombre: 'Saldo OpenAI bajo', tipo: 'saldo_openai', umbral_usd: 5, plantilla_id: p?.id ?? null, asunto: p?.asunto ?? '', cuerpo: p?.cuerpo ?? '' });
  };
  const desdePlantilla = (p) => {
    setEditando({ nombre: p.nombre, tipo: p.categoria === 'saldo' ? 'saldo_openai' : 'manual', plantilla_id: p.id, asunto: p.asunto, cuerpo: p.cuerpo });
    setPestana('avisos');
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Avisos</h1>
        <p className="text-sm text-[#9aafc3]">Avisos por WhatsApp y/o correo: cuando el saldo de OpenAI queda bajo, en una fecha o cuando tú quieras. Se revisan cada 5 minutos.</p>
      </div>

      {estado.error && <ErrorBox error={estado.error} />}
      <TarjetaSaldo estado={estado.data} />

      {plantillaWa && plantillaWa !== 'APPROVED' && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          La plantilla de WhatsApp de los avisos está {plantillaWa === 'PENDING' ? 'en revisión en Meta' : `en estado ${plantillaWa}`}. Mientras tanto, el WhatsApp solo llega a quien le haya escrito a {estado.data?.whatsapp?.numero || 'NexCommit'} en las últimas 24 horas; el correo sale igual.
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-b border-white/10">
        {PESTANAS.map((p) => {
          const Icon = p.icon;
          return (
            <button key={p.id} type="button" onClick={() => setPestana(p.id)}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm ${pestana === p.id ? 'border-[#67c8f3] text-white' : 'border-transparent text-[#9aafc3] hover:text-white'}`}>
              <Icon className="w-4 h-4" /> {p.label}
            </button>
          );
        })}
      </div>

      {pestana === 'avisos' && (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={btnPrimary} onClick={() => setEditando({})}><Plus className="w-4 h-4" /> Nuevo aviso</button>
          </div>
          {avisos.error && <ErrorBox error={avisos.error} />}
          {avisos.data?.length === 0 && (
            <div className={`${card} p-6 text-center`}>
              <p className="text-white">Todavía no tienes avisos.</p>
              <p className="mt-1 text-sm text-[#9aafc3]">Empieza por el más importante: que te avise antes de que OpenAI se quede sin saldo.</p>
              <button type="button" className={`${btnPrimary} mt-4`} onClick={nuevoSaldo}><Wallet className="w-4 h-4" /> Crear aviso de saldo bajo</button>
            </div>
          )}
          {(avisos.data || []).map((a) => <FilaAviso key={a.id} a={a} tasa={tasa} onEditar={setEditando} />)}
        </div>
      )}
      {pestana === 'plantillas' && <Plantillas plantillas={lista} onUsar={desdePlantilla} />}
      {pestana === 'historial' && <Historial />}

      {editando && <EditorAviso inicial={editando} plantillas={lista} estado={estado.data} onClose={() => setEditando(null)} />}
    </div>
  );
}
