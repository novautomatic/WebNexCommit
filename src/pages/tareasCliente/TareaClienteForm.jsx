// Create / edit a client task. Every field is required (also enforced in SQL by tcliente_guardar).
import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal, btnGhost, btnPrimary, inputClass, labelClass } from '../tareas/ui';
import { hoyISO } from '../../hooks/tareas';
import { mensajeError, useRpcTcliente } from '../../hooks/tareasCliente';

function sumarDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + n));
  return f.toISOString().slice(0, 10);
}

export default function TareaClienteForm({ tarea, inicial, clientes, contactos, equipo, onClose, onGuardada }) {
  const guardar = useRpcTcliente('tcliente_guardar');
  const editando = Boolean(tarea);
  const [f, setF] = useState(() => ({
    cliente_id: tarea?.cliente_id ?? inicial?.cliente_id ?? '',
    contacto_id: tarea?.contacto_id ?? inicial?.contacto_id ?? '',
    encargado_id: tarea?.encargado_id ?? '',
    titulo: tarea?.titulo ?? inicial?.titulo ?? '',
    tarea_cliente: tarea?.tarea_cliente ?? inicial?.tarea_cliente ?? '',
    tarea_encargado: tarea?.tarea_encargado ?? '',
    fecha_cliente: tarea?.fecha_cliente ?? sumarDias(hoyISO(), 3),
    fecha_encargado: tarea?.fecha_encargado ?? sumarDias(hoyISO(), 7),
    entregables: tarea?.entregables?.length ? tarea.entregables.map((x) => ({ id: x.id, texto: x.texto })) : [{ texto: '' }],
  }));
  const [error, setError] = useState('');

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const contactosCliente = useMemo(
    () => contactos.filter((c) => c.cliente_id === f.cliente_id && c.activo && !c.anonimizado_at),
    [contactos, f.cliente_id],
  );
  const activos = equipo.filter((m) => m.activo);

  const faltan = [];
  if (f.titulo.trim().length < 3) faltan.push('objetivo');
  if (!f.cliente_id) faltan.push('cliente');
  if (!f.contacto_id) faltan.push('quién entrega');
  if (!f.encargado_id) faltan.push('encargado');
  if (f.tarea_cliente.trim().length < 3) faltan.push('tarea del cliente');
  if (!f.entregables.some((x) => x.texto.trim())) faltan.push('entregables');
  if (f.tarea_encargado.trim().length < 3) faltan.push('tarea del encargado');
  if (!f.fecha_cliente || !f.fecha_encargado) faltan.push('fechas');
  else if (f.fecha_encargado < f.fecha_cliente) faltan.push('la fecha del encargado va después de la del cliente');

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (faltan.length) return setError(`Falta: ${faltan.join(', ')}.`);
    try {
      const r = await guardar.mutateAsync({
        p: {
          ...f,
          id: tarea?.id,
          solicitud_id: inicial?.solicitud_id,
          entregables: f.entregables.filter((x) => x.texto.trim()),
        },
      });
      onGuardada?.(r);
      onClose();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const setEntregable = (i, texto) =>
    setF((p) => ({ ...p, entregables: p.entregables.map((x, j) => (j === i ? { ...x, texto } : x)) }));

  return (
    <Modal titulo={editando ? `Editar tarea #${tarea.numero}` : 'Nueva tarea de cliente'} onClose={onClose} ancho="max-w-3xl">
      <form onSubmit={enviar} className="space-y-5">
        <div>
          <label className={labelClass}>Objetivo de la tarea *</label>
          <input className={inputClass} value={f.titulo} onChange={set('titulo')} maxLength={160} placeholder="Ej: Nuevo contenido Dyetales" autoFocus />
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Cliente *</label>
            <select
              className={inputClass}
              value={f.cliente_id}
              disabled={editando}
              onChange={(e) => setF((p) => ({ ...p, cliente_id: e.target.value, contacto_id: '' }))}
            >
              <option value="">Elegir…</option>
              {clientes.filter((c) => c.activo || c.id === f.cliente_id).map((c) => (
                <option key={c.id} value={c.id}>{c.empresa ? `${c.empresa} (${c.nombre})` : c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Quién del cliente entrega *</label>
            <select className={inputClass} value={f.contacto_id} onChange={set('contacto_id')} disabled={!f.cliente_id}>
              <option value="">{f.cliente_id && !contactosCliente.length ? 'Sin contactos: agrégalos en «Contactos»' : 'Elegir…'}</option>
              {contactosCliente.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Encargado/a de NexCommit *</label>
            <select className={inputClass} value={f.encargado_id} onChange={set('encargado_id')}>
              <option value="">Elegir…</option>
              {activos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
        </div>

        <fieldset className="rounded-xl border border-[#3987e5]/30 bg-[#3987e5]/5 p-4 space-y-3">
          <legend className="px-2 text-sm font-semibold text-[#8fc0f5]">Lo que entrega el cliente</legend>
          <div>
            <label className={labelClass}>Qué tiene que hacer *</label>
            <textarea className={`${inputClass} min-h-[70px]`} value={f.tarea_cliente} onChange={set('tarea_cliente')} maxLength={4000}
              placeholder="Ej: Subir las imágenes nuevas, la documentación de cada producto y sus variables" />
          </div>
          <div>
            <label className={labelClass}>Entregables (el cliente los marca uno a uno) *</label>
            <div className="space-y-2">
              {f.entregables.map((x, i) => (
                <div key={x.id ?? `n${i}`} className="flex gap-2">
                  <input className={inputClass} value={x.texto} maxLength={300} onChange={(e) => setEntregable(i, e.target.value)}
                    placeholder={['Imágenes nuevas', 'Ficha de cada producto', 'Tallas y colores'][i] ?? 'Otro entregable'} />
                  <button type="button" className={btnGhost} aria-label="Quitar entregable" disabled={f.entregables.length === 1}
                    onClick={() => setF((p) => ({ ...p, entregables: p.entregables.filter((_, j) => j !== i) }))}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {f.entregables.length < 30 && (
                <button type="button" className={btnGhost} onClick={() => setF((p) => ({ ...p, entregables: [...p.entregables, { texto: '' }] }))}>
                  <Plus className="w-4 h-4" /> Agregar entregable
                </button>
              )}
            </div>
          </div>
          <div className="max-w-xs">
            <label className={labelClass}>Fecha de entrega del cliente *</label>
            <input type="date" className={inputClass} value={f.fecha_cliente} min={editando ? undefined : hoyISO()} onChange={set('fecha_cliente')} />
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-[#199e70]/30 bg-[#199e70]/5 p-4 space-y-3">
          <legend className="px-2 text-sm font-semibold text-[#6fd3ad]">Lo que hace el encargado</legend>
          <div>
            <label className={labelClass}>Qué tiene que hacer *</label>
            <textarea className={`${inputClass} min-h-[70px]`} value={f.tarea_encargado} onChange={set('tarea_encargado')} maxLength={4000}
              placeholder="Ej: Subir los productos a la tienda, verificar Google Shopping y verificar que el cliente cumpla con la entrega" />
            <p className="mt-1 text-[11px] text-[#9aafc3]">El cliente también ve esto en su portal, para saber qué hacemos con su entrega.</p>
          </div>
          <div className="max-w-xs">
            <label className={labelClass}>Fecha de entrega del encargado *</label>
            <input type="date" className={inputClass} value={f.fecha_encargado} min={f.fecha_cliente} onChange={set('fecha_encargado')} />
          </div>
        </fieldset>

        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!editando && <span className="text-xs text-[#9aafc3] mr-auto">Al crearla, al cliente le llega un correo con la tarea.</span>}
          <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear tarea'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
