import React, { useState } from 'react';
import { Archive, Pencil, Plus } from 'lucide-react';
import { estaAbierta, estaVencida, useGuardarProyecto } from '../../hooks/tareas';
import { ErrorBox, Modal, Pill, btnGhost, btnPrimary, card, inputClass, labelClass } from './ui';

export default function ProyectosVista({ proyectos, tareas, onNuevaTarea, onVerProyecto }) {
  const [editando, setEditando] = useState(null); // null | {} | proyecto
  const [verArchivados, setVerArchivados] = useState(false);
  const visibles = proyectos.filter((p) => verArchivados || !p.archivado);

  const stats = (id) => {
    const delProyecto = tareas.filter((t) => t.proyecto_id === id);
    return {
      total: delProyecto.length,
      abiertas: delProyecto.filter(estaAbierta).length,
      vencidas: delProyecto.filter(estaVencida).length,
    };
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-[#9aafc3]">
          <input type="checkbox" checked={verArchivados} onChange={(e) => setVerArchivados(e.target.checked)} />
          Mostrar archivados
        </label>
        <p className="text-xs text-[#9aafc3] flex-1 min-w-[220px]">
          Cada proyecto es un repositorio de GitHub. Los repos con issues aparecen solos; agrega aquí uno que aún no tenga.
        </p>
        <button type="button" className={btnPrimary} onClick={() => setEditando({})}>
          <Plus className="w-4 h-4" /> Agregar repositorio
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibles.map((p) => {
          const s = stats(p.id);
          return (
            <div key={p.id} className={`${card} p-4 flex flex-col gap-3 ${p.archivado ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => onVerProyecto(p.id)} className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-white font-semibold hover:underline">{p.nombre}</span>
                  </div>
                  {p.descripcion && <p className="text-xs text-[#9aafc3] mt-1">{p.descripcion}</p>}
                </button>
                <button type="button" onClick={() => setEditando(p)} className="text-[#9aafc3] hover:text-white" aria-label={`Editar ${p.nombre}`}>
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {p.es_interno && <Pill color="#67c8f3">Interno</Pill>}
                {p.es_cliente && <Pill color="#e0a64b">Cliente</Pill>}
                {p.archivado && <Pill color="#64748b">Archivado</Pill>}
                {(p.etiquetas || []).map((t) => <Pill key={t} color="#9aafc3">{t}</Pill>)}
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-white">{s.abiertas} <span className="text-[#9aafc3]">abiertas</span></span>
                {s.vencidas > 0 && <span className="text-red-300">{s.vencidas} vencidas</span>}
                <span className="text-[#9aafc3]">{s.total} en total</span>
              </div>
              {p.github_repo && <span className="text-xs text-[#9aafc3]">{p.github_repo}</span>}
              {!p.archivado && p.github_repo && (
                <button type="button" className={`${btnGhost} self-start`} onClick={() => onNuevaTarea(p.id)}>
                  <Plus className="w-4 h-4" /> Tarea en este proyecto
                </button>
              )}
            </div>
          );
        })}
      </div>

      {editando && <ProyectoForm proyecto={editando} onClose={() => setEditando(null)} />}
    </div>
  );
}

function ProyectoForm({ proyecto, onClose }) {
  const guardar = useGuardarProyecto();
  const [f, setF] = useState({
    nombre: proyecto.nombre || '',
    descripcion: proyecto.descripcion || '',
    color: proyecto.color || '#248bde',
    etiquetas: (proyecto.etiquetas || []).join(', '),
    github_repo: proyecto.github_repo || '',
    es_cliente: Boolean(proyecto.es_cliente),
    archivado: Boolean(proyecto.archivado),
  });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    guardar.mutate(
      {
        id: proyecto.id,
        nombre: f.nombre.trim(),
        descripcion: f.descripcion.trim() || null,
        color: f.color,
        etiquetas: f.etiquetas.split(',').map((s) => s.trim()).filter(Boolean),
        github_repo: f.github_repo.trim() || null,
        es_cliente: f.es_cliente,
        archivado: f.archivado,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal titulo={proyecto.id ? `Editar ${proyecto.nombre}` : 'Nuevo proyecto'} onClose={onClose} ancho="max-w-lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className={labelClass} htmlFor="p-nombre">Nombre</label>
            <input id="p-nombre" className={inputClass} value={f.nombre} onChange={set('nombre')} required autoFocus />
          </div>
          <div>
            <label className={labelClass} htmlFor="p-color">Color</label>
            <input id="p-color" type="color" className="h-[38px] w-14 rounded-lg bg-transparent border border-white/10" value={f.color} onChange={set('color')} />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="p-desc">Descripción</label>
          <input id="p-desc" className={inputClass} value={f.descripcion} onChange={set('descripcion')} />
        </div>
        <div>
          <label className={labelClass} htmlFor="p-tags">Etiquetas (separadas por coma)</label>
          <input id="p-tags" className={inputClass} value={f.etiquetas} onChange={set('etiquetas')} />
        </div>
        <div>
          <label className={labelClass} htmlFor="p-repo">Repositorio GitHub</label>
          <input id="p-repo" className={inputClass} value={f.github_repo} onChange={set('github_repo')} placeholder="novautomatic/mi-repo"
            required pattern="[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+" disabled={Boolean(proyecto.github_repo)} />
        </div>
        <div className="flex gap-6 text-sm text-[#9aafc3]">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.es_cliente} onChange={set('es_cliente')} /> Es de un cliente</label>
          {proyecto.id && (
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.archivado} onChange={set('archivado')} /> <Archive className="w-3.5 h-3.5" /> Archivado</label>
          )}
        </div>
        <ErrorBox error={guardar.error} />
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary} disabled={guardar.isPending}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}
