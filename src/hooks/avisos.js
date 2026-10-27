// Datos del panel → Avisos. Los avisos y plantillas se leen y escriben directo
// en Supabase (RLS: solo dueños); el saldo estimado, «Enviar ahora», anotar
// saldo/recargas y la aprobación de plantillas en Meta pasan por el back de
// Agente-Next (/nexcommit/avisos), que es quien habla con OpenAI, WhatsApp y Gmail.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { CREADOR_API } from '../config/creador';

const API = CREADOR_API.replace(/\/creador$/, '');

async function back(ruta, { metodo = 'GET', cuerpo } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API}/nexcommit/avisos${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${session?.access_token || ''}`,
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `El servidor respondió ${res.status}`);
  return data;
}

const tabla = async (consulta) => {
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return data;
};

export function useAvisos() {
  return useQuery({
    queryKey: ['avisos'],
    queryFn: () => tabla(supabase.from('avisos').select('*').order('created_at')),
    refetchInterval: 60_000,
  });
}

export function usePlantillasAvisos() {
  return useQuery({
    queryKey: ['avisos-plantillas'],
    queryFn: () => tabla(supabase.from('avisos_plantillas').select('*').order('categoria').order('nombre')),
  });
}

export function useEnviosAvisos() {
  return useQuery({
    queryKey: ['avisos-envios'],
    queryFn: () => tabla(supabase.from('avisos_envios').select('*').order('created_at', { ascending: false }).limit(50)),
    refetchInterval: 60_000,
  });
}

export function useEstadoAvisos() {
  return useQuery({ queryKey: ['avisos-estado'], queryFn: () => back('/estado'), refetchInterval: 5 * 60_000 });
}

// Chatbots de Agente-Next, para el aviso «Resumen del chatbot».
export function useChatbotsAvisos(activo = true) {
  return useQuery({ queryKey: ['avisos-chatbots'], queryFn: () => back('/chatbots'), enabled: activo, staleTime: 10 * 60_000 });
}

function useMutar(fn, claves) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => claves.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export function useGuardarAviso() {
  return useMutar(({ id, ...campos }) => tabla(
    id ? supabase.from('avisos').update(campos).eq('id', id).select().single()
      : supabase.from('avisos').insert(campos).select().single(),
  ), ['avisos']);
}

export function useBorrarAviso() {
  return useMutar((id) => tabla(supabase.from('avisos').delete().eq('id', id)), ['avisos']);
}

export function useGuardarPlantilla() {
  return useMutar(({ id, ...campos }) => tabla(
    id ? supabase.from('avisos_plantillas').update(campos).eq('id', id).select().single()
      : supabase.from('avisos_plantillas').insert(campos).select().single(),
  ), ['avisos-plantillas']);
}

export function useBorrarPlantilla() {
  return useMutar((id) => tabla(supabase.from('avisos_plantillas').delete().eq('id', id)), ['avisos-plantillas']);
}

export function useEnviarAviso() {
  return useMutar((id) => back(`/${id}/enviar`, { metodo: 'POST', cuerpo: {} }), ['avisos', 'avisos-envios']);
}

// Aprobación en Meta (WhatsApp): enviar una, enviar todas las que falten y
// traer el veredicto de las que están en revisión.
export function useEnviarPlantillaMeta() {
  return useMutar((id) => back(`/plantillas/${id}/meta`, { metodo: 'POST', cuerpo: {} }), ['avisos-plantillas']);
}

export function useEnviarTodasMeta() {
  return useMutar(() => back('/plantillas/todas', { metodo: 'POST', cuerpo: {} }), ['avisos-plantillas']);
}

export function useRevisarPlantillasMeta() {
  return useMutar(() => back('/plantillas/revisar', { metodo: 'POST', cuerpo: {} }), ['avisos-plantillas']);
}

export function useAnotarSaldo() {
  return useMutar((cuerpo) => back('/saldo', { metodo: 'POST', cuerpo }), ['avisos-estado']);
}
