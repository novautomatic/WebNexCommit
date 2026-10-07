import React, { useState } from 'react';
import { Mail, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { estaAbierta, estaVencida, useBorrarCliente, useGuardarCliente, useVincularClientes } from '../../hooks/tareas';
import { ErrorBox, Modal, Pill, btnGhost, btnPrimary, card, inputClass, labelClass } from './ui';

export default function ClientesVista({ clientes, vinculos, proyectos, tareas, onVerProyecto }) {
  const [editando, setEditando] = useState(null);
  const proyecto = Object.fromEntries(proyectos.map((p) => [p.id, p]));
  const proyectosDe = (clienteId) =>
    vinculos.filter((v) => v.cliente_id === clienteId).map((v) => proyecto[v.proyecto_id]).filter(Boolean);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs text-[#9aafc3] max-w-2xl">
          Un cliente puede tener varios proyectos. Se asocian aquí o desde cada proyecto (pestaña Proyectos → editar).
          Los datos de contacto solo los ve el equipo.
        </p>
        <button type="button" className={btnPrimary} onClick={() => setEditando({})}>
          <Plus className="w-4 h-4" /> Nuevo cliente
        </button>
      </div>

      {!clientes.length && <p className="text-sm text-[#9aafc3]">Todavía no hay clientes.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {clientes.map((c) => {
          const suyos = proyectosDe(c.id);
          const ids = new Set(suyos.map((p) => p.id));
          const deCliente = tareas.filter((t) => ids.has(t.proyecto_id));
          const abiertas = deCliente.filter(estaAbierta).length;
          const vencidas = deCliente.filter(estaVencida).length;
          return (
            <div key={c.id} className={`${card} p-4 flex flex-col gap-3 ${c.activo ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-white font-semibold">{c.nombre}</span>
                  </div>
                  {c.empresa && <p className="text-xs text-[#9aafc3] mt-0.5">{c.empresa}</p>}
                </div>
                <button type="button" onClick={() => setEditando(c)} className="text-[#9aafc3] hover:text-white" aria-label={`Editar ${c.nombre}`}>
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              {(c.email || c.telefono) && (
                <div className="flex flex-wrap gap-3 text-xs text-[#9aafc3]">
                  {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-white"><Mail className="w-3.5 h-3.5" />{c.email}</a>}
                  {c.telefono && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{c.telefono}</span>}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {suyos.length
                  ? suyos.map((p) => (
                      <button key={p.id} type="button" onClick={() => onVerProyecto(p.id)}>
                        <Pill color={p.color}>{p.nombre}</Pill>
                      </button>
                    ))
                  : <span className="text-xs text-[#9aafc3]">Sin proyectos asociados</span>}
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-white">{abiertas} <span className="text-[#9aafc3]">tareas abiertas</span></span>
                {vencidas > 0 && <span className="text-red-300">{vencidas} vencidas</span>}
              </div>
            </div>
          );
        })}
      </div>

      {editando && (
        <ClienteForm
          cliente={editando}
          proyectos={proyectos.filter((p) => p.tipo !== 'area')}
          vinculados={editando.id ? proyectosDe(editando.id).map((p) => p.id) : []}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function ClienteForm({ cliente, proyectos, vinculados, onClose }) {
  const guardar = useGuardarCliente();
  const vincular = useVincularClientes();
  const borrar = useBorrarCliente();
  const [f, setF] = useState({
    nombre: cliente.nombre || '',
    empresa: cliente.empresa || '',
    email: cliente.email || '',
    telefono: cliente.telefono || '',
    notas: cliente.notas || '',
    color: cliente.color || '#e0a64b',
    activo: cliente.activo ?? true,
  });
  const [seleccion, setSeleccion] = useState(new Set(vinculados));
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const alternar = (id) => setSeleccion((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    const guardado = await guardar.mutateAsync({
      id: cliente.id,
      nombre: f.nombre.trim(),
      empresa: f.empresa.trim() || null,
      email: f.email.trim() || null,
      telefono: f.telefono.trim() || null,
      notas: f.notas.trim() || null,
      color: f.color,
      activo: f.activo,
    });
    const antes = new Set(vinculados);
    await vincular.mutateAsync({
      agregar: [...seleccion].filter((id) => !antes.has(id)).map((proyecto_id) => ({ proyecto_id, cliente_id: guardado.id })),
      quitar: [...antes].filter((id) => !seleccion.has(id)).map((proyecto_id) => ({ proyecto_id, cliente_id: guardado.id })),
    });
    onClose();
  };

  const onBorrar = () => {
    if (!window.confirm(`¿Borrar a ${cliente.nombre}? Se quita de sus proyectos; las tareas no se tocan.`)) return;
    borrar.mutate(cliente.id, { onSuccess: onClose });
  };

  const ocupado = guardar.isPending || vincular.isPending;

  return (
    <Modal titulo={cliente.id ? `Editar ${cliente.nombre}` : 'Nuevo cliente'} onClose={onClose} ancho="max-w-lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className={labelClass} htmlFor="c-nombre">Nombre</label>
            <input id="c-nombre" className={inputClass} value={f.nombre} onChange={set('nombre')} required autoFocus />
          </div>
          <div>
            <label className={labelClass} htmlFor="c-color">Color</label>
            <input id="c-color" type="color" className="h-[38px] w-14 rounded-lg bg-transparent border border-white/10" value={f.color} onChange={set('color')} />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="c-empresa">Empresa</label>
          <input id="c-empresa" className={inputClass} value={f.empresa} onChange={set('empresa')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="c-email">Correo</label>
            <input id="c-email" type="email" className={inputClass} value={f.email} onChange={set('email')} />
          </div>
          <div>
            <label className={labelClass} htmlFor="c-tel">Teléfono</label>
            <input id="c-tel" className={inputClass} value={f.telefono} onChange={set('telefono')} inputMode="tel" />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="c-notas">Notas</label>
          <textarea id="c-notas" className={`${inputClass} min-h-[70px]`} value={f.notas} onChange={set('notas')} />
        </div>
        <div>
          <span className={labelClass}>Proyectos de este cliente</span>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {proyectos.map((p) => {
              const activo = seleccion.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => alternar(p.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    activo ? 'border-[#e0a64b] text-white bg-[#e0a64b]/15' : 'border-white/10 text-[#9aafc3] hover:text-white'
                  }`}
                  aria-pressed={activo}
                >
                  {p.nombre}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-[#9aafc3]">
          <input type="checkbox" checked={f.activo} onChange={set('activo')} /> Cliente activo
        </label>
        <ErrorBox error={guardar.error || vincular.error || borrar.error} />
        <div className="flex flex-wrap justify-between gap-2">
          {cliente.id ? (
            <button type="button" onClick={onBorrar} className={`${btnGhost} text-red-300 hover:text-red-200`} disabled={borrar.isPending}>
              <Trash2 className="w-4 h-4" /> Borrar
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
            <button className={btnPrimary} disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
