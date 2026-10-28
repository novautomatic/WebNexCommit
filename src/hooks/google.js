// Herramientas Google (/admin?tab=google): todo pasa por el back de Agente-Next
// (/nexcommit/google/:cliente), que valida la sesión y que seas dueño. Ver
// back/src/routes/nexcommitGoogle.js en novautomatic/back_chat_next.
// Multi-cliente: el cliente activo llega por contexto (lo fija GoogleAdmin).
import { createContext, useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { CREADOR_API } from '../config/creador';

const API = `${CREADOR_API.replace(/\/creador$/, '')}/nexcommit/google`;

export const CLIENTE_DEFECTO = 'nexcommit';
export const ClienteGoogle = createContext(CLIENTE_DEFECTO);
const useCliente = () => useContext(ClienteGoogle);

async function llamar(cliente, ruta, { metodo = 'GET', cuerpo } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API}/${encodeURIComponent(cliente)}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `El servidor respondió ${res.status}`);
  return json;
}

export function useGooglePanel(dias) {
  const cliente = useCliente();
  return useQuery({
    queryKey: ['google-panel', cliente, dias],
    queryFn: () => llamar(cliente, `/panel?dias=${dias}`),
    staleTime: 4 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useRecargarPanel(dias) {
  const cliente = useCliente();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => llamar(cliente, `/panel?dias=${dias}&fresco=1`),
    onSuccess: (data) => qc.setQueryData(['google-panel', cliente, dias], data),
  });
}

const invalidar = (qc, cliente) => () => qc.invalidateQueries({ queryKey: ['google-panel', cliente] });

export function useGuardarConfig() {
  const cliente = useCliente();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (cuerpo) => llamar(cliente, '/config', { metodo: 'PUT', cuerpo }), onSuccess: invalidar(qc, cliente) });
}

// "Ya lo hice": oculta un aviso del diagnóstico N días (0 = volver a mostrarlo).
export function useOcultarAviso() {
  const cliente = useCliente();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (cuerpo) => llamar(cliente, '/ocultar', { metodo: 'POST', cuerpo }), onSuccess: invalidar(qc, cliente) });
}

export function useCrearCambio() {
  const cliente = useCliente();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (cuerpo) => llamar(cliente, '/cambios', { metodo: 'POST', cuerpo }), onSuccess: invalidar(qc, cliente) });
}

export function useEditarCambio() {
  const cliente = useCliente();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...cuerpo }) => llamar(cliente, `/cambios/${id}`, { metodo: 'PATCH', cuerpo }),
    onSuccess: invalidar(qc, cliente),
  });
}

export function useHistorialAnalisis() {
  const cliente = useCliente();
  return useQuery({ queryKey: ['google-analisis', cliente], queryFn: () => llamar(cliente, '/analisis'), staleTime: 60_000 });
}

export function useAnalizar() {
  const cliente = useCliente();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dias) => llamar(cliente, '/analisis', { metodo: 'POST', cuerpo: { dias } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['google-analisis', cliente] });
      qc.invalidateQueries({ queryKey: ['google-panel', cliente] });
    },
  });
}

// ── «Resumen claro»: cualquier rango de fechas + comparación + metas + analista ──
// r = { desde, hasta, cdesde?, chasta? } (AAAA-MM-DD)
const qsRango = (r) => new URLSearchParams(Object.entries(r).filter(([, v]) => v)).toString();

export function useResumenClaro(r) {
  const cliente = useCliente();
  return useQuery({
    queryKey: ['google-resumen', cliente, r],
    queryFn: () => llamar(cliente, `/resumen?${qsRango(r)}`),
    staleTime: 4 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}

export function useRecargarResumen(r) {
  const cliente = useCliente();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => llamar(cliente, `/resumen?${qsRango(r)}&fresco=1`),
    onSuccess: (data) => qc.setQueryData(['google-resumen', cliente, r], data),
  });
}

export function useGuardarMetas() {
  const cliente = useCliente();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (metas) => llamar(cliente, '/metas', { metodo: 'PUT', cuerpo: { metas } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['google-resumen', cliente] }),
  });
}

export function useHistorialAnalista() {
  const cliente = useCliente();
  return useQuery({ queryKey: ['google-analista', cliente], queryFn: () => llamar(cliente, '/analista'), staleTime: 60_000, retry: false });
}

export function useAnalizarResultados() {
  const cliente = useCliente();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (r) => llamar(cliente, '/analista', { metodo: 'POST', cuerpo: r }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['google-analista', cliente] });
      qc.invalidateQueries({ queryKey: ['google-resumen', cliente] });
      qc.invalidateQueries({ queryKey: ['google-panel', cliente] });
    },
  });
}

export function usePreguntarAnalista() {
  const cliente = useCliente();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, texto }) => llamar(cliente, `/analista/${id}/pregunta`, { metodo: 'POST', cuerpo: { texto } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['google-analista', cliente] });
      qc.invalidateQueries({ queryKey: ['google-panel', cliente] });
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
  pausar_grupo: { label: 'Pausar grupo de anuncios', campos: ['campana', 'grupo'] },
  activar_grupo: { label: 'Activar grupo de anuncios', campos: ['campana', 'grupo'] },
  sufijo_url: { label: 'Texto de seguimiento de las URL', campos: ['campana', 'sufijo'] },
};
export const CONCORDANCIAS = { BROAD: 'Amplia', PHRASE: 'Frase', EXACT: 'Exacta' };
