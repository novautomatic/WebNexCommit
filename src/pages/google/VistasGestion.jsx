// Panel Herramientas Google: Cambios (aprobar/editar/rechazar), Análisis con IA y
// Configuración del negocio. Los cambios aprobados los aplica el script de Google
// Ads en su próxima pasada (diaria 7:00, o al ejecutarlo a mano).
import { useMemo, useState } from 'react';
import { Bot, Check, ClipboardList, History, Plus, Save, Settings, Sparkles, X } from 'lucide-react';
import {
  CONCORDANCIAS, TIPOS_CAMBIO, useAnalizar, useCrearCambio, useEditarCambio, useGuardarConfig, useHistorialAnalisis,
} from '../../hooks/google';
import { ErrorBox, btnGhost, btnPrimary, inputClass, labelClass } from '../tareas/ui';
import { Kpi, Seccion, Vacio } from './graficos';
import { ESTADO, clp, pct } from './formato';

const ESTADOS = {
  propuesto: { label: 'Por revisar', color: ESTADO.mejorar },
  aprobado: { label: 'Aprobado · espera al script', color: '#3987e5' },
  aplicado: { label: 'Aplicado', color: ESTADO.bien },
  error: { label: 'Error al aplicar', color: ESTADO.alerta },
  rechazado: { label: 'Rechazado', color: '#5f7891' },
};
const CAMPO = {
  campana: 'Campaña', grupo: 'Grupo de anuncios', texto: 'Palabra / término', concordancia: 'Concordancia', monto_clp: 'Monto (CLP)',
};

function opciones(p) {
  const a = p.ads.error ? {} : p.ads;
  return {
    campanas: (a.campanas || []).map((c) => c.nombre),
    grupos: [...new Set((a.palabras || []).map((x) => x.grupo).filter(Boolean))],
  };
}

function CamposCambio({ tipo, datos, setDatos, ops, bloqueado }) {
  const set = (k, v) => setDatos({ ...datos, [k]: v });
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
      {TIPOS_CAMBIO[tipo].campos.map((k) => (
        <label key={k} className="block">
          <span className={labelClass}>{CAMPO[k]}{['concordancia', 'grupo'].includes(k) && ['pausar_palabra', 'activar_palabra'].includes(tipo) ? ' (opcional)' : ''}</span>
          {k === 'campana' || k === 'grupo' ? (
            <select className={inputClass} disabled={bloqueado} value={datos[k] || ''} onChange={(e) => set(k, e.target.value)}>
              <option value="">—</option>
              {(k === 'campana' ? ops.campanas : ops.grupos).concat(datos[k] && !(k === 'campana' ? ops.campanas : ops.grupos).includes(datos[k]) ? [datos[k]] : []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : k === 'concordancia' ? (
            <select className={inputClass} disabled={bloqueado} value={datos[k] || ''} onChange={(e) => set(k, e.target.value || undefined)}>
              <option value="">—</option>
              {Object.entries(CONCORDANCIAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ) : (
            <input className={inputClass} disabled={bloqueado} type={k === 'monto_clp' ? 'number' : 'text'} value={datos[k] ?? ''} onChange={(e) => set(k, k === 'monto_clp' ? Number(e.target.value) : e.target.value)} />
          )}
        </label>
      ))}
    </div>
  );
}

function TarjetaCambio({ c, ops }) {
  const editar = useEditarCambio();
  const [tipo, setTipo] = useState(c.tipo);
  const [datos, setDatos] = useState(c.datos || {});
  const e = ESTADOS[c.estado];
  const editable = ['propuesto', 'rechazado', 'error', 'aprobado'].includes(c.estado);
  const guardar = (estado) => editar.mutate({ id: c.id, tipo, datos, estado });
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded px-2 py-0.5 border" style={{ borderColor: `${e.color}66`, color: e.color }}>{e.label}</span>
        <select className="bg-transparent text-white text-sm font-medium" disabled={!editable} value={tipo} onChange={(ev) => setTipo(ev.target.value)}>
          {Object.entries(TIPOS_CAMBIO).map(([k, v]) => <option key={k} value={k} className="bg-[#0d1e30]">{v.label}</option>)}
        </select>
        <span className="text-[#5f7891]">{c.origen === 'ia' ? 'Propuesto por la IA' : c.origen === 'regla' ? 'Regla automática' : `Manual · ${c.creado_por || ''}`} · {new Date(c.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</span>
      </div>
      {c.motivo && <p className="text-xs text-[#9aafc3]">{c.motivo}</p>}
      <CamposCambio tipo={tipo} datos={datos} setDatos={setDatos} ops={ops} bloqueado={!editable} />
      {c.resultado && <p className={`text-xs ${c.estado === 'error' ? 'text-[#f3a3a3]' : 'text-[#9fe39f]'}`}>Google Ads: {c.resultado}</p>}
      {c.aprobado_por && <p className="text-[11px] text-[#5f7891]">Aprobado por {c.aprobado_por}{c.aplicado_at ? ` · aplicado ${new Date(c.aplicado_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</p>}
      {editable && (
        <div className="flex flex-wrap gap-2 pt-1">
          {c.estado !== 'aprobado' && <button type="button" className={btnPrimary} disabled={editar.isPending} onClick={() => guardar('aprobado')}><Check className="w-4 h-4" /> Aprobar</button>}
          <button type="button" className={btnGhost} disabled={editar.isPending} onClick={() => guardar(c.estado === 'aprobado' ? 'aprobado' : 'propuesto')}><Save className="w-4 h-4" /> Guardar cambios</button>
          {c.estado === 'aprobado' && <button type="button" className={btnGhost} disabled={editar.isPending} onClick={() => guardar('propuesto')}>Quitar aprobación</button>}
          {c.estado !== 'rechazado' && <button type="button" className={btnGhost} disabled={editar.isPending} onClick={() => guardar('rechazado')}><X className="w-4 h-4" /> Rechazar</button>}
        </div>
      )}
      {editar.error && <ErrorBox error={editar.error} />}
    </div>
  );
}

function NuevoCambio({ ops }) {
  const crear = useCrearCambio();
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState('negativa');
  const [datos, setDatos] = useState({ campana: ops.campanas[0], concordancia: 'PHRASE' });
  const [motivo, setMotivo] = useState('');
  if (!abierto) return <button type="button" className={btnGhost} onClick={() => setAbierto(true)}><Plus className="w-4 h-4" /> Nuevo cambio a mano</button>;
  return (
    <div className="rounded-lg border border-white/10 p-3 space-y-2">
      <label className="block max-w-xs">
        <span className={labelClass}>Tipo de cambio</span>
        <select className={inputClass} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {Object.entries(TIPOS_CAMBIO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </label>
      <CamposCambio tipo={tipo} datos={datos} setDatos={setDatos} ops={ops} />
      <label className="block"><span className={labelClass}>Motivo (opcional)</span><input className={inputClass} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>
      <div className="flex gap-2">
        <button type="button" className={btnPrimary} disabled={crear.isPending} onClick={() => crear.mutate({ tipo, datos, motivo }, { onSuccess: () => { setAbierto(false); setMotivo(''); } })}>Crear propuesta</button>
        <button type="button" className={btnGhost} onClick={() => setAbierto(false)}>Cancelar</button>
      </div>
      {crear.error && <ErrorBox error={crear.error} />}
    </div>
  );
}

export function VistaCambios({ p }) {
  const ops = useMemo(() => opciones(p), [p]);
  const [filtro, setFiltro] = useState('propuesto');
  const lista = (p.cambios || []).filter((c) => (filtro === 'todos' ? true : c.estado === filtro));
  const cuenta = (e) => (p.cambios || []).filter((c) => c.estado === e).length;
  if (!p.tablas_ok) return <Vacio>Falta correr la migración <b>20261020120000_herramientas_google.sql</b> en el Supabase de NexCommit.</Vacio>;
  return (
    <Seccion titulo="Cambios en Google Ads" icon={ClipboardList} extra="Nada se aplica sin tu aprobación">
      <p className="text-xs text-[#9aafc3] mb-3">
        Revisa y edita cada valor antes de aprobar. Lo aprobado lo aplica el script de Google Ads en su próxima pasada (todos los días a las 7:00).
        ¿Urgente? En Google Ads → Secuencias de comandos → <b>Ads a Sheets diario</b> → Ejecutar.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {[...Object.keys(ESTADOS), 'todos'].map((e) => (
          <button key={e} type="button" onClick={() => setFiltro(e)} className={`rounded-full px-3 py-1 text-xs border ${filtro === e ? 'bg-[#1a3050] text-white border-[#3987e5]' : 'border-white/10 text-[#9aafc3] hover:text-white'}`}>
            {e === 'todos' ? 'Todos' : ESTADOS[e].label}{e !== 'todos' && ` (${cuenta(e)})`}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {lista.map((c) => <TarjetaCambio key={`--`} c={c} ops={ops} />)}
        {!lista.length && <Vacio>No hay cambios en este estado.</Vacio>}
      </div>
      <div className="mt-4"><NuevoCambio ops={ops} /></div>
    </Seccion>
  );
}

// ── Análisis con IA ──────────────────────────────────────────────────────────
const PRIORIDAD = { alta: ESTADO.alerta, media: ESTADO.mejorar, baja: '#5f7891' };

function Contador({ texto, max }) {
  const n = [...String(texto || '')].length;
  return <span className={`text-[10px] tabular-nums ${n > max ? 'text-[#f3a3a3]' : 'text-[#5f7891]'}`}>{n}/{max}</span>;
}

function ResultadoAnalisis({ a, p, irACambios }) {
  const r = a.resumen || {};
  const crear = useCrearCambio();
  const ops = opciones(p);
  const probar = (x) => crear.mutate({ tipo: 'palabra_nueva', datos: { campana: ops.campanas[0], grupo: ops.grupos[0], texto: x.texto, concordancia: x.concordancia || 'PHRASE' }, motivo: `Sugerida por la IA: ${x.por_que}` });
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Kpi titulo="Puntaje de la cuenta" valor={`${r.puntaje ?? '—'}/10`} />
        <Kpi titulo="Generado" valor={new Date(a.created_at).toLocaleDateString('es-CL')} detalle={`${a.creado_por || ''} · ${a.dias} días`} />
        <Kpi titulo="Costo del análisis" valor={`US$ ${Number(a.costo_usd || 0).toFixed(3)}`} detalle={a.modelo} />
      </div>
      <Seccion titulo="Resumen" icon={Bot}><p className="text-sm text-[#cfe0f0] leading-relaxed">{r.resumen}</p></Seccion>
      <div className="grid lg:grid-cols-3 gap-4">
        <Seccion titulo="Qué mejorar" icon={Sparkles} className="lg:col-span-2">
          <div className="space-y-2">
            {(r.mejorar || []).map((m) => (
              <div key={m.titulo} className="rounded-lg border border-white/10 p-3">
                <div className="text-sm text-white flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 border" style={{ color: PRIORIDAD[m.prioridad], borderColor: `${PRIORIDAD[m.prioridad]}66` }}>{m.prioridad} · {m.area}</span>
                  {m.titulo}
                </div>
                {m.detalle && <p className="text-xs text-[#9aafc3] mt-1">{m.detalle}</p>}
                <dl className="grid gap-1 text-xs mt-2">
                  {m.como && <div><dt className="text-[#67c8f3] inline">Cómo: </dt><dd className="inline text-[#cfe0f0]">{m.como}</dd></div>}
                  {m.por_que && <div><dt className="text-[#67c8f3] inline">Por qué: </dt><dd className="inline text-[#cfe0f0]">{m.por_que}</dd></div>}
                  {m.esperar && <div><dt className="text-[#67c8f3] inline">Qué esperar: </dt><dd className="inline text-[#cfe0f0]">{m.esperar}</dd></div>}
                </dl>
              </div>
            ))}
          </div>
        </Seccion>
        <Seccion titulo="Lo que va bien" icon={Check}>
          <ul className="space-y-2 text-xs">
            {(r.va_bien || []).map((b) => <li key={b.titulo}><b className="text-white">{b.titulo}</b><div className="text-[#9aafc3]">{b.detalle}</div></li>)}
          </ul>
        </Seccion>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Seccion titulo="Títulos para probar" icon={Sparkles} extra="cópialos al anuncio en Google Ads">
          <ul className="space-y-1.5 text-xs">{(r.titulos_sugeridos || []).map((t) => <li key={t.texto} className="flex justify-between gap-2"><span className="text-white">{t.texto}</span><Contador texto={t.texto} max={30} /></li>)}</ul>
        </Seccion>
        <Seccion titulo="Descripciones para probar" icon={Sparkles}>
          <ul className="space-y-1.5 text-xs">{(r.descripciones_sugeridas || []).map((t) => <li key={t.texto}><span className="text-white">{t.texto}</span> <Contador texto={t.texto} max={90} /></li>)}</ul>
        </Seccion>
        <Seccion titulo="Palabras clave para probar" icon={Sparkles}>
          <ul className="space-y-1.5 text-xs">
            {(r.palabras_a_probar || []).map((x) => (
              <li key={x.texto} className="flex justify-between gap-2 items-start">
                <span><b className="text-white">{x.concordancia === 'EXACT' ? `[${x.texto}]` : `"${x.texto}"`}</b> <span className="text-[#9aafc3]">{x.por_que}</span></span>
                <button type="button" className="text-[11px] rounded border border-white/15 px-2 py-0.5 text-[#9aafc3] hover:text-white shrink-0" onClick={() => probar(x)}>Proponer</button>
              </li>
            ))}
          </ul>
        </Seccion>
      </div>
      {(r.cambios?.length > 0) && (
        <p className="text-xs text-[#9aafc3]">La IA dejó <b className="text-white">{r.cambios.length}</b> cambio(s) en <button type="button" className="underline text-[#67c8f3]" onClick={irACambios}>Cambios → Por revisar</button>.</p>
      )}
      {r.proxima_revision && <Seccion titulo="Para la próxima revisión" icon={History}><p className="text-sm text-[#cfe0f0]">{r.proxima_revision}</p></Seccion>}
    </div>
  );
}

export function VistaAnalisis({ p, dias, irACambios }) {
  const analizar = useAnalizar();
  const historial = useHistorialAnalisis();
  const [elegido, setElegido] = useState(null);
  const lista = historial.data || [];
  const actual = lista.find((x) => x.id === elegido) || analizar.data || lista[0] || p.ultimo_analisis;
  if (!p.tablas_ok) return <Vacio>Falta correr la migración <b>20261020120000_herramientas_google.sql</b> en el Supabase de NexCommit.</Vacio>;
  return (
    <div className="space-y-4">
      <Seccion titulo="Analizador con IA" icon={Bot} extra="lee Ads + Analytics + Search Console y compara con el análisis anterior">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={btnPrimary} disabled={analizar.isPending} onClick={() => analizar.mutate(dias, { onSuccess: (d) => setElegido(d.id) })}>
            <Sparkles className="w-4 h-4" /> {analizar.isPending ? 'Analizando… (~30 s)' : `Analizar últimos ${dias} días`}
          </button>
          {lista.length > 0 && (
            <select className={`${inputClass} max-w-xs`} value={actual?.id || ''} onChange={(e) => setElegido(e.target.value)}>
              {lista.map((x) => <option key={x.id} value={x.id}>{new Date(x.created_at).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })} · {x.resumen?.puntaje ?? '—'}/10</option>)}
            </select>
          )}
          {analizar.data && <span className="text-xs text-[#9aafc3]">{analizar.data.cambios_creados} cambio(s) propuestos{analizar.data.cambios_descartados ? `, ${analizar.data.cambios_descartados} descartados por datos incompletos` : ''}.</span>}
        </div>
        {analizar.error && <div className="mt-2"><ErrorBox error={analizar.error} /></div>}
      </Seccion>
      {actual ? <ResultadoAnalisis a={actual} p={p} irACambios={irACambios} /> : <Vacio>Aún no hay análisis. Pulsa el botón: cada análisis queda guardado para comparar semana a semana.</Vacio>}
    </div>
  );
}

// ── Configuración ────────────────────────────────────────────────────────────
export function VistaConfig({ p }) {
  const guardar = useGuardarConfig();
  const [f, setF] = useState(p.config);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valor = Number(f.ticket_promedio) * Number(f.tasa_cierre);
  return (
    <Seccion titulo="Datos del negocio" icon={Settings} extra="se usan en el diagnóstico, el análisis con IA y las proyecciones">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label><span className={labelClass}>Ticket promedio (CLP)</span><input type="number" className={inputClass} value={f.ticket_promedio} onChange={set('ticket_promedio')} /></label>
        <label><span className={labelClass}>Tasa de cierre (de 0 a 1)</span><input type="number" step="0.01" className={inputClass} value={f.tasa_cierre} onChange={set('tasa_cierre')} /></label>
        <label><span className={labelClass}>Costo por contacto objetivo (CLP)</span><input type="number" className={inputClass} value={f.cpa_objetivo} onChange={set('cpa_objetivo')} /></label>
        <label><span className={labelClass}>Presupuesto mensual máximo (CLP)</span><input type="number" className={inputClass} value={f.presupuesto_mensual_max} onChange={set('presupuesto_mensual_max')} /></label>
      </div>
      <label className="block mt-3"><span className={labelClass}>Notas para la IA (qué vendes más, qué no quieres, temporadas…)</span>
        <textarea rows={3} className={inputClass} value={f.notas || ''} onChange={set('notas')} />
      </label>
      <div className="grid sm:grid-cols-3 gap-3 mt-3">
        <Kpi titulo="Un contacto vale" valor={clp(valor)} detalle={`${clp(Number(f.ticket_promedio))} × ${pct(Number(f.tasa_cierre))}`} />
        <Kpi titulo="Máximo rentable por contacto" valor={clp(valor * 0.3)} detalle="30% de lo que vale (deja margen)" />
        <Kpi titulo="Presupuesto diario máximo" valor={clp(Number(f.presupuesto_mensual_max) / 30.4)} />
      </div>
      <div className="mt-3 flex gap-2 items-center">
        <button type="button" className={btnPrimary} disabled={guardar.isPending} onClick={() => guardar.mutate(f)}><Save className="w-4 h-4" /> Guardar</button>
        {guardar.isSuccess && <span className="text-xs text-[#9fe39f]">Guardado.</span>}
      </div>
      {guardar.error && <div className="mt-2"><ErrorBox error={guardar.error} /></div>}
      <p className="text-[11px] text-[#5f7891] mt-3">Cuando tengas datos reales de cierre (cuántos de los que escriben contratan), actualiza la tasa: cambia todos los cálculos de rentabilidad.</p>
    </Seccion>
  );
}
