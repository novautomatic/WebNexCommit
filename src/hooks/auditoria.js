// Chatbots → Auditoría (/admin?tab=auditoria-chatbots): todo pasa por el back de
// Agente-Next (/nexcommit/auditoria), que valida la sesión y que seas dueño. Ver
// src/routes/nexcommitAuditoria.js en novautomatic/back_chat_next.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { CREADOR_API } from '../config/creador';

const API = `${CREADOR_API.replace(/\/creador$/, '')}/nexcommit/auditoria`;

async function llamar(ruta, { metodo = 'GET', cuerpo } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `El servidor respondió ${res.status}`);
  return json;
}

const CLAVE = 'auditoria-chatbots';

export function useAuditoriaDatos(chatbot) {
  return useQuery({
    queryKey: [CLAVE, 'datos', chatbot],
    queryFn: () => llamar(`/datos?chatbot=${encodeURIComponent(chatbot)}`),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

// Indicadores en vivo de un mes (AAAA-MM). Cada lectura son varias consultas: se cachean 5 min.
export function useIndicadores(chatbot, mes, { activo = true } = {}) {
  return useQuery({
    queryKey: [CLAVE, 'indicadores', chatbot, mes],
    queryFn: () => llamar(`/indicadores?chatbot=${encodeURIComponent(chatbot)}&mes=${mes}`),
    enabled: activo && Boolean(mes),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

function useEscribir(fn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: [CLAVE, 'datos'] }) });
}

// Checklist, notas, decisiones y (opcional) foto de cifras de un mes o de la línea base.
export const useGuardarMes = (chatbot) => useEscribir(({ clave, ...cuerpo }) => llamar(`/meses/${clave}`, { metodo: 'PUT', cuerpo: { chatbot, ...cuerpo } }));

export const useCrearCambio = (chatbot) => useEscribir((cuerpo) => llamar('/cambios', { metodo: 'POST', cuerpo: { chatbot, ...cuerpo } }));
export const useEditarCambio = () => useEscribir(({ id, ...cuerpo }) => llamar(`/cambios/${id}`, { metodo: 'PATCH', cuerpo }));
export const useBorrarCambio = () => useEscribir((id) => llamar(`/cambios/${id}`, { metodo: 'DELETE' }));

// Comentarios de cada nota de «Qué hicimos»: se marcan resueltos cuando se atienden.
export const useCrearComentario = () => useEscribir(({ cambioId, texto }) => llamar(`/cambios/${cambioId}/comentarios`, { metodo: 'POST', cuerpo: { texto } }));
export const useEditarComentario = () => useEscribir(({ id, ...cuerpo }) => llamar(`/comentarios/${id}`, { metodo: 'PATCH', cuerpo }));
export const useBorrarComentario = () => useEscribir((id) => llamar(`/comentarios/${id}`, { metodo: 'DELETE' }));

export const useCrearPendiente = (chatbot) => useEscribir((cuerpo) => llamar('/pendientes', { metodo: 'POST', cuerpo: { chatbot, ...cuerpo } }));
export const useEditarPendiente = () => useEscribir(({ id, ...cuerpo }) => llamar(`/pendientes/${id}`, { metodo: 'PATCH', cuerpo }));
export const useBorrarPendiente = () => useEscribir((id) => llamar(`/pendientes/${id}`, { metodo: 'DELETE' }));
