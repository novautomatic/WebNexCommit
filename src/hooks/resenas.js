// Panel → Reseñas (migraciones 20261021130*_resenas_*.sql). El equipo LEE las
// tablas (RLS es_equipo()) y cambia todo con las RPC resena_*: el panel solo pide.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

async function unwrap(p) {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

export function useResenas() {
  return useQuery({
    queryKey: ['resenas', 'lista'],
    queryFn: () => unwrap(supabase.from('resenas').select('*, revisor:equipo!resenas_revisada_por_fkey(nombre)').order('created_at', { ascending: false })),
    refetchInterval: 60_000,
  });
}

export function useSolicitudesResena() {
  return useQuery({
    queryKey: ['resenas', 'solicitudes'],
    queryFn: async () => {
      await supabase.rpc('procesar_envios_resenas');
      return unwrap(supabase.from('resena_solicitudes').select('*, cliente:clientes(nombre, empresa)').order('created_at', { ascending: false }).limit(300));
    },
    // Keep polling while an email is still on its way.
    refetchInterval: (q) => (q.state.data?.some((s) => s.envio_estado === 'pendiente') ? 5000 : 60_000),
  });
}

export function useContactosCliente(clienteId) {
  return useQuery({
    queryKey: ['resenas', 'contactos', clienteId],
    enabled: !!clienteId,
    queryFn: () => unwrap(supabase.from('cliente_contactos').select('id, nombre, email, cargo, activo, bloqueado_at').eq('cliente_id', clienteId).order('nombre')),
  });
}

export function useResenasConfig() {
  return useQuery({
    queryKey: ['resenas', 'config'],
    queryFn: () => unwrap(supabase.from('resenas_config').select('*').maybeSingle()),
  });
}

function useAccion(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['resenas'] });
      qc.invalidateQueries({ queryKey: ['resenas-publicas'] });
    },
  });
}

export const useEnviarResena = () =>
  useAccion(({ cliente, servicio, frase, principal, contactos }) =>
    unwrap(supabase.rpc('resena_enviar', {
      p_cliente: cliente, p_servicio: servicio, p_servicio_frase: frase, p_principal: principal, p_contactos: contactos,
    })));

export const useReenviarResena = () => useAccion((id) => unwrap(supabase.rpc('resena_reenviar', { p_solicitud: id })));
export const useCancelarResena = () => useAccion((id) => unwrap(supabase.rpc('resena_cancelar', { p_solicitud: id })));
export const useBorrarResena = () => useAccion((id) => unwrap(supabase.rpc('resena_borrar', { p_resena: id })));

export const useRevisarResena = () =>
  useAccion(({ id, estado, servicio = null, motivo = null }) =>
    unwrap(supabase.rpc('resena_revisar', { p_resena: id, p_estado: estado, p_servicio: servicio, p_motivo: motivo })));

export const useGuardarResenasConfig = () =>
  useAccion(({ url, activo }) => unwrap(supabase.rpc('resenas_config_guardar', { p_google_url: url, p_google_activo: activo })));
