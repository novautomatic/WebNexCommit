// Data layer for client tasks (panel /admin?tab=clientes-tareas and portal /mi-espacio).
// Schema + RPCs: supabase/migrations/20261019120100…121400_tareas_clientes_*.sql.
// The team READS tables (RLS es_equipo) and WRITES only through tcliente_* RPCs;
// clients never read tables: everything goes through portal_* RPCs.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

export const ESTADO_CLIENTE = {
  pendiente: { label: 'Por entregar', color: '#3987e5' },
  entregada: { label: 'Entregada · por revisar', color: '#9085e9' },
  devuelta: { label: 'Devuelta · falta algo', color: '#e66767' },
  aprobada: { label: 'Aprobada', color: '#199e70' },
};
export const ESTADO_ENCARGADO = {
  pendiente: { label: 'Pendiente', color: '#3987e5' },
  en_progreso: { label: 'En progreso', color: '#c98500' },
  lista: { label: 'Lista', color: '#199e70' },
};
export const DERECHOS = {
  acceso: 'Acceso',
  rectificacion: 'Rectificación',
  supresion: 'Supresión',
  oposicion: 'Oposición',
  portabilidad: 'Portabilidad',
  bloqueo: 'Bloqueo',
};

export const estaCerrada = (t) => Boolean(t.cerrada_at || t.cancelada_at);

// The team half of a client task, shaped like a row of `tareas` so the main
// board, list, calendar and summary show it next to the internal tasks.
// It lives under a pseudo-project "cliente:<id>"; opening it goes to «De clientes».
export function comoTareaDelEncargado(t) {
  const lista = t.estado_encargado === 'lista' || Boolean(t.cerrada_at);
  return {
    id: `cliente-${t.id}`,
    origen: 'cliente',
    tareaCliente: t,
    numero: t.numero,
    titulo: t.titulo,
    descripcion: t.tarea_encargado,
    proyecto_id: `cliente:${t.cliente_id}`,
    responsable_id: t.encargado_id,
    fecha_limite: t.fecha_encargado,
    estado: t.cancelada_at ? 'cancelada' : lista ? 'completada' : t.estado_encargado,
    // A delivery waiting for review is the team's move: bump it.
    prioridad: t.estado_cliente === 'entregada' ? 'alta' : 'media',
    etiquetas: ['cliente', `cliente: ${ESTADO_CLIENTE[t.estado_cliente]?.label ?? t.estado_cliente}`],
    orden: 0,
    created_at: t.created_at,
    completada_at: lista ? t.cerrada_at || t.updated_at : null,
  };
}

export const proyectoDeCliente = (c) => ({ id: `cliente:${c.id}`, nombre: c.nombre, color: c.color, tipo: 'cliente' });

// Board column → team-half state. Columns without an equivalent are not allowed.
export const ESTADO_ENCARGADO_DESDE_COLUMNA = { pendiente: 'pendiente', en_progreso: 'en_progreso', completada: 'lista' };
export const esperaCliente = (t) => !estaCerrada(t) && ['pendiente', 'devuelta'].includes(t.estado_cliente);

/** Days from today (Santiago, the browser's local date) to an ISO date. */
export function diasHasta(iso) {
  if (!iso) return null;
  const d = new Date();
  const hoy = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const [y, m, dd] = iso.slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, dd) - hoy) / 86400000);
}

export function textoPlazo(iso) {
  const n = diasHasta(iso);
  if (n === null) return '';
  if (n > 1) return `faltan ${n} días`;
  if (n === 1) return 'mañana';
  if (n === 0) return 'hoy';
  return `vencida hace ${-n} ${n === -1 ? 'día' : 'días'}`;
}

export function fechaCorta(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Only messages raised on purpose in SQL (P0001) or by the Edge Function reach the user. */
export function mensajeError(err, porDefecto = 'No pudimos completar la acción. Intenta de nuevo en un rato.') {
  if (!err) return '';
  if (err.code === 'P0001' && err.message) return err.message;
  if (err.code === '23514') return 'Revisa los campos: hay alguno vacío o demasiado largo.';
  if (err.amigable) return err.message;
  return porDefecto;
}

async function unwrap(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

/** Calls the portal-clientes Edge Function and surfaces its friendly error text. */
export async function funcionPortal(body) {
  const { data, error } = await supabase.functions.invoke('portal-clientes', { body });
  if (error) {
    let msg = '';
    try {
      msg = (await error.context?.json())?.error;
    } catch {
      /* not JSON */
    }
    const e = new Error(msg || 'No pudimos conectar con el servidor. Intenta de nuevo.');
    e.amigable = true;
    throw e;
  }
  return data;
}

// ─── Panel (equipo) ─────────────────────────────────────────────────────────

const SELECT_TAREA = `*,
  entregables:tareas_cliente_entregables(id, texto, hecho, orden),
  cliente:clientes(id, nombre, empresa, color),
  contacto:cliente_contactos!contacto_id(id, nombre, email),
  encargado:equipo!encargado_id(id, nombre)`;

export function useTareasCliente() {
  return useQuery({
    queryKey: ['tcliente', 'tareas'],
    queryFn: async () => {
      const filas = await unwrap(supabase.from('tareas_cliente').select(SELECT_TAREA).order('fecha_cliente'));
      return filas.map((t) => ({ ...t, entregables: [...(t.entregables ?? [])].sort((a, b) => a.orden - b.orden) }));
    },
    refetchInterval: 30000,
  });
}

export function useDetalleTareaCliente(id) {
  return useQuery({
    queryKey: ['tcliente', 'detalle', id],
    enabled: Boolean(id),
    queryFn: async () => {
      await supabase.rpc('procesar_avisos_tareas_cliente');
      const [notas, archivos, historial, avisos] = await Promise.all([
        unwrap(supabase.from('tareas_cliente_notas').select('*').eq('tarea_id', id).order('created_at')),
        unwrap(supabase.from('tareas_cliente_archivos').select('*').eq('tarea_id', id).is('eliminado_at', null).order('created_at')),
        unwrap(supabase.from('tareas_cliente_historial').select('*').eq('tarea_id', id).order('created_at', { ascending: false })),
        unwrap(supabase.from('tareas_cliente_avisos').select('*').contains('tareas', [id]).order('created_at', { ascending: false }).limit(30)),
      ]);
      return { notas, archivos, historial, avisos };
    },
  });
}

export function useClientesBasico() {
  return useQuery({
    queryKey: ['tcliente', 'clientes'],
    queryFn: () => unwrap(supabase.from('clientes').select('id, nombre, empresa, color, activo').order('nombre')),
  });
}

export function useContactos() {
  return useQuery({
    queryKey: ['tcliente', 'contactos'],
    queryFn: () => unwrap(supabase.from('cliente_contactos').select('*').order('nombre')),
  });
}

export function usePlantillas() {
  return useQuery({
    queryKey: ['tcliente', 'plantillas'],
    queryFn: () => unwrap(supabase.from('tareas_cliente_plantillas').select('*').order('created_at')),
  });
}

export function useSolicitudes() {
  return useQuery({
    queryKey: ['tcliente', 'solicitudes'],
    queryFn: async () => {
      const [solicitudes, derechos] = await Promise.all([
        unwrap(supabase.from('cliente_solicitudes').select('*').order('created_at', { ascending: false }).limit(200)),
        unwrap(supabase.from('derechos_solicitudes').select('*').order('created_at', { ascending: false }).limit(200)),
      ]);
      return { solicitudes, derechos };
    },
    refetchInterval: 60000,
  });
}

/** Generic RPC mutation that refreshes every client-task query afterwards. */
export function useRpcTcliente(nombre) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args) => unwrap(supabase.rpc(nombre, args)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tcliente'] }),
  });
}

export function useDarAcceso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactoId) => funcionPortal({ accion: 'dar_acceso', contacto_id: contactoId }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tcliente'] }),
  });
}

// ─── Archivos (los dos lados) ───────────────────────────────────────────────

export const MAX_ARCHIVO = 50 * 1024 * 1024;
const BUCKET = 'tareas-clientes';

function nombreSeguro(nombre) {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(-80);
  return limpio || 'archivo';
}

/** Uploads to Storage and registers the row. Path: <tarea_id>/<random>-<name>. */
export async function subirArchivo({ tareaId, entregableId = null, file }) {
  if (file.size > MAX_ARCHIVO) {
    const e = new Error(`«${file.name}» pesa más de 50 MB. Para archivos grandes, pega un enlace de Drive o WeTransfer en una nota.`);
    e.amigable = true;
    throw e;
  }
  const ruta = `${tareaId}/${crypto.randomUUID().slice(0, 8)}-${nombreSeguro(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, file, { contentType: file.type || undefined, upsert: false });
  if (error) {
    const e = new Error(`No se pudo subir «${file.name}». Revisa tu conexión e intenta de nuevo.`);
    e.amigable = true;
    throw e;
  }
  await unwrap(
    supabase.rpc('tcliente_registrar_archivo', {
      p_tarea: tareaId,
      p_entregable: entregableId,
      p_ruta: ruta,
      p_nombre: file.name,
      p_tamano: file.size,
      p_tipo: file.type || null,
    }),
  );
}

/** Opens a file through a short-lived signed URL (the bucket is private). */
export async function abrirArchivo(ruta, nombre) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 300, { download: nombre || true });
  if (error) throw Object.assign(new Error('No se pudo abrir el archivo.'), { amigable: true });
  window.open(data.signedUrl, '_blank', 'noopener');
}

export function pesoLegible(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
