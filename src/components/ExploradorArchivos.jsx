// Folder browser for a client's document container. Used by the client portal
// (/mi-espacio → Documentos, light theme) and the team's client dashboard (dark theme).
// The client may only rename/move/delete what it created (origen 'cliente'); the
// database enforces it too. Data + actions come from src/hooks/archivosCliente.js.
import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronRight, Download, Eye, EyeOff, FileText, Folder, FolderPlus, Home, Pencil, Trash2, Upload,
} from 'lucide-react';
import { abrirDocumento, textoError } from '../hooks/archivosCliente';

const TEMAS = {
  claro: {
    caja: 'rounded-2xl bg-white shadow-sm ring-1 ring-slate-200',
    texto: 'text-slate-800',
    suave: 'text-slate-500',
    fila: 'hover:bg-slate-50',
    borde: 'divide-slate-100',
    boton: 'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50',
    principal: 'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold bg-[#248bde] text-white hover:bg-[#1f78c2] disabled:opacity-50 cursor-pointer',
    icono: 'text-[#248bde]',
    soltar: 'ring-2 ring-[#248bde] bg-sky-50',
    error: 'text-red-600',
    select: 'rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700',
    barra: 'bg-slate-100',
  },
  oscuro: {
    caja: 'rounded-xl border border-white/10 bg-[#0d1e30]',
    texto: 'text-white',
    suave: 'text-[#9aafc3]',
    fila: 'hover:bg-white/5',
    borde: 'divide-white/5',
    boton: 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm border border-white/10 text-[#c6d4e1] hover:text-white hover:border-white/25 disabled:opacity-50',
    principal: 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-[#248bde] text-white hover:bg-[#1f78c2] disabled:opacity-50 cursor-pointer',
    icono: 'text-[#67c8f3]',
    soltar: 'ring-2 ring-[#67c8f3] bg-white/5',
    error: 'text-red-300',
    select: 'rounded-md border border-white/10 bg-[#0c1a2c] px-2 py-1 text-xs text-[#c6d4e1]',
    barra: 'bg-white/10',
  },
};

const peso = (b) => (!b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
const fecha = (iso) => new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * @param modo 'cliente' | 'equipo'
 * @param acciones { crearCarpeta, renombrarCarpeta, borrarCarpeta, subir, mover, borrar, visible?, ocupado }
 */
export default function ExploradorArchivos({ carpetas, documentos, modo, acciones, tema = 'claro', usado, cupo }) {
  const t = TEMAS[tema];
  const [actual, setActual] = useState(null); // folder id, null = root
  const [error, setError] = useState('');
  const [progreso, setProgreso] = useState('');
  const [soltando, setSoltando] = useState(false);
  const [compartir, setCompartir] = useState(false); // team: upload as visible for the client
  const arrastrado = useRef(null);
  const puede = (item) => modo === 'equipo' || item.origen === 'cliente';

  const porId = useMemo(() => Object.fromEntries(carpetas.map((c) => [c.id, c])), [carpetas]);
  // If the open folder disappears (deleted elsewhere), fall back to the root.
  const abierta = actual && porId[actual] ? actual : null;
  const camino = useMemo(() => {
    const lista = [];
    for (let c = porId[abierta]; c; c = porId[c.padre_id]) lista.unshift(c);
    return lista;
  }, [abierta, porId]);
  const rutaDe = (id) => {
    const partes = [];
    for (let c = porId[id]; c; c = porId[c.padre_id]) partes.unshift(c.nombre);
    return ['Inicio', ...partes].join(' / ');
  };
  const destinos = useMemo(
    () => [{ id: null, nombre: 'Inicio' }, ...carpetas.map((c) => ({ id: c.id, nombre: rutaDe(c.id) }))].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [carpetas, porId],
  );
  const subcarpetas = carpetas.filter((c) => (c.padre_id ?? null) === abierta).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const archivos = documentos.filter((d) => (d.carpeta_id ?? null) === abierta);
  const cuenta = (id) => carpetas.filter((c) => c.padre_id === id).length + documentos.filter((d) => d.carpeta_id === id).length;

  const intentar = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(textoError(e));
    }
  };

  const subir = async (lista) => {
    const files = [...lista];
    if (!files.length) return;
    setError('');
    for (let i = 0; i < files.length; i += 1) {
      setProgreso(files.length > 1 ? `Subiendo ${i + 1} de ${files.length}…` : 'Subiendo…');
      try {
        await acciones.subir(files[i], abierta, compartir);
      } catch (e) {
        setError(textoError(e));
        break;
      }
    }
    setProgreso('');
  };

  const nuevaCarpeta = () => {
    const nombre = window.prompt('Nombre de la nueva carpeta');
    if (nombre?.trim()) intentar(() => acciones.crearCarpeta(abierta, nombre.trim()));
  };
  const renombrar = (c) => {
    const nombre = window.prompt('Nuevo nombre de la carpeta', c.nombre);
    if (nombre?.trim() && nombre.trim() !== c.nombre) intentar(() => acciones.renombrarCarpeta(c.id, nombre.trim()));
  };

  // Drop files from the computer → upload here; drop a document on a folder → move it.
  const alSoltar = (e) => {
    e.preventDefault();
    setSoltando(false);
    if (e.dataTransfer.files?.length) subir(e.dataTransfer.files);
  };
  const soltarEnCarpeta = (carpetaId) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSoltando(false);
    const doc = arrastrado.current;
    arrastrado.current = null;
    if (doc && puede(doc) && (doc.carpeta_id ?? null) !== carpetaId) intentar(() => acciones.mover(doc, carpetaId));
    else if (e.dataTransfer.files?.length) {
      setActual(carpetaId);
      subir(e.dataTransfer.files);
    }
  };

  const ocupado = acciones.ocupado || Boolean(progreso);
  const porcentaje = cupo ? Math.min(100, Math.round(((usado || 0) / cupo) * 100)) : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={t.boton} onClick={nuevaCarpeta} disabled={ocupado}>
          <FolderPlus className="w-4 h-4" /> Nueva carpeta
        </button>
        <label className={t.principal}>
          <Upload className="w-4 h-4" /> {progreso || 'Subir archivos'}
          <input type="file" multiple className="sr-only" disabled={ocupado} onChange={(e) => { subir(e.target.files); e.target.value = ''; }} />
        </label>
        {modo === 'equipo' && (
          <label className={`flex items-center gap-2 text-xs ${t.suave}`}>
            <input type="checkbox" checked={compartir} onChange={(e) => setCompartir(e.target.checked)} /> Lo que suba, visible para el cliente
          </label>
        )}
        {cupo ? (
          <div className={`ml-auto text-xs ${t.suave} min-w-[160px]`}>
            <div className={`h-1.5 rounded-full ${t.barra} overflow-hidden`}>
              <div className="h-full rounded-full" style={{ width: `${porcentaje}%`, backgroundColor: porcentaje > 90 ? '#e66767' : '#248bde' }} />
            </div>
            <span>{peso(usado) || '0 KB'} de {peso(cupo)} usados</span>
          </div>
        ) : null}
      </div>

      <nav className={`flex flex-wrap items-center gap-1 text-sm ${t.suave}`} aria-label="Carpeta actual">
        <button type="button" onClick={() => setActual(null)} onDragOver={(e) => e.preventDefault()} onDrop={soltarEnCarpeta(null)}
          className={`flex items-center gap-1 hover:underline ${abierta ? '' : `font-semibold ${t.texto}`}`}>
          <Home className="w-4 h-4" /> Inicio
        </button>
        {camino.map((c, i) => (
          <React.Fragment key={c.id}>
            <ChevronRight className="w-3.5 h-3.5" />
            <button type="button" onClick={() => setActual(c.id)} onDragOver={(e) => e.preventDefault()} onDrop={soltarEnCarpeta(c.id)}
              className={`hover:underline ${i === camino.length - 1 ? `font-semibold ${t.texto}` : ''}`}>{c.nombre}</button>
          </React.Fragment>
        ))}
      </nav>

      {error && <p className={`text-sm ${t.error}`} role="alert">{error}</p>}

      <div
        className={`${t.caja} transition-colors ${soltando ? t.soltar : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) setSoltando(true); }}
        onDragLeave={() => setSoltando(false)}
        onDrop={alSoltar}
      >
        {!subcarpetas.length && !archivos.length && (
          <p className={`p-8 text-center text-sm ${t.suave}`}>
            {abierta ? 'Carpeta vacía.' : 'Todavía no hay documentos.'} Arrastra archivos aquí o usa «Subir archivos».
          </p>
        )}
        <ul className={`divide-y ${t.borde}`}>
          {subcarpetas.map((c) => (
            <li key={c.id} className={`flex items-center gap-3 px-4 py-3 ${t.fila}`} onDragOver={(e) => e.preventDefault()} onDrop={soltarEnCarpeta(c.id)}>
              <Folder className={`w-5 h-5 shrink-0 ${t.icono}`} />
              <button type="button" onClick={() => setActual(c.id)} className={`flex-1 min-w-0 text-left font-medium ${t.texto} truncate hover:underline`}>
                {c.nombre}
              </button>
              <span className={`text-xs ${t.suave} hidden sm:inline`}>
                {cuenta(c.id)} {cuenta(c.id) === 1 ? 'elemento' : 'elementos'}
                {modo === 'equipo' && c.origen === 'cliente' ? ' · creada por el cliente' : ''}
                {modo === 'cliente' && c.origen === 'equipo' ? ' · de NexCommit' : ''}
              </span>
              {puede(c) && (
                <span className={`flex items-center gap-2 ${t.suave}`}>
                  <button type="button" onClick={() => renombrar(c)} aria-label={`Renombrar ${c.nombre}`} className="hover:opacity-70"><Pencil className="w-4 h-4" /></button>
                  <button type="button" aria-label={`Borrar ${c.nombre}`} className="hover:text-red-500"
                    onClick={() => window.confirm(`¿Borrar la carpeta «${c.nombre}»? Tiene que estar vacía.`) && intentar(() => acciones.borrarCarpeta(c.id))}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </span>
              )}
            </li>
          ))}
          {archivos.map((d) => (
            <li key={d.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 ${t.fila}`}
              draggable={puede(d)} onDragStart={(e) => { arrastrado.current = d; e.dataTransfer.effectAllowed = 'move'; }}>
              <FileText className={`w-5 h-5 shrink-0 ${t.suave}`} />
              <button type="button" onClick={() => intentar(() => abrirDocumento(d.ruta, d.nombre))}
                className={`flex-1 min-w-[140px] text-left ${t.texto} truncate hover:underline`} title={d.nombre}>
                {d.nombre}
              </button>
              <span className={`text-xs ${t.suave}`}>
                {peso(d.tamano)} · {fecha(d.created_at)}
                {d.origen === 'cliente'
                  ? (modo === 'equipo' ? ` · subió ${d.subido_por_nombre || 'el cliente'}` : d.subido_por_nombre ? ` · ${d.subido_por_nombre}` : '')
                  : (modo === 'cliente' ? ' · de NexCommit' : '')}
              </span>
              <span className={`flex items-center gap-2 ${t.suave}`}>
                {puede(d) && destinos.length > 1 && (
                  <select className={t.select} value="" aria-label={`Mover ${d.nombre}`}
                    onChange={(e) => { const v = e.target.value === '__raiz' ? null : e.target.value; if (e.target.value) intentar(() => acciones.mover(d, v)); }}>
                    <option value="">Mover a…</option>
                    {destinos.filter((x) => x.id !== (d.carpeta_id ?? null)).map((x) => (
                      <option key={x.id ?? '__raiz'} value={x.id ?? '__raiz'}>{x.nombre}</option>
                    ))}
                  </select>
                )}
                {modo === 'equipo' && d.origen !== 'cliente' && acciones.visible && (
                  <button type="button" className="flex items-center gap-1 text-xs hover:opacity-70" onClick={() => intentar(() => acciones.visible(d, !d.visible_cliente))}
                    title={d.visible_cliente ? 'El cliente lo ve. Clic para ocultarlo.' : 'Solo el equipo lo ve. Clic para compartirlo.'}>
                    {d.visible_cliente ? <><Eye className="w-4 h-4 text-emerald-400" /> Lo ve el cliente</> : <><EyeOff className="w-4 h-4" /> Interno</>}
                  </button>
                )}
                <button type="button" onClick={() => intentar(() => abrirDocumento(d.ruta, d.nombre))} aria-label={`Descargar ${d.nombre}`} className="hover:opacity-70">
                  <Download className="w-4 h-4" />
                </button>
                {puede(d) && (
                  <button type="button" aria-label={`Borrar ${d.nombre}`} className="hover:text-red-500"
                    onClick={() => window.confirm(`¿Borrar «${d.nombre}»? No se puede deshacer.`) && intentar(() => acciones.borrar(d))}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
