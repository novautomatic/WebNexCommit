import React, { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { estaAbierta, useGuardarMiembro } from '../../hooks/tareas';
import { Avatar, ErrorBox, Modal, Pill, btnGhost, btnPrimary, card, inputClass, labelClass } from './ui';

export default function EquipoVista({ equipo, tareas }) {
  const [editando, setEditando] = useState(null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-[#9aafc3] max-w-2xl">
          Quienes aparecen aquí pueden entrar al sistema de tareas con su correo. El WhatsApp se usa solo para avisarles
          cuando se les asigna una tarea. Solo un dueño puede editar esta lista.
        </p>
        <button type="button" className={btnPrimary} onClick={() => setEditando({})}>
          <Plus className="w-4 h-4" /> Agregar persona
        </button>
      </div>

      <div className={`${card} divide-y divide-white/5`}>
        {equipo.map((m) => {
          const abiertas = tareas.filter((t) => t.responsable_id === m.id && estaAbierta(t)).length;
          return (
            <div key={m.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${m.activo ? '' : 'opacity-50'}`}>
              <Avatar nombre={m.nombre} size={32} />
              <div className="flex-1 min-w-[180px]">
                <div className="text-white text-sm font-medium flex items-center gap-2">
                  {m.nombre}
                  {m.rol === 'dueno' && <Pill color="#e0a64b">Dueño</Pill>}
                  {!m.activo && <Pill color="#64748b">Inactivo</Pill>}
                </div>
                <div className="text-xs text-[#9aafc3]">
                  {m.email}
                  {(m.github_labels || []).length > 0 && <> · GitHub: {m.github_labels.join(', ')}</>}
                </div>
              </div>
              <div className="text-xs text-[#9aafc3] w-40">
                {m.whatsapp ? `+${m.whatsapp}` : <span className="text-amber-300">Sin WhatsApp (no recibe avisos)</span>}
              </div>
              <div className="text-xs text-[#9aafc3] w-24">{abiertas} abiertas</div>
              <button type="button" onClick={() => setEditando(m)} className="text-[#9aafc3] hover:text-white" aria-label={`Editar ${m.nombre}`}>
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {editando && <MiembroForm miembro={editando} onClose={() => setEditando(null)} />}
    </div>
  );
}

function MiembroForm({ miembro, onClose }) {
  const guardar = useGuardarMiembro();
  const [f, setF] = useState({
    nombre: miembro.nombre || '',
    email: miembro.email || '',
    whatsapp: miembro.whatsapp || '',
    rol: miembro.rol || 'miembro',
    activo: miembro.activo ?? true,
    github_labels: (miembro.github_labels || []).join(', '),
    github_login: miembro.github_login || '',
  });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    const whatsapp = f.whatsapp.replace(/\D/g, '').replace(/^00/, '');
    guardar.mutate(
      {
        id: miembro.id,
        nombre: f.nombre.trim(),
        email: f.email.trim().toLowerCase(),
        whatsapp: whatsapp || null,
        rol: f.rol,
        activo: f.activo,
        github_labels: f.github_labels.split(',').map((x) => x.trim()).filter(Boolean),
        github_login: f.github_login.trim().replace(/^@/, '') || null,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal titulo={miembro.id ? `Editar ${miembro.nombre}` : 'Agregar persona'} onClose={onClose} ancho="max-w-lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="m-nombre">Nombre</label>
          <input id="m-nombre" className={inputClass} value={f.nombre} onChange={set('nombre')} required autoFocus />
        </div>
        <div>
          <label className={labelClass} htmlFor="m-email">Correo (el mismo con el que inicia sesión)</label>
          <input id="m-email" type="email" className={inputClass} value={f.email} onChange={set('email')} required />
        </div>
        <div>
          <label className={labelClass} htmlFor="m-wsp">WhatsApp con código de país</label>
          <input id="m-wsp" className={inputClass} value={f.whatsapp} onChange={set('whatsapp')} placeholder="56912345678" inputMode="tel" pattern="[+\d\s]{8,20}" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="m-labels">Etiqueta(s) en GitHub</label>
            <input id="m-labels" className={inputClass} value={f.github_labels} onChange={set('github_labels')} placeholder="Fabian, Fabi" />
          </div>
          <div>
            <label className={labelClass} htmlFor="m-login">Usuario de GitHub (opcional)</label>
            <input id="m-login" className={inputClass} value={f.github_login} onChange={set('github_login')} placeholder="@usuario" />
          </div>
        </div>
        <p className="text-[11px] text-[#9aafc3] -mt-2">
          Una tarea en GitHub es de esta persona si tiene alguna de esas etiquetas o si está asignada a ese usuario.
        </p>
        <div className="flex flex-wrap gap-6 text-sm text-[#9aafc3]">
          <label className="flex items-center gap-2">
            Rol
            <select className={`${inputClass} w-auto`} value={f.rol} onChange={set('rol')}>
              <option value="miembro">Miembro</option>
              <option value="dueno">Dueño</option>
            </select>
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.activo} onChange={set('activo')} /> Activo</label>
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
