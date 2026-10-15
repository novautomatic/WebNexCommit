// Data layer for the password vault (tables in supabase/migrations/20261015120000_boveda_claves.sql).
// Everything stored here is already encrypted in the browser (see src/lib/boveda.js).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

async function unwrap(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

// Row with the wrapped key, or null when the user has not created a vault yet.
export function useBovedaConfig() {
  return useQuery({
    queryKey: ['boveda', 'config'],
    queryFn: () => unwrap(supabase.from('boveda_config').select('*').maybeSingle()),
  });
}

export function useCrearBoveda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config) => unwrap(supabase.from('boveda_config').insert(config).select().single()),
    onSettled: () => qc.invalidateQueries({ queryKey: ['boveda', 'config'] }),
  });
}

export function useCambiarPasswordBoveda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ equipoId, ...campos }) => {
      const filas = await unwrap(
        supabase.from('boveda_config').update({ ...campos, updated_at: new Date().toISOString() }).eq('equipo_id', equipoId).select(),
      );
      if (!filas?.length) throw new Error('No se pudo cambiar la contraseña maestra.');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['boveda', 'config'] }),
  });
}

// `enabled` keeps the ciphertext out of memory until the vault is unlocked.
export function useBovedaEntradas(enabled) {
  return useQuery({
    queryKey: ['boveda', 'entradas'],
    enabled,
    queryFn: () => unwrap(supabase.from('boveda_entradas').select('id, datos, updated_at').order('created_at')),
  });
}

export function useGuardarEntradaBoveda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, datos }) => {
      const filas = id
        ? await unwrap(supabase.from('boveda_entradas').update({ datos, updated_at: new Date().toISOString() }).eq('id', id).select())
        : await unwrap(supabase.from('boveda_entradas').insert({ datos }).select());
      if (!filas?.length) throw new Error('No se pudo guardar la clave.');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['boveda', 'entradas'] }),
  });
}

export function useEliminarEntradaBoveda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => unwrap(supabase.from('boveda_entradas').delete().eq('id', id)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['boveda', 'entradas'] }),
  });
}
