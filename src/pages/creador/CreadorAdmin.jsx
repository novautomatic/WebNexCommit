// Panel → Creador: leads del Creador de páginas (/crea-tu-web), sus páginas y la
// configuración (duración, topes, responsable de ventas). Lee el Supabase de
// NexCommit con la sesión del equipo (RLS es_equipo()); lo demás lo escribe el
// backend de Agente-Next.
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, MessageCircle, Save, Settings, Sparkles } from 'lucide-react';
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
          .select('*, pagina:creador_paginas(id, slug, expira_at, publicada_at, ediciones_usadas, ediciones_max, visitas, estado, logo_url, contenido)')
          .order('created_at', { ascending: false })
          .limit(300)),
        q(supabase.from('equipo').select('id, nombre, email').eq('activo', true).order('nombre')),
      ]);
      return {
        config,
        equipo,
        leads: leads.map((l) => ({ ...l, pagina: Array.isArray(l.pagina) ? l.pagina[0] || null : l.pagina })),
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
    max_caracteres: config?.max_caracteres ?? 300,
    responsable_id: config?.responsable_id ?? '',
  }));
  const guardar = useMutation({
    mutationFn: () => q(supabase.from('creador_config').update({
      activo: f.activo,
      duracion_dias: Number(f.duracion_dias),
      tope_diario: Number(f.tope_diario),
      ediciones: Number(f.ediciones),
      max_caracteres: Number(f.max_caracteres),
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
        <div><label className={labelClass}>Ediciones por chat</label><input type="number" min={0} max={50} value={f.ediciones} onChange={num('ediciones')} className={inputClass} /></div>
        <div><label className={labelClass}>Caracteres por mensaje</label><input type="number" min={50} max={2000} value={f.max_caracteres} onChange={num('max_caracteres')} className={inputClass} /></div>
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
          La duración y las ediciones se aplican a las páginas nuevas. El responsable recibe la tarea, el WhatsApp y el correo de cada lead.
        </p>
      </div>
      <ErrorBox error={guardar.error} />
    </div>
  );
}

function FilaLead({ lead }) {
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
            <div className="text-[#9aafc3] mt-1">{p.ediciones_usadas}/{p.ediciones_max} ediciones · {p.visitas} visitas</div>
            <div className="mt-2 flex flex-wrap gap-1">
              <button type="button" className="text-[11px] px-2 py-1 rounded border border-white/10 text-[#9aafc3] hover:text-white" onClick={() => extender(3)} disabled={pagina.isPending}>+3 días</button>
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
                  {visibles.map((l) => <FilaLead key={l.id} lead={l} />)}
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
