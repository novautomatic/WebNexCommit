// Data layer for the per-client dashboard (panel → Clientes → click a client).
// Migrations 20261022170100…170400_dashboard_cliente_*.sql: webs, documents and
// client replies read from Gmail. Everything else comes from tables the team
// can already read (contacts, client tasks, emails, consents, reviews).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

async function unwrap(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

export function useClienteDashboard(clienteId) {
  return useQuery({
    queryKey: ['cliente-dashboard', clienteId],
    enabled: Boolean(clienteId),
    refetchInterval: 60000,
    queryFn: async () => {
      // Best effort: pull fresh replies / email statuses before reading them.
      await Promise.allSettled([supabase.rpc('procesar_correos_clientes'), supabase.rpc('procesar_avisos_tareas_cliente')]);
      const [contactos, tareasCliente, correos, consentimientos, respuestas, documentos, resenas, carpetas] = await Promise.all([
        unwrap(supabase.from('cliente_contactos').select('*').eq('cliente_id', clienteId).order('nombre')),
        unwrap(supabase.from('tareas_cliente')
          .select('*, encargado:equipo!encargado_id(id, nombre), contacto:cliente_contactos!contacto_id(id, nombre)')
          .eq('cliente_id', clienteId).order('created_at', { ascending: false })),
        unwrap(supabase.from('cliente_correos').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(100)),
        unwrap(supabase.from('cliente_consentimientos').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false })),
        unwrap(supabase.from('cliente_respuestas').select('*').eq('cliente_id', clienteId).order('fecha', { ascending: false }).limit(100)),
        unwrap(supabase.from('cliente_documentos').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false })),
        unwrap(supabase.from('resena_solicitudes').select('id, nombre, email, estado, enviada_at, recordatorio_at, respondida_at, created_at')
          .eq('cliente_id', clienteId).order('created_at', { ascending: false })),
        unwrap(supabase.from('cliente_carpetas').select('*').eq('cliente_id', clienteId).order('nombre')),
      ]);
      const idsTareas = tareasCliente.map((t) => t.id);
      const idsContactos = contactos.map((c) => c.id);
      const [historial, avisos] = await Promise.all([
        idsTareas.length
          ? unwrap(supabase.from('tareas_cliente_historial').select('*').in('tarea_id', idsTareas).order('created_at', { ascending: false }).limit(200))
          : [],
        idsContactos.length
          ? unwrap(supabase.from('tareas_cliente_avisos').select('*').in('contacto_id', idsContactos).order('created_at', { ascending: false }).limit(100))
          : [],
      ]);
      return { contactos, tareasCliente, correos, consentimientos, respuestas, documentos, resenas, carpetas, historial, avisos };
    },
  });
}

/** Last Gmail read (to say "revisado hace X min" or show the error). */
export function useUltimaLectura() {
  return useQuery({
    queryKey: ['cliente-dashboard', 'lectura'],
    queryFn: () => unwrap(supabase.from('correo_lecturas').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle()),
    refetchInterval: 60000,
  });
}

/** Replies to the «Powered by» email that a person still has to confirm (all clients). */
export function useRespuestasPorRevisar() {
  return useQuery({
    queryKey: ['cliente-dashboard', 'por-revisar'],
    queryFn: () => unwrap(supabase.from('cliente_respuestas').select('id, cliente_id, fecha')
      .eq('tipo', 'permiso_web').eq('clasificacion', 'dudoso').is('resuelta_at', null)),
    refetchInterval: 120000,
  });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['cliente-dashboard'] });
    qc.invalidateQueries({ queryKey: ['tareas', 'clientes'] });
  };
}

export function useResolverRespuesta() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, decision }) => unwrap(supabase.rpc('cliente_respuesta_resolver', { p_respuesta: id, p_decision: decision })),
    onSettled: invalidar,
  });
}

export function useLeerCorreoAhora() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: () => unwrap(supabase.rpc('leer_respuestas_clientes')),
    onSettled: invalidar,
  });
}

/** "dyetales.cl" from "https://www.dyetales.cl/tienda". */
export function dominio(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Accepts "dyetales.cl" or "https://dyetales.cl" and returns a full URL, or null if it isn't one. */
export function normalizarSitio(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return null;
  const url = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(url);
    if (!u.hostname.includes('.') || /\s/.test(t)) return null;
    return url.slice(0, 300);
  } catch {
    return null;
  }
}
