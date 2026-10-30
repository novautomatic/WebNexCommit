// Data layer for the team password vault. Tables and functions live in
// supabase/migrations/20261015120000_boveda_claves.sql, 20261015180000_boveda_compartida.sql
// 20261016120000..121000_boveda_2fa_*.sql (email code + recovery) and
// 20261030120000_boveda_por_proyecto.sql (optional proyecto_id on each entry).
// Everything stored here is already encrypted in the browser (see src/lib/boveda.js).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

async function unwrap(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

// Result of the SQL functions that report failures as {ok:false, error} instead of raising.
function exigirOk(r) {
  if (!r?.ok) {
    const e = new Error(r?.error || 'No se pudo completar.');
    e.restantes = r?.restantes;
    throw e;
  }
  return r;
}

// Who I am for the vault: does it exist, did I pass the email code, can I administer it.
// Polled so the screen locks itself when the 30-minute email-code session ends.
export function useBovedaEstado() {
  return useQuery({
    queryKey: ['boveda', 'estado'],
    queryFn: () => unwrap(supabase.rpc('boveda_estado')),
    refetchInterval: 30 * 1000,
  });
}

// Wrapped key row. Readable only after the email code; `clave_respaldo` is never sent to the browser.
export function useBovedaConfig(enabled) {
  return useQuery({
    queryKey: ['boveda', 'config'],
    enabled,
    queryFn: () => unwrap(supabase.from('boveda_config').select('equipo_id, sal, iteraciones, clave_envuelta').maybeSingle()),
  });
}

function useRpc(nombre, { despues } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args) => {
      const r = await unwrap(supabase.rpc(nombre, args));
      return despues ? despues(r) : r;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['boveda'] }),
  });
}

export const usePedirCodigoBoveda = () => useRpc('boveda_pedir_codigo');
export const useVerificarCodigoBoveda = () => useRpc('boveda_verificar_codigo', { despues: exigirOk });
export const useCerrarSesionBoveda = () => useRpc('boveda_cerrar_sesion');
export const useCrearBoveda = () => useRpc('boveda_crear');
export const useCambiarPasswordBoveda = () => useRpc('boveda_cambiar_password');
export const useRecuperarBoveda = () => useRpc('boveda_recuperar', { despues: exigirOk });
export const useReiniciarBoveda = () => useRpc('boveda_reiniciar');

// `enabled` keeps the ciphertext out of memory until the vault is unlocked.
export function useBovedaEntradas(enabled) {
  return useQuery({
    queryKey: ['boveda', 'entradas'],
    enabled,
    queryFn: () => unwrap(supabase.from('boveda_entradas').select('id, datos, proyecto_id, updated_at').order('created_at')),
  });
}

export function useGuardarEntradaBoveda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, datos, proyecto_id = null }) => {
      const filas = id
        ? await unwrap(supabase.from('boveda_entradas').update({ datos, proyecto_id, updated_at: new Date().toISOString() }).eq('id', id).select())
        : await unwrap(supabase.from('boveda_entradas').insert({ datos, proyecto_id }).select());
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
