// Data layer for the NexCommit task system (tables in supabase/migrations/20261007120000_sistema_tareas.sql).
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

export const ESTADOS = [
  { id: 'pendiente', label: 'Pendiente', color: '#9aafc3' },
  { id: 'en_progreso', label: 'En progreso', color: '#67c8f3' },
  { id: 'en_revision', label: 'En revisión', color: '#a78bfa' },
  { id: 'bloqueada', label: 'Bloqueada', color: '#f87171' },
  { id: 'completada', label: 'Completada', color: '#34d399' },
  { id: 'cancelada', label: 'Cancelada', color: '#64748b' },
];
export const ESTADO = Object.fromEntries(ESTADOS.map((e) => [e.id, e]));

export const PRIORIDADES = [
  { id: 'urgente', label: 'Urgente', color: '#f87171', peso: 0 },
  { id: 'alta', label: 'Alta', color: '#f59e0b', peso: 1 },
  { id: 'media', label: 'Media', color: '#67c8f3', peso: 2 },
  { id: 'baja', label: 'Baja', color: '#64748b', peso: 3 },
];
export const PRIORIDAD = Object.fromEntries(PRIORIDADES.map((p) => [p.id, p]));

const CERRADAS = new Set(['completada', 'cancelada']);
export const estaAbierta = (t) => !CERRADAS.has(t.estado);

export function hoyISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function ahoraMs() {
  return Date.now();
}

export function enDiasISO(dias) {
  return new Date(ahoraMs() + dias * 86400000).toISOString().slice(0, 10);
}

export function estaVencida(t) {
  return estaAbierta(t) && t.fecha_limite && t.fecha_limite < hoyISO();
}

export function formatearFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
}

async function unwrap(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

export function useMiEquipoId() {
  return useQuery({
    queryKey: ['tareas', 'yo'],
    queryFn: () => unwrap(supabase.rpc('mi_equipo_id')),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEquipo() {
  return useQuery({
    queryKey: ['tareas', 'equipo'],
    queryFn: () => unwrap(supabase.from('equipo').select('*').order('nombre')),
  });
}

export function useProyectos() {
  return useQuery({
    queryKey: ['tareas', 'proyectos'],
    queryFn: () => unwrap(supabase.from('proyectos').select('*').order('nombre')),
  });
}

export function useTareasLista() {
  return useQuery({
    queryKey: ['tareas', 'lista'],
    queryFn: () => unwrap(supabase.from('tareas').select('*').order('orden', { ascending: true })),
  });
}

export function useDetalleTarea(tareaId) {
  return useQuery({
    queryKey: ['tareas', 'detalle', tareaId],
    enabled: Boolean(tareaId),
    queryFn: async () => {
      // Refresh WhatsApp delivery status before reading it (best effort).
      await supabase.rpc('procesar_avisos_whatsapp');
      const [comentarios, historial, avisos] = await Promise.all([
        unwrap(supabase.from('tarea_comentarios').select('*').eq('tarea_id', tareaId).order('created_at')),
        unwrap(supabase.from('tarea_historial').select('*').eq('tarea_id', tareaId).order('created_at', { ascending: false })),
        unwrap(supabase.from('avisos_whatsapp').select('*').eq('tarea_id', tareaId).order('created_at', { ascending: false })),
      ]);
      return { comentarios, historial, avisos };
    },
  });
}

// Keeps the board live: any change by a teammate refreshes the cached lists.
export function useTareasRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const canal = supabase
      .channel('tareas-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas' }, () =>
        qc.invalidateQueries({ queryKey: ['tareas', 'lista'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarea_comentarios' }, () =>
        qc.invalidateQueries({ queryKey: ['tareas', 'detalle'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avisos_whatsapp' }, () =>
        qc.invalidateQueries({ queryKey: ['tareas', 'detalle'] }))
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [qc]);
}

function useInvalidar() {
  const qc = useQueryClient();
  return (...keys) => keys.forEach((k) => qc.invalidateQueries({ queryKey: ['tareas', k] }));
}

export function useGuardarTarea() {
  const invalidar = useInvalidar();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...campos }) => {
      if (id) return unwrap(supabase.from('tareas').update(campos).eq('id', id).select().single());
      return unwrap(supabase.from('tareas').insert(campos).select().single());
    },
    // Optimistic update so drag & drop feels instant.
    onMutate: async ({ id, ...campos }) => {
      if (!id) return undefined;
      await qc.cancelQueries({ queryKey: ['tareas', 'lista'] });
      const previa = qc.getQueryData(['tareas', 'lista']);
      qc.setQueryData(['tareas', 'lista'], (lista = []) => lista.map((t) => (t.id === id ? { ...t, ...campos } : t)));
      return { previa };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previa) qc.setQueryData(['tareas', 'lista'], ctx.previa);
    },
    onSettled: () => invalidar('lista', 'detalle'),
  });
}

export function useBorrarTarea() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id) => unwrap(supabase.from('tareas').delete().eq('id', id)),
    onSettled: () => invalidar('lista'),
  });
}

export function useComentar() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ tarea_id, texto }) => unwrap(supabase.from('tarea_comentarios').insert({ tarea_id, texto })),
    onSettled: () => invalidar('detalle'),
  });
}

export function useReenviarAviso() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (tareaId) => unwrap(supabase.rpc('reenviar_aviso_tarea', { p_tarea: tareaId })),
    onSettled: () => invalidar('detalle'),
  });
}

export function useGuardarProyecto() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, ...campos }) =>
      id
        ? unwrap(supabase.from('proyectos').update(campos).eq('id', id))
        : unwrap(supabase.from('proyectos').insert(campos)),
    onSettled: () => invalidar('proyectos'),
  });
}

export function useGuardarMiembro() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: async ({ id, ...campos }) => {
      const filas = id
        ? await unwrap(supabase.from('equipo').update(campos).eq('id', id).select())
        : await unwrap(supabase.from('equipo').insert(campos).select());
      // RLS turns an unauthorized update into "0 rows" instead of an error.
      if (!filas?.length) throw new Error('Solo un dueño puede editar el equipo.');
      return filas;
    },
    onSettled: () => invalidar('equipo'),
  });
}
