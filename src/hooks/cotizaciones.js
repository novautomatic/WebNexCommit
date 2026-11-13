// Cotizaciones (/admin?tab=cotizaciones). El listado, el estado, borrar y las notas van
// directo a Supabase (RLS es_equipo() + RPC cotizacion_*); el chat con Claude y el PDF
// pasan por el back de Agente-Next (/nexcommit/cotizaciones, src/cotizaciones/ en
// novautomatic/back_chat_next), que usa la misma sesión.
// Migraciones 20261113150100–150300_cotizaciones_*.sql.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { CREADOR_API } from '../config/creador';

const API = `${CREADOR_API.replace(/\/creador$/, '')}/nexcommit/cotizaciones`;
const CLAVE = 'cotizaciones';
export const ESTADOS = [
  { id: 'borrador', label: 'Borrador', color: '#9aafc3' },
  { id: 'enviada', label: 'Enviada', color: '#67c8f3' },
  { id: 'aceptada', label: 'Aceptada', color: '#4ade80' },
  { id: 'rechazada', label: 'Rechazada', color: '#f87171' },
  { id: 'vencida', label: 'Vencida', color: '#e0a64b' },
];

async function unwrap(promesa) {
  const { data, error } = await promesa;
  if (error) throw error;
  if (data && typeof data === 'object' && data.ok === false) throw new Error(data.error || 'No se pudo.');
  return data;
}

async function llamar(ruta, cuerpo) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API}${ruta}`, {
    method: cuerpo === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `El servidor respondió ${res.status}`);
  return json;
}

export const clp = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CL')}`;

export function useCotizaciones() {
  return useQuery({
    queryKey: [CLAVE, 'lista'],
    queryFn: () => unwrap(
      supabase.from('cotizaciones')
        .select('id, numero, titulo, cliente_nombre, estado, total_unico, total_mensual, version, origen, pdf_path, pdf_generado_at, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(300),
    ),
    staleTime: 30_000,
  });
}

/** La cotización completa (datos + conversación del chat). */
export function useCotizacion(id) {
  return useQuery({
    queryKey: [CLAVE, 'una', id],
    queryFn: () => unwrap(supabase.from('cotizaciones').select('*').eq('id', id).single()),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}

export function useNotasCotizacion() {
  return useQuery({
    queryKey: [CLAVE, 'notas'],
    queryFn: () => unwrap(supabase.from('cotizaciones_config').select('notas, updated_at').maybeSingle()),
  });
}

export function useGuiaCotizacion(activa) {
  return useQuery({ queryKey: [CLAVE, 'guia'], queryFn: () => llamar('/guia'), enabled: activa, staleTime: 60_000 });
}

function useEscribir(fn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: [CLAVE] }) });
}

/** Un turno del chat con Claude: { cotizacion_id?, mensajes, texto } → { mensajes, respuesta, cotizacion, pdf }. */
export const useTurnoChat = () => useEscribir((cuerpo) => llamar('/chat', cuerpo));
export const useGenerarPdf = () => useEscribir((id) => llamar(`/${id}/pdf`, {}));
export const useEstadoCotizacion = () => useEscribir(({ id, estado }) => unwrap(supabase.rpc('cotizacion_estado', { p_id: id, p_estado: estado })));
export const useBorrarCotizacion = () => useEscribir((id) => unwrap(supabase.rpc('cotizacion_borrar', { p_id: id })));
export const useGuardarNotas = () => useEscribir((notas) => unwrap(supabase.rpc('cotizaciones_notas_guardar', { p_notas: notas })));

/** Descarga el último PDF ya generado (enlace firmado de 5 minutos, sin regenerarlo). */
export async function abrirUltimoPdf(cot) {
  const { data, error } = await supabase.storage.from('cotizaciones')
    .createSignedUrl(cot.pdf_path, 300, { download: `Cotizacion-${cot.numero}.pdf` });
  if (error) throw error;
  window.open(data.signedUrl, '_blank', 'noopener');
}

/** Solo el texto visible de la conversación (sin herramientas ni razonamiento). */
export function burbujas(mensajes) {
  const out = [];
  for (const m of mensajes || []) {
    if (typeof m.content === 'string') {
      out.push({ rol: m.role, texto: m.content });
      continue;
    }
    const texto = (m.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n\n').trim();
    if (texto) out.push({ rol: m.role, texto });
    const herramientas = (m.content || []).filter((b) => b.type === 'tool_use').map((b) => b.name);
    if (herramientas.length) out.push({ rol: 'accion', texto: herramientas.map(nombreAccion).join(' · ') });
  }
  return out;
}

const nombreAccion = (n) => ({
  guardar_cotizacion: 'Guardó la cotización',
  generar_pdf: 'Generó el PDF',
  ver_cotizacion: 'Revisó una cotización anterior',
  listar_cotizaciones: 'Buscó cotizaciones anteriores',
}[n] || n);
