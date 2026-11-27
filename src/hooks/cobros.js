// Datos del panel → Cobros (solo dueños, RLS es_dueno()). Se lee y escribe
// directo en Supabase: `cobros_clientes` (qué se cobra a cada cliente cada mes)
// y `cobros` (cada cobro anotado). El cron `cobros-generar` crea el cobro del
// mes y arma el aviso por correo; aquí solo se anota y se marca.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

const tabla = async (consulta) => {
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return data;
};

export function useCobrosMensuales() {
  return useQuery({
    queryKey: ['cobros-mensuales'],
    queryFn: () => tabla(supabase.from('cobros_clientes').select('*').order('dia_cobro')),
  });
}

// Cobros de un mes (`periodo` = AAAA-MM) + los de meses anteriores que siguen
// sin pagar, para que no se pierdan de vista.
export function useCobros(periodo) {
  return useQuery({
    queryKey: ['cobros', periodo],
    queryFn: () => tabla(
      supabase.from('cobros').select('*')
        .or(`periodo.eq.${periodo},and(periodo.lt.${periodo},estado.in.(por_cobrar,cobrado))`)
        .order('fecha_cobro'),
    ),
    refetchInterval: 5 * 60_000,
  });
}

function useMutar(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cobros'] });
      qc.invalidateQueries({ queryKey: ['cobros-mensuales'] });
    },
  });
}

export function useGuardarCobroMensual() {
  return useMutar(({ id, ...campos }) => tabla(
    id ? supabase.from('cobros_clientes').update(campos).eq('id', id).select().single()
      : supabase.from('cobros_clientes').insert(campos).select().single(),
  ));
}

export function useBorrarCobroMensual() {
  return useMutar((id) => tabla(supabase.from('cobros_clientes').delete().eq('id', id)));
}

export function useGuardarCobro() {
  return useMutar(({ id, ...campos }) => tabla(
    id ? supabase.from('cobros').update(campos).eq('id', id).select().single()
      : supabase.from('cobros').insert(campos).select().single(),
  ));
}

export function useBorrarCobro() {
  return useMutar((id) => tabla(supabase.from('cobros').delete().eq('id', id)));
}
