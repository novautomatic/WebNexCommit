// Client document container with folders (migrations 20261023120100…120300_carpetas_cliente_*.sql).
// Same tree for both sides: the client in /mi-espacio → Documentos (portal_* RPCs, only
// touches what it uploaded) and the team in the client dashboard (cliente_* RPCs, everything).
// Private bucket clientes-documentos: team files at <cliente>/<file>, client files at <cliente>/c/<file>.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

export const BUCKET = 'clientes-documentos';
export const MAX_ARCHIVO = 50 * 1024 * 1024;

async function unwrap(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

const amigable = (mensaje) => Object.assign(new Error(mensaje), { amigable: true });

function nombreSeguro(nombre) {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(-80);
  return limpio || 'archivo';
}

/** Uploads one file under `prefijo` and returns its storage path. */
async function subirAStorage(prefijo, file) {
  if (file.size > MAX_ARCHIVO) {
    throw amigable(`«${file.name}» pesa más de 50 MB. Para archivos más grandes, comparte un enlace de Drive o WeTransfer.`);
  }
  const ruta = `${prefijo}/${crypto.randomUUID().slice(0, 8)}-${nombreSeguro(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, file, { contentType: file.type || undefined, upsert: false });
  if (error) {
    throw amigable(/row-level security|policy/i.test(error.message)
      ? 'No queda espacio en tu carpeta (500 MB). Borra algo o escríbenos para ampliarla.'
      : `No se pudo subir «${file.name}». Revisa tu conexión e intenta de nuevo.`);
  }
  return ruta;
}

/** Opens a document through a short-lived signed URL (the bucket is private). */
export async function abrirDocumento(ruta, nombre) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 300, { download: nombre || true });
  if (error) throw amigable('No se pudo abrir el documento.');
  window.open(data.signedUrl, '_blank', 'noopener');
}

/** Only messages raised on purpose in SQL (P0001) reach the user. */
export function textoError(err) {
  if (!err) return '';
  if (err.amigable || err.code === 'P0001') return err.message;
  return 'No pudimos completar la acción. Intenta de nuevo en un rato.';
}

// ─── Portal (the client) ────────────────────────────────────────────────────

export function usePortalArchivos() {
  return useQuery({
    queryKey: ['portal', 'archivos'],
    queryFn: () => unwrap(supabase.rpc('portal_archivos')),
  });
}

export function useAccionesPortal(clienteId) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (fn) => fn(),
    onSettled: () => qc.invalidateQueries({ queryKey: ['portal', 'archivos'] }),
  });
  const correr = (fn) => m.mutateAsync(fn);
  return {
    ocupado: m.isPending,
    crearCarpeta: (padre, nombre) => correr(() => unwrap(supabase.rpc('portal_carpeta_crear', { p_padre: padre, p_nombre: nombre }))),
    renombrarCarpeta: (id, nombre) => correr(() => unwrap(supabase.rpc('portal_carpeta_renombrar', { p_carpeta: id, p_nombre: nombre }))),
    borrarCarpeta: (id) => correr(() => unwrap(supabase.rpc('portal_carpeta_borrar', { p_carpeta: id }))),
    mover: (doc, carpeta) => correr(() => unwrap(supabase.rpc('portal_doc_mover', { p_doc: doc.id, p_carpeta: carpeta }))),
    subir: (file, carpeta) => correr(async () => {
      const ruta = await subirAStorage(`${clienteId}/c`, file);
      return unwrap(supabase.rpc('portal_doc_registrar', { p_ruta: ruta, p_nombre: file.name, p_carpeta: carpeta }));
    }),
    borrar: (doc) => correr(async () => {
      await supabase.storage.from(BUCKET).remove([doc.ruta]);
      return unwrap(supabase.rpc('portal_doc_borrar', { p_doc: doc.id }));
    }),
  };
}

// ─── Panel (the team) ───────────────────────────────────────────────────────

export function useAccionesEquipo(clienteId) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (fn) => fn(),
    onSettled: () => qc.invalidateQueries({ queryKey: ['cliente-dashboard'] }),
  });
  const correr = (fn) => m.mutateAsync(fn);
  return {
    ocupado: m.isPending,
    crearCarpeta: (padre, nombre) =>
      correr(() => unwrap(supabase.rpc('cliente_carpeta_crear', { p_cliente: clienteId, p_padre: padre, p_nombre: nombre }))),
    renombrarCarpeta: (id, nombre) => correr(() => unwrap(supabase.rpc('cliente_carpeta_renombrar', { p_carpeta: id, p_nombre: nombre }))),
    borrarCarpeta: (id) => correr(() => unwrap(supabase.rpc('cliente_carpeta_borrar', { p_carpeta: id }))),
    mover: (doc, carpeta) => correr(() => unwrap(supabase.rpc('cliente_doc_mover', { p_doc: doc.id, p_carpeta: carpeta }))),
    visible: (doc, valor) => correr(() => unwrap(supabase.rpc('cliente_doc_visible', { p_doc: doc.id, p_visible: valor }))),
    subir: (file, carpeta, visible = false) => correr(async () => {
      const ruta = await subirAStorage(clienteId, file);
      return unwrap(supabase.rpc('cliente_doc_registrar', {
        p_cliente: clienteId, p_ruta: ruta, p_nombre: file.name, p_tamano: file.size,
        p_tipo: file.type || null, p_visible: visible, p_carpeta: carpeta,
      }));
    }),
    borrar: (doc) => correr(async () => {
      await supabase.storage.from(BUCKET).remove([doc.ruta]);
      return unwrap(supabase.rpc('cliente_doc_borrar', { p_doc: doc.id }));
    }),
  };
}
