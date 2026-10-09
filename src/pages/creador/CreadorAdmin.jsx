// Panel → Creador: leads del Creador de páginas (/crea-tu-web), sus páginas y la
// configuración (duración, topes, responsable de ventas). Lee el Supabase de
// NexCommit con la sesión del equipo (RLS es_equipo()); lo demás lo escribe el
// backend de Agente-Next.
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, ExternalLink, MessageCircle, Save, Settings, ShieldAlert, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { ErrorBox, Pill, btnGhost, btnPrimary, card, inputClass, labelClass } from '../tareas/ui';

const ESTADOS = {
  registrado: { label: 'Registrado', color: '#9aafc3' },
  verificado: { label: 'Verificado', color: '#67c8f3' },
  con_pagina: { label: 'Con página', color: '#a78bfa' },
  contactado: { label: 'Contactado', color: '#fbbf24' },
  convertido: { label: 'Convertido', color: '#34d399' },
  descartado: { label: 'Descartado', color: '#f87171' },
};

const SITIO = 'https://www.nexcommit.com';

// ─── Consumo de IA ───────────────────────────────────────────────────────────
const consumoVacio = () => ({ llamadas: 0, generacion: 0, edicion: 0, descartada: 0, tokensIn: 0, tokensOut: 0, tokensCache: 0, costo: 0, sinTarifa: 0 });

function sumarConsumo(acc, c) {
  acc.llamadas += 1;
  acc[c.tipo] = (acc[c.tipo] || 0) + 1;
  acc.tokensIn += c.tokens_in || 0;
  acc.tokensOut += c.tokens_out || 0;
  acc.tokensCache += c.tokens_cache || 0;
  if (c.costo_usd == null) acc.sinTarifa += 1;
  else acc.costo += Number(c.costo_usd);
  return acc;
}

const fmtTokens = (n) => Math.round(n).toLocaleString('es-CL');
const fmtUsd = (n) => {
  const dec = n > 0 && n < 1 ? 4 : 2;
  return `US$ ${n.toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
};
const fmtClp = (usd, tasa) => {
  const v = usd * tasa;
  return `$${v.toLocaleString('es-CL', { maximumFractionDigits: v > 0 && v < 10 ? 1 : 0 })} CLP`;
};

async function q(promesa) {
  const { data, error } = await promesa;
  if (error) throw error;
  return data;
}

function useCreador() {
  return useQuery({
    queryKey: ['creador'],
    queryFn: async () => {
      const [config, leads, equipo] = await Promise.all([
        q(supabase.from('creador_config').select('*').eq('id', 1).maybeSingle()),
        q(supabase.from('creador_leads')
          .select('id, nombre, empresa, email, telefono, acepta_marketing, verificado_at, estado, notas, anonimizado_at, created_at, pagina:creador_paginas(*)')
          .order('created_at', { ascending: false })
          .limit(300)),
        q(supabase.from('equipo').select('id, nombre, email').eq('activo', true).order('nombre')),
      ]);
      // Funciones bloqueadas que cada cliente intentó abrir en /mi-tienda (señal
      // de venta). Si la tabla aún no existe (migración pendiente), se omite.
      const { data: eventos } = await supabase.from('creador_eventos').select('lead_id, detalle, created_at')
        .order('created_at', { ascending: false }).limit(1000);
      const intereses = {};
      for (const ev of eventos ?? []) {
        const lista = (intereses[ev.lead_id] ||= []);
        if (!lista.includes(ev.detalle)) lista.push(ev.detalle);
      }
      // Tokens y costo de cada llamada a la IA (migración 20261010160000; si
      // aún no corre, el consumo queda vacío).
      const { data: consumo } = await supabase.from('creador_consumo')
        .select('pagina_id, slug, tipo, modelo, tokens_in, tokens_out, tokens_cache, costo_usd, created_at')
        .order('created_at', { ascending: false }).limit(10000);
      const porPagina = {};
      for (const c of consumo ?? []) {
        if (c.pagina_id) sumarConsumo((porPagina[c.pagina_id] ||= consumoVacio()), c);
      }
      // Moderación (migración 20261010170000; si aún no corre, se omite):
      // advertencias, bloqueo y los intentos rechazados de cada lead.
      const [{ data: moderacion }, { data: infracciones }] = await Promise.all([
        supabase.from('creador_leads').select('id, advertencias, bloqueado_at, bloqueo_motivo').gt('advertencias', 0).limit(1000),
        supabase.from('creador_infracciones').select('lead_id, origen, categorias, extracto, created_at')
          .order('created_at', { ascending: false }).limit(1000),
      ]);
      const modPorLead = Object.fromEntries((moderacion ?? []).map((m) => [m.id, { ...m, intentos: [] }]));
      for (const i of infracciones ?? []) modPorLead[i.lead_id]?.intentos.push(i);
      return {
        config,
        equipo,
        consumo: consumo ?? null,
        leads: leads.map((l) => {
          const pagina = Array.isArray(l.pagina) ? l.pagina[0] || null : l.pagina;
          return {
            ...l, pagina, intereses: intereses[l.id] || [], consumo: pagina ? porPagina[pagina.id] || null : null,
            moderacion: modPorLead[l.id] || null,
          };
        }),
      };
    },
    refetchInterval: 60_000,
  });
}

function vence(expira) {
  const ms = new Date(expira).getTime() - Date.now();
  if (ms <= 0) return { texto: 'Vencida', color: '#f87171' };
  const h = Math.floor(ms / 3_600_000);
  return { texto: h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : `${h} h`, color: h < 24 ? '#fbbf24' : '#34d399' };
}

function Config({ config, equipo }) {
  const qc = useQueryClient();
  const [f, setF] = useState(() => ({
    activo: config?.activo ?? true,
    duracion_dias: config?.duracion_dias ?? 5,
    tope_diario: config?.tope_diario ?? 30,
    ediciones: config?.ediciones ?? 5,
    ediciones_manuales: config?.ediciones_manuales ?? 5,
    productos_max: config?.productos_max ?? 10,
    max_caracteres: config?.max_caracteres ?? 300,
    responsable_id: config?.responsable_id ?? '',
    usd_clp: config?.usd_clp ?? 950,
  }));
  const guardar = useMutation({
    mutationFn: () => q(supabase.from('creador_config').update({
      activo: f.activo,
      duracion_dias: Number(f.duracion_dias),
      tope_diario: Number(f.tope_diario),
      ediciones: Number(f.ediciones),
      ...(config && 'ediciones_manuales' in config ? { ediciones_manuales: Number(f.ediciones_manuales) } : {}),
      ...(config && 'productos_max' in config ? { productos_max: Number(f.productos_max) } : {}),
      max_caracteres: Number(f.max_caracteres),
      ...(config && 'usd_clp' in config ? { usd_clp: Number(f.usd_clp) } : {}),
      responsable_id: f.responsable_id || null,
    }).eq('id', 1)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['creador'] }),
  });
  const num = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className={`${card} p-4 md:p-5`}>
      <h3 className="text-white font-medium flex items-center gap-2 mb-4"><Settings className="w-4 h-4 text-[#67c8f3]" /> Configuración</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
        <label className="flex items-center gap-2 text-sm text-white col-span-2 md:col-span-1">
          <input type="checkbox" checked={f.activo} onChange={(e) => setF((p) => ({ ...p, activo: e.target.checked }))} className="w-4 h-4 accent-[#248bde]" />
          Creador abierto
        </label>
        <div><label className={labelClass}>Duración (días)</label><input type="number" min={1} max={60} value={f.duracion_dias} onChange={num('duracion_dias')} className={inputClass} /></div>
        <div><label className={labelClass}>Páginas por día</label><input type="number" min={0} max={1000} value={f.tope_diario} onChange={num('tope_diario')} className={inputClass} /></div>
        <div><label className={labelClass}>Pedidos a la IA</label><input type="number" min={0} max={50} value={f.ediciones} onChange={num('ediciones')} className={inputClass} /></div>
        <div><label className={labelClass}>Ediciones manuales</label><input type="number" min={0} max={100} value={f.ediciones_manuales} onChange={num('ediciones_manuales')} className={inputClass} /></div>
        <div><label className={labelClass}>Productos por tienda</label><input type="number" min={1} max={50} value={f.productos_max} onChange={num('productos_max')} className={inputClass} /></div>
        <div><label className={labelClass}>Caracteres por mensaje</label><input type="number" min={50} max={2000} value={f.max_caracteres} onChange={num('max_caracteres')} className={inputClass} /></div>
        <div><label className={labelClass}>Dólar (CLP)</label><input type="number" min={1} max={99999} step="0.01" value={f.usd_clp} onChange={num('usd_clp')} className={inputClass} /></div>
        <div>
          <label className={labelClass}>Responsable de ventas</label>
          <select value={f.responsable_id} onChange={num('responsable_id')} className={inputClass}>
            <option value="">Sin asignar</option>
            {equipo.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-4">
        <button type="button" className={btnPrimary} onClick={() => guardar.mutate()} disabled={guardar.isPending}>
          <Save className="w-4 h-4" /> {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </button>
        {guardar.isSuccess && <span className="text-sm text-emerald-400">Guardado.</span>}
        <p className="text-xs text-[#9aafc3] max-w-xl">
          La duración y los topes se aplican a las páginas nuevas (una edición manual = una vez que el cliente presiona «Publicar cambios»).
          El responsable recibe la tarea, el WhatsApp y el correo de cada lead.
        </p>
      </div>
      <ErrorBox error={guardar.error} />
    </div>
  );
}

function ConsumoIA({ consumo, tasa }) {
  const r = useMemo(() => {
    const ahora = new Date();
    const hoy = ahora.toDateString();
    const mes = `${ahora.getFullYear()}-${ahora.getMonth()}`;
    const total = consumoVacio();
    const delDia = consumoVacio();
    const delMes = consumoVacio();
    const paginas = {};
    const modelos = new Set();
    for (const c of consumo) {
      const f = new Date(c.created_at);
      sumarConsumo(total, c);
      if (f.toDateString() === hoy) sumarConsumo(delDia, c);
      if (`${f.getFullYear()}-${f.getMonth()}` === mes) sumarConsumo(delMes, c);
      if (c.modelo) modelos.add(c.modelo);
      const k = c.pagina_id || `slug:${c.slug || '—'}`;
      const p = (paginas[k] ||= { slug: c.slug, viva: !!c.pagina_id, ...consumoVacio() });
      sumarConsumo(p, c);
    }
    const lista = Object.values(paginas);
    const conGeneracion = lista.filter((p) => p.generacion > 0);
    const prom = (arr, campo) => (arr.length ? arr.reduce((a, p) => a + p[campo], 0) / arr.length : 0);
    // Promedio por tipo de llamada (generación vs. edición por chat).
    const porTipo = (tipo) => {
      const filas = consumo.filter((c) => c.tipo === tipo);
      const acc = filas.reduce((a, c) => sumarConsumo(a, c), consumoVacio());
      return { n: filas.length, tokens: filas.length ? (acc.tokensIn + acc.tokensOut) / filas.length : 0, costo: filas.length ? acc.costo / filas.length : 0 };
    };
    return {
      total, delDia, delMes, modelos: [...modelos],
      paginas: conGeneracion.length,
      promPagina: { tokens: prom(conGeneracion, 'tokensIn') + prom(conGeneracion, 'tokensOut'), costo: prom(conGeneracion, 'costo') },
      generacion: porTipo('generacion'),
      edicion: porTipo('edicion'),
      top: [...lista].sort((a, b) => b.costo - a.costo).slice(0, 5),
    };
  }, [consumo]);

  const tile = (titulo, c) => (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-xs text-[#9aafc3]">{titulo}</div>
      <div className="text-white text-xl font-semibold mt-1">{fmtUsd(c.costo)}</div>
      <div className="text-[11px] text-[#9aafc3] mt-0.5">≈ {fmtClp(c.costo, tasa)}</div>
      <div className="text-[11px] text-[#5f7891] mt-1">
        {fmtTokens(c.tokensIn + c.tokensOut)} tokens · {c.llamadas} {c.llamadas === 1 ? 'llamada' : 'llamadas'}
      </div>
    </div>
  );

  return (
    <div className={`${card} p-4 md:p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h3 className="text-white font-medium flex items-center gap-2"><Coins className="w-4 h-4 text-[#fbbf24]" /> Consumo de IA</h3>
        <span className="text-[11px] text-[#5f7891]">
          {r.modelos.length ? `Modelo: ${r.modelos.join(', ')}` : 'Sin llamadas registradas'} · 1 USD = ${Number(tasa).toLocaleString('es-CL')} CLP
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tile('Hoy', r.delDia)}
        {tile('Este mes', r.delMes)}
        {tile('Histórico', r.total)}
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
          <div className="text-xs text-[#9aafc3]">Promedio por página</div>
          <div className="text-white text-xl font-semibold mt-1">{fmtUsd(r.promPagina.costo)}</div>
          <div className="text-[11px] text-[#9aafc3] mt-0.5">≈ {fmtClp(r.promPagina.costo, tasa)}</div>
          <div className="text-[11px] text-[#5f7891] mt-1">{fmtTokens(r.promPagina.tokens)} tokens · {r.paginas} páginas</div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3 mt-3 text-xs">
        <div className="rounded-lg border border-white/10 px-4 py-3 text-[#cfe0f0] space-y-1">
          <div>
            <span className="text-[#9aafc3]">Crear página:</span> {fmtTokens(r.generacion.tokens)} tokens · {fmtUsd(r.generacion.costo)} promedio
            <span className="text-[#5f7891]"> ({r.generacion.n})</span>
          </div>
          <div>
            <span className="text-[#9aafc3]">Edición por chat:</span> {fmtTokens(r.edicion.tokens)} tokens · {fmtUsd(r.edicion.costo)} promedio
            <span className="text-[#5f7891]"> ({r.edicion.n})</span>
          </div>
          <div className="text-[#9aafc3]">
            Entrada {fmtTokens(r.total.tokensIn)} ({fmtTokens(r.total.tokensCache)} en caché) · Salida {fmtTokens(r.total.tokensOut)}
          </div>
          {r.total.descartada > 0 && <div className="text-[#fbbf24]">{r.total.descartada} llamadas descartadas (se pagaron pero no se guardaron).</div>}
          {r.total.sinTarifa > 0 && <div className="text-[#f87171]">{r.total.sinTarifa} llamadas sin tarifa cargada: su costo no está sumado.</div>}
        </div>
        <div className="rounded-lg border border-white/10 px-4 py-3">
          <div className="text-[#9aafc3] mb-1">Páginas que más consumen</div>
          {r.top.length === 0 && <div className="text-[#5f7891]">Todavía no hay consumo.</div>}
          {r.top.map((p, i) => (
            <div key={i} className="flex justify-between gap-3 text-[#cfe0f0]">
              <span className="truncate">/{p.slug || '—'}{!p.viva && <span className="text-[#5f7891]"> (borrada)</span>}</span>
              <span className="shrink-0">{fmtTokens(p.tokensIn + p.tokensOut)} tk · {fmtUsd(p.costo)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Advertencias y bloqueo por contenido prohibido (2 advertencias, a la 3.ª se
// bloquea). Desbloquear deja las advertencias en 0 y reactiva la página.
function Moderacion({ lead }) {
  const qc = useQueryClient();
  const [ver, setVer] = useState(false);
  const m = lead.moderacion;
  const desbloquear = useMutation({
    mutationFn: () => q(supabase.rpc('creador_desbloquear', { p_lead: lead.id })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['creador'] }),
  });
  return (
    <div className="mt-2 text-[11px]">
      <div className="flex flex-wrap items-center gap-1">
        {m.bloqueado_at
          ? <Pill color="#f87171"><ShieldAlert className="w-3 h-3 inline -mt-0.5" /> Bloqueado</Pill>
          : <Pill color="#fbbf24">{m.advertencias}/2 advertencias</Pill>}
        {m.intentos.length > 0 && (
          <button type="button" className="text-[#9aafc3] hover:text-white underline" onClick={() => setVer((v) => !v)}>
            {ver ? 'Ocultar intentos' : `Ver ${m.intentos.length} intento${m.intentos.length === 1 ? '' : 's'}`}
          </button>
        )}
        {m.bloqueado_at && (
          <button
            type="button"
            className="px-2 py-0.5 rounded border border-white/10 text-[#9aafc3] hover:text-white"
            onClick={() => window.confirm(`¿Desbloquear a ${lead.empresa}? Sus advertencias vuelven a 0 y su página se reactiva.`) && desbloquear.mutate()}
            disabled={desbloquear.isPending}
          >
            Desbloquear
          </button>
        )}
      </div>
      {m.bloqueado_at && (
        <div className="text-[#f87171] mt-1">
          {new Date(m.bloqueado_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
          {m.bloqueo_motivo ? ` · ${m.bloqueo_motivo}` : ''}
        </div>
      )}
      {ver && (
        <ul className="mt-1 space-y-1 text-[#cfe0f0]">
          {m.intentos.map((i, k) => (
            <li key={k} className="rounded bg-white/[0.03] px-2 py-1">
              <span className="text-[#9aafc3]">{new Date(i.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })} · {i.origen} · {i.categorias.join(', ')}</span>
              {i.extracto && <div className="break-words line-clamp-3">{i.extracto}</div>}
            </li>
          ))}
        </ul>
      )}
      <ErrorBox error={desbloquear.error} />
    </div>
  );
}

function FilaLead({ lead, tasa }) {
  const qc = useQueryClient();
  const [notas, setNotas] = useState(lead.notas || '');
  const p = lead.pagina;
  const v = p ? vence(p.expira_at) : null;

  const actualizar = useMutation({
    mutationFn: (cambios) => q(supabase.from('creador_leads').update(cambios).eq('id', lead.id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['creador'] }),
  });
  const pagina = useMutation({
    mutationFn: (cambios) => q(supabase.from('creador_paginas').update(cambios).eq('id', p.id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['creador'] }),
  });

  const extender = (dias) => {
    const base = Math.max(Date.now(), new Date(p.expira_at).getTime());
    pagina.mutate({ expira_at: new Date(base + dias * 86_400_000).toISOString() });
  };

  const wa = lead.telefono
    ? `https://wa.me/${lead.telefono}?text=${encodeURIComponent(`Hola ${lead.nombre?.split(' ')[0] || ''}! Soy de NexCommit. Vi que creaste tu página ${p ? `nexcommit.com/${p.slug}` : 'de prueba'} y quería contarte cómo dejarla permanente.`)}`
    : null;

  return (
    <tr className="border-t border-white/5 align-top">
      <td className="px-3 py-3">
        <div className="text-white font-medium">{lead.empresa}</div>
        <div className="text-xs text-[#9aafc3]">{lead.anonimizado_at ? 'Anonimizado' : lead.nombre}</div>
        <div className="text-[11px] text-[#5f7891] mt-1">{new Date(lead.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</div>
        {p && (
          <div className="mt-1">
            {p.tipo === 'ecommerce' ? <Pill color="#c4b5fd">Tienda online</Pill> : <Pill color="#67c8f3">Landing</Pill>}
          </div>
        )}
        {lead.moderacion && <Moderacion lead={lead} />}
        {lead.intereses.length > 0 && (
          <div className="mt-2 text-[11px] text-[#fbbf24]" title="Funciones bloqueadas que intentó abrir en su panel">
            🔥 Quiere: {lead.intereses.slice(0, 4).join(', ')}{lead.intereses.length > 4 ? ` y ${lead.intereses.length - 4} más` : ''}
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-xs">
        {lead.email && <div className="text-[#cfe0f0] break-all">{lead.email}</div>}
        {lead.telefono && <div className="text-[#9aafc3]">+{lead.telefono}</div>}
        {lead.acepta_marketing && <div className="mt-1"><Pill color="#34d399">Acepta ofertas</Pill></div>}
      </td>
      <td className="px-3 py-3 text-xs">
        {p ? (
          <>
            <a href={`${SITIO}/${p.slug}`} target="_blank" rel="noopener noreferrer" className="text-[#67c8f3] hover:underline inline-flex items-center gap-1">
              /{p.slug} <ExternalLink className="w-3 h-3" />
            </a>
            <div className="mt-1 flex flex-wrap gap-1">
              <Pill color={v.color}>{v.texto}</Pill>
              {p.estado === 'suspendida' && <Pill color="#f87171">Suspendida</Pill>}
            </div>
            <div className="text-[#9aafc3] mt-1">
              IA {p.ediciones_usadas}/{p.ediciones_max}
              {typeof p.ediciones_manuales_max === 'number' && <> · manual {p.ediciones_manuales_usadas}/{p.ediciones_manuales_max}</>}
              {' '}· {p.visitas} visitas
            </div>
            {lead.consumo && (
              <div
                className="text-[#fbbf24] mt-1"
                title={[
                  `Entrada: ${fmtTokens(lead.consumo.tokensIn)} tokens (${fmtTokens(lead.consumo.tokensCache)} en caché)`,
                  `Salida: ${fmtTokens(lead.consumo.tokensOut)} tokens`,
                  `Llamadas: ${lead.consumo.generacion} creación, ${lead.consumo.edicion} edición${lead.consumo.descartada ? `, ${lead.consumo.descartada} descartada` : ''}`,
                  lead.consumo.sinTarifa ? `${lead.consumo.sinTarifa} sin tarifa (costo no sumado)` : '',
                ].filter(Boolean).join('\n')}
              >
                IA: {fmtTokens(lead.consumo.tokensIn + lead.consumo.tokensOut)} tokens · {fmtUsd(lead.consumo.costo)} · ≈ {fmtClp(lead.consumo.costo, tasa)}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              <button type="button" className="text-[11px] px-2 py-1 rounded border border-white/10 text-[#9aafc3] hover:text-white" onClick={() => extender(3)} disabled={pagina.isPending}>+3 días</button>
              <button
                type="button"
                className="text-[11px] px-2 py-1 rounded border border-white/10 text-[#9aafc3] hover:text-white"
                title="Regala 3 pedidos a la IA y 3 ediciones manuales más"
                onClick={() => pagina.mutate({
                  ediciones_max: p.ediciones_max + 3,
                  ...(typeof p.ediciones_manuales_max === 'number' ? { ediciones_manuales_max: p.ediciones_manuales_max + 3 } : {}),
                })}
                disabled={pagina.isPending}
              >
                +3 ediciones
              </button>
              <button
                type="button"
                className="text-[11px] px-2 py-1 rounded border border-white/10 text-[#9aafc3] hover:text-white"
                onClick={() => pagina.mutate({ estado: p.estado === 'activa' ? 'suspendida' : 'activa' })}
                disabled={pagina.isPending}
              >
                {p.estado === 'activa' ? 'Suspender' : 'Reactivar'}
              </button>
            </div>
          </>
        ) : (
          <span className="text-[#5f7891]">{lead.verificado_at ? 'Verificado, sin página' : 'Sin verificar'}</span>
        )}
      </td>
      <td className="px-3 py-3">
        <select
          value={lead.estado}
          onChange={(e) => actualizar.mutate({ estado: e.target.value })}
          className={`${inputClass} !py-1.5 !text-xs`}
          style={{ color: ESTADOS[lead.estado]?.color }}
        >
          {Object.entries(ESTADOS).map(([k, e]) => <option key={k} value={k}>{e.label}</option>)}
        </select>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          onBlur={() => notas !== (lead.notas || '') && actualizar.mutate({ notas: notas.trim() || null })}
          placeholder="Notas…"
          rows={2}
          className={`${inputClass} !text-xs mt-2`}
        />
        <ErrorBox error={actualizar.error || pagina.error} />
      </td>
      <td className="px-3 py-3">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={`${btnGhost} !px-2.5 !py-1.5 !text-xs`}>
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp
          </a>
        )}
      </td>
    </tr>
  );
}

export default function CreadorAdmin() {
  const { data, isLoading, error } = useCreador();
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const leads = useMemo(() => data?.leads ?? [], [data]);
  const hoy = new Date().toDateString();
  const stats = useMemo(() => ({
    hoy: leads.filter((l) => l.pagina && new Date(l.pagina.publicada_at).toDateString() === hoy).length,
    activas: leads.filter((l) => l.pagina && new Date(l.pagina.expira_at) > new Date() && l.pagina.estado === 'activa').length,
    total: leads.length,
    conPagina: leads.filter((l) => l.pagina).length,
    convertidos: leads.filter((l) => l.estado === 'convertido').length,
  }), [leads, hoy]);

  const visibles = leads.filter((l) => {
    if (filtro === 'activas' && !(l.pagina && new Date(l.pagina.expira_at) > new Date())) return false;
    if (filtro !== 'todos' && filtro !== 'activas' && l.estado !== filtro) return false;
    const t = busqueda.trim().toLowerCase();
    if (!t) return true;
    return [l.empresa, l.nombre, l.email, l.telefono, l.pagina?.slug].some((x) => String(x || '').toLowerCase().includes(t));
  });

  return (
    <div className="max-w-7xl space-y-5">
      <div>
        <h2 className="text-white font-medium flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#67c8f3]" /> Creador de páginas</h2>
        <p className="text-sm text-[#9aafc3] max-w-3xl">
          Leads de <a href={`${SITIO}/crea-tu-web`} target="_blank" rel="noopener noreferrer" className="text-[#67c8f3] hover:underline">/crea-tu-web</a>.
          Cada página publicada crea una tarea en «Ventas – Creador web». Datos personales: úsalos solo para contactarlos por su página
          (las ofertas generales, solo a quienes marcaron «Acepta ofertas»).
        </p>
      </div>

      <ErrorBox error={error} />
      {isLoading && <p className="text-sm text-[#9aafc3]">Cargando…</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ['Páginas hoy', `${stats.hoy} / ${data.config?.tope_diario ?? '—'}`],
              ['Activas', stats.activas],
              ['Leads', stats.total],
              ['Con página', stats.conPagina],
              ['Convertidos', stats.convertidos],
            ].map(([k, v]) => (
              <div key={k} className={`${card} px-4 py-3`}>
                <div className="text-xs text-[#9aafc3]">{k}</div>
                <div className="text-white text-xl font-semibold mt-1">{v}</div>
              </div>
            ))}
          </div>

          {data.consumo && <ConsumoIA consumo={data.consumo} tasa={Number(data.config?.usd_clp) || 950} />}

          <Config key={data.config?.updated_at} config={data.config} equipo={data.equipo} />

          <div className={`${card} overflow-hidden`}>
            <div className="flex flex-wrap items-center gap-2 p-3 border-b border-white/10">
              {[['todos', 'Todos'], ['activas', 'Página activa'], ...Object.entries(ESTADOS).map(([k, e]) => [k, e.label])].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFiltro(k)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${filtro === k ? 'border-[#67c8f3] text-white bg-[#1a3050]' : 'border-white/10 text-[#9aafc3] hover:text-white'}`}
                >
                  {label}
                </button>
              ))}
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar empresa, correo, link…"
                className={`${inputClass} !w-full md:!w-64 md:ml-auto !py-1.5`}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="text-left text-xs text-[#9aafc3]">
                    <th className="px-3 py-2 font-medium">Empresa</th>
                    <th className="px-3 py-2 font-medium">Contacto</th>
                    <th className="px-3 py-2 font-medium">Página</th>
                    <th className="px-3 py-2 font-medium w-56">Seguimiento</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((l) => <FilaLead key={l.id} lead={l} tasa={Number(data.config?.usd_clp) || 950} />)}
                </tbody>
              </table>
              {visibles.length === 0 && <p className="text-sm text-[#9aafc3] text-center py-8">No hay leads con este filtro.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
