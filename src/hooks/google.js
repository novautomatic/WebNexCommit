// Herramientas Google (/admin?tab=google): todo pasa por el back de Agente-Next
// (/nexcommit/google), que valida la sesión y que seas dueño. Ver
// back/src/routes/nexcommitGoogle.js en novautomatic/back_chat_next.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { CREADOR_API } from '../config/creador';

const API = `${CREADOR_API.replace(/\/creador$/, '')}/nexcommit/google`;

async function llamar(ruta, { metodo = 'GET', cuerpo } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `El servidor respondió ${res.status}`);
  return json;
}

export function useGooglePanel(dias) {
  return useQuery({
    queryKey: ['google-panel', dias],
    queryFn: () => llamar(`/panel?dias=${dias}`),
    staleTime: 4 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useRecargarPanel(dias) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => llamar(`/panel?dias=${dias}&fresco=1`),
    onSuccess: (data) => qc.setQueryData(['google-panel', dias], data),
  });
}

const invalidar = (qc) => () => qc.invalidateQueries({ queryKey: ['google-panel'] });

export function useGuardarConfig() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (cuerpo) => llamar('/config', { metodo: 'PUT', cuerpo }), onSuccess: invalidar(qc) });
}

// "Ya lo hice": oculta un aviso del diagnóstico N días (0 = volver a mostrarlo).
export function useOcultarAviso() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (cuerpo) => llamar('/ocultar', { metodo: 'POST', cuerpo }), onSuccess: invalidar(qc) });
}

export function useCrearCambio() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (cuerpo) => llamar('/cambios', { metodo: 'POST', cuerpo }), onSuccess: invalidar(qc) });
}

export function useEditarCambio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...cuerpo }) => llamar(`/cambios/${id}`, { metodo: 'PATCH', cuerpo }),
    onSuccess: invalidar(qc),
  });
}

export function useHistorialAnalisis() {
  return useQuery({ queryKey: ['google-analisis'], queryFn: () => llamar('/analisis'), staleTime: 60_000 });
}

export function useAnalizar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dias) => llamar('/analisis', { metodo: 'POST', cuerpo: { dias } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['google-analisis'] });
      qc.invalidateQueries({ queryKey: ['google-panel'] });
    },
  });
}

// Tipos de cambio que el script de Google Ads sabe aplicar, con sus campos.
export const TIPOS_CAMBIO = {
  negativa: { label: 'Agregar negativa', campos: ['campana', 'texto', 'concordancia'] },
  quitar_negativa: { label: 'Quitar negativa', campos: ['campana', 'texto'] },
  palabra_nueva: { label: 'Agregar palabra clave', campos: ['campana', 'grupo', 'texto', 'concordancia'] },
  pausar_palabra: { label: 'Pausar palabra clave', campos: ['campana', 'texto', 'concordancia', 'grupo'] },
  activar_palabra: { label: 'Activar palabra clave', campos: ['campana', 'texto', 'concordancia', 'grupo'] },
  presupuesto_diario: { label: 'Cambiar presupuesto diario', campos: ['campana', 'monto_clp'] },
  cpc_maximo: { label: 'Cambiar tope de CPC', campos: ['campana', 'monto_clp'] },
};
export const CONCORDANCIAS = { BROAD: 'Amplia', PHRASE: 'Frase', EXACT: 'Exacta' };
