import React, { useState } from 'react';
import { ExternalLink, Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAccesosDirectos, useEliminarAcceso, useGuardarAcceso } from '../../hooks/tareas';
import { ErrorBox, Modal, btnGhost, btnPrimary, card, inputClass, labelClass } from '../tareas/ui';

const SIN_CATEGORIA = 'General';

// Only web links are allowed (blocks javascript: and similar). Adds https:// if missing.
function normalizarUrl(valor) {
  const v = valor.trim();
  const url = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

function hostDe(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export default function ConfiguracionAdmin() {
  const { data: accesos = [], isLoading, error } = useAccesosDirectos();
  const eliminar = useEliminarAcceso();
  const [editando, setEditando] = useState(null);

  const grupos = accesos.reduce((acc, a) => {
    const c = a.categoria || SIN_CATEGORIA;
    (acc[c] ||= []).push(a);
    return acc;
  }, {});
  const categorias = [...new Set(accesos.map((a) => a.categoria).filter(Boolean))];

  const borrar = (a) => {
    if (window.confirm(`¿Eliminar el acceso "${a.titulo}"?`)) eliminar.mutate(a.id);
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-white mb-1">Configuración</h1>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 mt-4">
        <div>
          <h2 className="text-white font-medium flex items-center gap-2"><Link2 className="w-4 h-4 text-[#67c8f3]" /> Accesos directos</h2>
          <p className="text-sm text-[#9aafc3] max-w-2xl">
            Links del equipo a Supabase, carpetas o documentos de Drive, Vercel, etc. Los ve y edita cualquier persona del equipo.
            No guardes contraseñas ni links públicos con datos sensibles.
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setEditando({})}>
          <Plus className="w-4 h-4" /> Agregar acceso
        </button>
      </div>

      <ErrorBox error={error || eliminar.error} />
      {isLoading && <p className="text-sm text-[#9aafc3]">Cargando…</p>}
      {!isLoading && accesos.length === 0 && (
        <div className={`${card} px-4 py-8 text-center text-sm text-[#9aafc3]`}>
          Aún no hay accesos directos. Agrega el primero con «Agregar acceso».
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(grupos).map(([cat, items]) => (
          <section key={cat}>
            <h3 className="text-xs uppercase tracking-wide text-[#9aafc3] mb-2">{cat}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((a) => (
                <div key={a.id} className={`${card} p-4 flex flex-col gap-2 hover:border-[#67c8f3]/40 transition-colors`}>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 group">
                    <ExternalLink className="w-4 h-4 mt-0.5 text-[#67c8f3] shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-white group-hover:text-[#67c8f3] truncate">{a.titulo}</span>
                      <span className="block text-[11px] text-[#9aafc3] truncate">{hostDe(a.url)}</span>
                    </span>
                  </a>
                  {a.descripcion && <p className="text-xs text-[#9aafc3]">{a.descripcion}</p>}
                  <div className="flex justify-end gap-3 mt-auto pt-1">
                    <button type="button" onClick={() => setEditando(a)} className="text-[#9aafc3] hover:text-white" aria-label={`Editar ${a.titulo}`}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => borrar(a)} className="text-[#9aafc3] hover:text-red-400" aria-label={`Eliminar ${a.titulo}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {editando && <AccesoForm acceso={editando} categorias={categorias} onClose={() => setEditando(null)} />}
    </div>
  );
}

function AccesoForm({ acceso, categorias, onClose }) {
  const guardar = useGuardarAcceso();
  const [errorLocal, setErrorLocal] = useState(null);
  const [f, setF] = useState({
    titulo: acceso.titulo || '',
    url: acceso.url || '',
    categoria: acceso.categoria || '',
    descripcion: acceso.descripcion || '',
  });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    const url = normalizarUrl(f.url);
    if (!url) {
      setErrorLocal(new Error('La dirección no es válida. Debe ser un link http(s).'));
      return;
    }
    setErrorLocal(null);
    guardar.mutate(
      {
        id: acceso.id,
        titulo: f.titulo.trim(),
        url,
        categoria: f.categoria.trim() || null,
        descripcion: f.descripcion.trim() || null,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal titulo={acceso.id ? 'Editar acceso directo' : 'Agregar acceso directo'} onClose={onClose} ancho="max-w-lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="a-titulo">Nombre</label>
          <input id="a-titulo" className={inputClass} value={f.titulo} onChange={set('titulo')} maxLength={80} required autoFocus placeholder="Supabase — proyecto web" />
        </div>
        <div>
          <label className={labelClass} htmlFor="a-url">Link</label>
          <input id="a-url" className={inputClass} value={f.url} onChange={set('url')} required placeholder="https://supabase.com/dashboard/project/…" />
        </div>
        <div>
          <label className={labelClass} htmlFor="a-cat">Categoría (opcional)</label>
          <input id="a-cat" className={inputClass} value={f.categoria} onChange={set('categoria')} maxLength={40} list="a-cats" placeholder="Infraestructura, Documentos…" />
          <datalist id="a-cats">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div>
          <label className={labelClass} htmlFor="a-desc">Descripción (opcional)</label>
          <input id="a-desc" className={inputClass} value={f.descripcion} onChange={set('descripcion')} maxLength={200} />
        </div>
        <ErrorBox error={errorLocal || guardar.error} />
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={guardar.isPending}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}
