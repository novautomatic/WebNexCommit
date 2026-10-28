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
import { ESTADO, clp, pct, tr } from './formato';

const ESTADOS = {
  propuesto: { label: 'Por revisar', color: ESTADO.mejorar },
  aprobado: { label: 'Aprobado · espera al script', color: '#3987e5' },
  aplicado: { label: 'Aplicado', color: ESTADO.bien },
  error: { label: 'Error al aplicar', color: ESTADO.alerta },
  rechazado: { label: 'Rechazado', color: '#5f7891' },
};
const CAMPO = {
  campana: 'Campaña', grupo: 'Grupo de anuncios', texto: 'Palabra / término', concordancia: 'Concordancia', monto_clp: 'Monto (CLP)',
  sufijo: 'Sufijo de URL (vacío = quitarlo)',
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

// Antes y después de un cambio aplicado: 7 días previos vs. los días siguientes (sin contar el día
// del cambio), con los datos diarios de Ads. Con pocos datos lo dice en vez de concluir.
function sumar(dias) {
  const t = dias.reduce((a, d) => ({ impr: a.impr + d.impr, clics: a.clics + d.clics, costo: a.costo + d.costo, conv: a.conv + d.conv }), { impr: 0, clics: 0, costo: 0, conv: 0 });
  const pond = (k) => {
    const con = dias.filter((d) => d[k] != null && d.impr > 0);
    const base = con.reduce((a, d) => a + d.impr, 0);
    return base ? con.reduce((a, d) => a + d[k] * d.impr, 0) / base : null;
  };
  return { ...t, ctr: t.impr ? t.clics / t.impr : null, cpc: t.clics ? t.costo / t.clics : null, cuota: pond('cuota'), perd: pond('perd_presupuesto'), n: dias.length };
}

function AntesDespues({ c, porDia }) {
  if (c.estado !== 'aplicado' || !c.aplicado_at || !porDia?.length) return null;
  const dia = new Date(c.aplicado_at).toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
  const ms = Date.parse(`${dia}T12:00:00Z`);
  const desde = new Date(ms - 7 * 864e5).toISOString().slice(0, 10);
  const hasta = new Date(ms + 7 * 864e5).toISOString().slice(0, 10);
  const antes = sumar(porDia.filter((d) => d.fecha >= desde && d.fecha < dia));
  const despues = sumar(porDia.filter((d) => d.fecha > dia && d.fecha <= hasta));
  const pocos = despues.n < 3 || despues.clics < 20;
  const filas = [
    ['Impresiones/día', antes.impr / (antes.n || 1), despues.impr / (despues.n || 1), (v) => v.toFixed(1), true],
    ['Clics/día', antes.clics / (antes.n || 1), despues.clics / (despues.n || 1), (v) => v.toFixed(1), true],
    ['CTR', antes.ctr, despues.ctr, (v) => pct(v, 1), true],
    ['Costo por clic', antes.cpc, despues.cpc, clp, false],
    ['Contactos', antes.conv, despues.conv, (v) => String(v), true],
    ['Te mostraste en', antes.cuota, despues.cuota, (v) => pct(v), true],
    ['Perdido por presupuesto', antes.perd, despues.perd, (v) => pct(v), false],
  ];
  return (
    <div className="rounded-lg border border-white/10 p-2.5 mt-1">
      <div className="text-[11px] text-[#9aafc3] mb-1.5">
        Antes y después · {antes.n} día(s) con anuncios antes vs {despues.n} después del {fechaCorta(dia)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[11px]">
        {filas.map(([nombre, a, d, f, masEsMejor]) => {
          const ok = a != null && d != null && despues.n > 0;
          const color = !ok || a === d ? '#9aafc3' : (d > a) === masEsMejor ? ESTADO.bien : ESTADO.alerta;
          return (
            <div key={nombre}>
              <div className="text-[#5f7891]">{nombre}</div>
              <div className="tabular-nums text-[#cfe0f0]">{a == null ? '—' : f(a)} → <b style={{ color }}>{ok ? f(d) : '—'}</b></div>
            </div>
          );
        })}
      </div>
      {pocos && (
        <p className="text-[11px] text-[#f5d58a] mt-1.5">
          Pocos datos para concluir ({despues.n} día(s), {despues.clics} clics después). Míralo de nuevo cerca del {fechaCorta(hasta)}.
        </p>
      )}
    </div>
  );
}

// ¿La palabra que se quiere agregar ya está activa en OTRO grupo? Competirían entre sí y
// contaminan cualquier comparación entre grupos (pasó con "pagina web precios").
const normal = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[[\]"]/g, '').trim();
function duplicadaEnOtroGrupo(tipo, datos, palabras = []) {
  if (tipo !== 'palabra_nueva' || !datos?.texto) return [];
  return palabras.filter((p) => p.estado === 'ENABLED' && normal(p.texto) === normal(datos.texto) && p.grupo !== datos.grupo);
}

function TarjetaCambio({ c, ops, porDia, palabras }) {
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
        <span className="text-[#5f7891]">{c.origen === 'ia' ? 'Propuesto por la IA' : c.origen === 'analista' ? 'Propuesto por el analista de resultados' : c.origen === 'regla' ? 'Regla automática' : `Manual · ${c.creado_por || ''}`} · {new Date(c.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</span>
      </div>
      {c.motivo && <p className="text-xs text-[#9aafc3]">{c.motivo}</p>}
      <CamposCambio tipo={tipo} datos={datos} setDatos={setDatos} ops={ops} bloqueado={!editable} />
      {c.estado !== 'aplicado' && duplicadaEnOtroGrupo(tipo, datos, palabras).map((p) => (
        <p key={p.id} className="text-xs text-[#f5d58a]">
          ⚠ "{p.texto}" ya está activa en el grupo <b>{p.grupo}</b> ({tr(p.concordancia)}). Si la agregas aquí competirán entre sí: elige un solo grupo.
        </p>
      ))}
      {c.resultado && <p className={`text-xs ${c.estado === 'error' ? 'text-[#f3a3a3]' : 'text-[#9fe39f]'}`}>Google Ads: {c.resultado}</p>}
      <AntesDespues c={c} porDia={porDia} />
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
  // Abre en "Por revisar"; si no hay nada pendiente, en "Aplicado" (donde está el antes y después).
  const [filtro, setFiltro] = useState(() => ((p.cambios || []).some((c) => c.estado === 'propuesto') ? 'propuesto' : 'aplicado'));
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
        {lista.map((c) => (
          <TarjetaCambio key={`${c.id}-${c.estado}-${JSON.stringify(c.datos)}`} c={c} ops={ops} porDia={p.ads.error ? [] : p.ads.por_dia} palabras={p.ads.error ? [] : p.ads.palabras} />
        ))}
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

const fechaCorta = (iso) => (iso ? `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}` : '');

// "Métrica · hoy → meta · evaluar el": lo que convierte una recomendación en algo verificable.
function Medible({ x }) {
  if (!x?.metrica) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] rounded bg-white/[0.03] px-2 py-1">
      <span className="text-[#9aafc3]">Métrica: <b className="text-white">{x.metrica}</b></span>
      {x.hoy && <span className="text-[#9aafc3]">hoy <b className="text-white">{x.hoy}</b></span>}
      {x.meta && <span className="text-[#9aafc3]">→ meta <b className="text-white">{x.meta}</b></span>}
      {x.evaluar_el && <span className="text-[#67c8f3]">evaluar el {fechaCorta(x.evaluar_el)}</span>}
    </div>
  );
}

// Nota por área: por qué tiene esa nota y qué la subiría.
function PuntajeDetalle({ filas }) {
  if (!filas?.length) return null;
  return (
    <Seccion titulo="Nota por área" icon={ClipboardList} extra="el puntaje general es el promedio de estas notas">
      <div className="space-y-3">
        {filas.map((f) => (
          <div key={f.area} className="grid md:grid-cols-[180px_1fr] gap-2 text-xs">
            <div>
              <div className="flex items-center justify-between text-white text-sm"><span>{f.area}</span><b className="tabular-nums">{f.nota}/10</b></div>
              <div className="h-1.5 rounded bg-white/5 mt-1"><div className="h-1.5 rounded" style={{ width: `${(Number(f.nota) || 0) * 10}%`, background: Number(f.nota) >= 7 ? ESTADO.bien : Number(f.nota) >= 5 ? ESTADO.mejorar : ESTADO.alerta }} /></div>
            </div>
            <div>
              <div className="text-[#cfe0f0]">{f.por_que}</div>
              {f.que_la_subiria && <div className="text-[#67c8f3] mt-0.5">Para subirla: <span className="text-[#cfe0f0]">{f.que_la_subiria}</span></div>}
            </div>
          </div>
        ))}
      </div>
    </Seccion>
  );
}

// Este análisis contra el anterior: ¿mejoró la cuenta entre una revisión y otra?
function ComparaAnterior({ a, anterior }) {
  if (!anterior?.metricas || !a?.metricas) return null;
  const m = a.metricas, n = anterior.metricas;
  const filas = [
    ['Puntaje', a.resumen?.puntaje, anterior.resumen?.puntaje, (v) => `${v ?? '—'}/10`, true],
    ['Clics (Ads)', m.clics, n.clics, (v) => Math.round(v ?? 0).toLocaleString('es-CL'), true],
    ['CTR', m.ctr, n.ctr, (v) => pct(v, 1), true],
    ['Costo por clic', m.cpc, n.cpc, clp, false],
    ['Contactos (Ads)', m.conv, n.conv, (v) => (v ?? 0).toLocaleString('es-CL'), true],
    ['Te mostraste en', m.cuota, n.cuota, (v) => pct(v), true],
    ['Perdido por presupuesto', m.perd_presupuesto, n.perd_presupuesto, (v) => pct(v), false],
    ['Visitas a la web', m.ga4?.sesiones, n.ga4?.sesiones, (v) => (v ?? 0).toLocaleString('es-CL'), true],
    ['Contactos en la web', m.ga4?.contactos, n.ga4?.contactos, (v) => (v ?? 0).toLocaleString('es-CL'), true],
    ['Apariciones gratis (SEO)', m.sc?.impr, n.sc?.impr, (v) => (v ?? 0).toLocaleString('es-CL'), true],
  ];
  return (
    <Seccion titulo={`Comparado con el análisis del ${new Date(anterior.created_at).toLocaleDateString('es-CL')}`} icon={History} extra={`cada análisis mide sus últimos ${a.dias} días · verde = mejoró`}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
        {filas.map(([nombre, hoy, antes, f, masEsMejor]) => {
          const d = (Number(hoy) || 0) - (Number(antes) || 0);
          const color = !d ? '#9aafc3' : (d > 0) === masEsMejor ? ESTADO.bien : ESTADO.alerta;
          return (
            <div key={nombre} className="rounded-lg border border-white/10 px-3 py-2">
              <div className="text-[#9aafc3]">{nombre}</div>
              <div className="text-white tabular-nums">{f(antes)} → <b>{f(hoy)}</b></div>
              <div className="tabular-nums" style={{ color }}>{!d ? 'sin cambio' : d > 0 ? '▲ subió' : '▼ bajó'}</div>
            </div>
          );
        })}
      </div>
    </Seccion>
  );
}

function ResultadoAnalisis({ a, p, irACambios, anterior }) {
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
      <ComparaAnterior a={a} anterior={anterior} />
      <PuntajeDetalle filas={r.puntaje_detalle} />
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
                <Medible x={m} />
              </div>
            ))}
          </div>
        </Seccion>
        <Seccion titulo="Lo que va bien" icon={Check}>
          <ul className="space-y-2 text-xs">
            {(r.va_bien || []).map((b) => <li key={b.titulo}><b className="text-white">{b.titulo}</b><div className="text-[#9aafc3]">{b.detalle}</div><Medible x={b} /></li>)}
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
  // El anterior = el análisis más reciente hecho antes del que se está viendo.
  const anterior = actual ? lista.find((x) => x.created_at < actual.created_at) : null;
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
      <Seccion titulo="Cómo usarlo para mejorar semana a semana" icon={History}>
        <ol className="text-xs text-[#cfe0f0] space-y-1 list-decimal pl-5">
          <li><b className="text-white">Analizar</b> y leer la nota por área: dice qué está más débil y qué la subiría.</li>
          <li>Elegir <b className="text-white">1 o 2 cambios</b> (no cinco: si no, no sabrás cuál funcionó), ajustarlos en <b className="text-white">Cambios</b> y aprobarlos.</li>
          <li>Aplicarlos: el script corre solo a las 7:00, o lo ejecutas a mano en Google Ads.</li>
          <li><b className="text-white">Esperar 7 días</b> (14 si hay menos de ~50 clics por semana). Analizar antes da lo mismo: Google no tiene datos nuevos.</li>
          <li>Mirar <b className="text-white">Antes y después</b> de cada cambio en <b className="text-white">Cambios → Aplicado</b>, y volver a analizar: compara solo con el análisis anterior.</li>
        </ol>
        <p className="text-[11px] text-[#5f7891] mt-2">Lo que cambies en la web (páginas, textos, diseño) anótalo con la fecha en Configuración → Notas para la IA: Google Ads no lo registra.</p>
      </Seccion>
      {actual ? <ResultadoAnalisis a={actual} p={p} irACambios={irACambios} anterior={anterior} /> : <Vacio>Aún no hay análisis. Pulsa el botón: cada análisis queda guardado para comparar semana a semana.</Vacio>}
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
