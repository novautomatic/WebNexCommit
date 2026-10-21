// Panel → Contactos web: solicitudes del formulario «Cotiza en 1 minuto».
// Lee contactos_web con la sesión del equipo (RLS es_equipo()); solo se
// cambian estado y notas. Las escribe el back (POST /nexcommit/contacto).
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { ErrorBox, Pill, btnGhost, card, inputClass } from '../tareas/ui';
import { SERVICIOS_FORM } from '../../data/PRECIOS';

const ESTADOS = {
  nuevo: { label: 'Nuevo', color: '#67c8f3' },
  contactado: { label: 'Contactado', color: '#fbbf24' },
  cotizado: { label: 'Cotizado', color: '#a78bfa' },
  ganado: { label: 'Ganado', color: '#34d399' },
  perdido: { label: 'Perdido', color: '#f87171' },
  descartado: { label: 'Descartado', color: '#9aafc3' },
};
const SERVICIO = Object.fromEntries(SERVICIOS_FORM.map((s) => [s.id, s.label]));

function useContactos() {
  return useQuery({
    queryKey: ['contactos-web'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contactos_web').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      // Más de 8 h sin contactar: prometimos responder el mismo día hábil.
      const ahora = Date.now();
      return data.map((c) => ({ ...c, atrasado: c.estado === 'nuevo' && ahora - new Date(c.created_at).getTime() > 8 * 36e5 }));
    },
    refetchInterval: 60_000,
  });
}

function Fila({ c }) {
  const qc = useQueryClient();
  const [notas, setNotas] = useState(c.notas || '');
  const guardar = useMutation({
    mutationFn: async (cambios) => {
      const { error } = await supabase.from('contactos_web').update(cambios).eq('id', c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contactos-web'] }),
  });
  const nombre = c.nombre.split(' ')[0];
  const wa = c.telefono
    ? `https://wa.me/${c.telefono}?text=${encodeURIComponent(`Hola ${nombre}! Soy de NexCommit, recibimos tu solicitud de cotización (${SERVICIO[c.servicio] || 'tu proyecto'}).`)}`
    : null;

  return (
    <tr className="border-t border-white/5 align-top">
      <td className="px-3 py-3">
        <div className="text-white font-medium">{c.nombre}</div>
        <div className="text-[11px] text-[#5f7891] mt-1">{new Date(c.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {c.desde_ads && <Pill color="#34d399">Google Ads</Pill>}
          {c.atrasado &&<Pill color="#f87171">Sin responder</Pill>}
        </div>
      </td>
      <td className="px-3 py-3 text-xs">
        <div className="text-[#cfe0f0] break-all">{c.email}</div>
        {c.telefono && <div className="text-[#9aafc3]">+{c.telefono}</div>}
      </td>
      <td className="px-3 py-3 text-xs max-w-[22rem]">
        <div className="text-white">{SERVICIO[c.servicio] || c.servicio}</div>
        {c.mensaje && <p className="text-[#9aafc3] mt-1 whitespace-pre-wrap">{c.mensaje}</p>}
        <div className="text-[11px] text-[#5f7891] mt-1">Desde {c.pagina || '/'}</div>
      </td>
      <td className="px-3 py-3">
        <select
          value={c.estado}
          onChange={(e) => guardar.mutate({ estado: e.target.value })}
          className={`${inputClass} !py-1.5 !text-xs`}
          style={{ color: ESTADOS[c.estado]?.color }}
        >
          {Object.entries(ESTADOS).map(([k, e]) => <option key={k} value={k}>{e.label}</option>)}
        </select>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          onBlur={() => notas !== (c.notas || '') && guardar.mutate({ notas: notas.trim() || null })}
          placeholder="Notas…"
          rows={2}
          className={`${inputClass} !text-xs mt-2`}
        />
        <ErrorBox error={guardar.error} />
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1.5">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={`${btnGhost} !px-2.5 !py-1.5 !text-xs`}>
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp
            </a>
          )}
          <a href={`mailto:${c.email}?subject=${encodeURIComponent('Tu cotización · NexCommit')}`} className={`${btnGhost} !px-2.5 !py-1.5 !text-xs`}>
            <Mail className="w-3.5 h-3.5" /> Correo
          </a>
        </div>
      </td>
    </tr>
  );
}

export default function ContactosWebAdmin() {
  const { data, isLoading, error } = useContactos();
  const [filtro, setFiltro] = useState('abiertos');
  const lista = useMemo(() => (data ?? []).filter((c) => {
    if (filtro === 'abiertos') return ['nuevo', 'contactado', 'cotizado'].includes(c.estado);
    if (filtro === 'ads') return c.desde_ads;
    return true;
  }), [data, filtro]);
  const nuevos = (data ?? []).filter((c) => c.estado === 'nuevo').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Contactos web</h2>
          <p className="text-sm text-[#9aafc3]">
            Solicitudes del formulario «Cotiza en 1 minuto». Prometimos responder el mismo día hábil · {nuevos} sin contactar.
            Se borran solas a los 12 meses, salvo las ganadas (Ley 21.719).
          </p>
        </div>
        <div className="flex gap-1">
          {[['abiertos', 'Abiertos'], ['ads', 'De Google Ads'], ['todos', 'Todos']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFiltro(k)}
              className={`text-xs px-3 py-1.5 rounded-full border ${filtro === k ? 'border-[#67c8f3] text-white' : 'border-white/10 text-[#9aafc3]'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <ErrorBox error={error} />
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-[#5f7891]">
              <th className="px-3 py-2">Persona</th>
              <th className="px-3 py-2">Contacto</th>
              <th className="px-3 py-2">Qué necesita</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => <Fila key={c.id} c={c} />)}
          </tbody>
        </table>
        {isLoading && <p className="p-4 text-sm text-[#9aafc3]">Cargando…</p>}
        {!isLoading && !lista.length && <p className="p-4 text-sm text-[#9aafc3]">No hay solicitudes en esta vista.</p>}
      </div>
    </div>
  );
}
