// Cotizador único (/admin?tab=cotizaciones). El listado, el estado, borrar, las notas y
// las reglas van directo a Supabase (RLS es_equipo() + RPC cotizacion_*); el chat con la
// IA (50x) y el PDF/Word pasan por el back de Agente-Next (/nexcommit/cotizaciones,
// src/cotizaciones/ en novautomatic/back_chat_next), que usa la misma sesión.
// La conversación vive en cotizaciones_chats: es la misma que se sigue desde Claude
// (herramienta `cotizar` del conector MCP).
// Migraciones 20261113150100–150300_cotizaciones_*.sql y 20261118120000_cotizador_unico.sql.
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

const sinTabla = (e) => /cotizaciones_(chats|reglas)/.test(e?.message || '') && /does not exist|schema cache|Could not find/i.test(e.message);
async function opcional(promesa, vacio) {
  try {
    return await unwrap(promesa);
  } catch (e) {
    if (sinTabla(e)) return vacio; // migración 20261118120000 aún sin correr
    throw e;
  }
}

/** Conversaciones que todavía no terminan en cotización (de cualquier socio y de las dos puertas). */
export function useChatsAbiertos() {
  return useQuery({
    queryKey: [CLAVE, 'chats'],
    queryFn: () => opcional(
      supabase.from('cotizaciones_chats').select('id, titulo, origen, ocupado_desde, updated_at')
        .is('cotizacion_id', null).order('updated_at', { ascending: false }).limit(30),
      [],
    ),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

/** Una conversación por id, o la última de una cotización. */
export function useChat({ chatId, cotizacionId }) {
  return useQuery({
    queryKey: [CLAVE, 'chat', chatId || null, cotizacionId || null],
    queryFn: async () => {
      let consulta = supabase.from('cotizaciones_chats').select('*');
      consulta = chatId ? consulta.eq('id', chatId) : consulta.eq('cotizacion_id', cotizacionId).order('updated_at', { ascending: false }).limit(1);
      const filas = await opcional(consulta, []);
      return filas[0] ?? null;
    },
    enabled: Boolean(chatId || cotizacionId),
    staleTime: 5_000,
    // Si la IA está respondiendo (p. ej. un mensaje mandado desde Claude), se refresca solo.
    refetchInterval: (q) => (q.state.data?.ocupado_desde ? 5_000 : false),
  });
}

export function useReglasCotizacion() {
  return useQuery({
    queryKey: [CLAVE, 'reglas'],
    queryFn: () => opcional(supabase.from('cotizaciones_reglas').select('id, regla, created_at').eq('activa', true).order('created_at', { ascending: false }), []),
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

/** Un turno del chat con la IA: { chat_id?, cotizacion_id?, mensajes?, texto } → { chat_id, mensajes, respuesta, cotizacion, pdf, word }. */
export const useTurnoChat = () => useEscribir((cuerpo) => llamar('/chat', cuerpo));
export const useGenerarPdf = () => useEscribir((id) => llamar(`/${id}/pdf`, {}));
export const useGenerarWord = () => useEscribir((id) => llamar(`/${id}/word`, {}));
export const useQuitarRegla = () => useEscribir((id) => unwrap(supabase.rpc('cotizacion_regla_quitar', { p_id: id })));
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
  ampliar_secciones: 'Completó secciones',
  generar_pdf: 'Generó el PDF',
  generar_word: 'Generó el Word',
  referencias_precio: 'Revisó precios de proyectos parecidos',
  anotar_regla: 'Anotó una regla para las próximas',
  ver_cotizacion: 'Revisó una cotización anterior',
  listar_cotizaciones: 'Buscó cotizaciones anteriores',
}[n] || n);
