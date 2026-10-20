// Recurring client tasks: the cron creates a task from each active template on its day.
import React, { useMemo, useState } from 'react';
import { Plus, Repeat, Trash2 } from 'lucide-react';
import { Modal, Pill, btnGhost, btnPrimary, card, inputClass, labelClass } from '../tareas/ui';
import { fechaCorta, mensajeError, useRpcTcliente } from '../../hooks/tareasCliente';

const DIAS_SEMANA = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes'];

function describirFrecuencia(p) {
  return p.frecuencia === 'semanal' ? `Cada ${DIAS_SEMANA[p.dia]}` : `Cada mes, el día ${p.dia}`;
}

function PlantillaForm({ plantilla, clientes, contactos, equipo, onClose }) {
  const guardar = useRpcTcliente('tcliente_plantilla_guardar');
  const [f, setF] = useState(() => ({
    cliente_id: plantilla?.cliente_id ?? '',
    contacto_id: plantilla?.contacto_id ?? '',
    encargado_id: plantilla?.encargado_id ?? '',
    titulo: plantilla?.titulo ?? '',
    tarea_cliente: plantilla?.tarea_cliente ?? '',
    tarea_encargado: plantilla?.tarea_encargado ?? '',
    entregables: plantilla?.entregables?.length ? [...plantilla.entregables] : [''],
    frecuencia: plantilla?.frecuencia ?? 'mensual',
    dia: plantilla?.dia ?? 5,
    dias_cliente: plantilla?.dias_cliente ?? 7,
    dias_encargado: plantilla?.dias_encargado ?? 4,
  }));
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const contactosCliente = useMemo(() => contactos.filter((c) => c.cliente_id === f.cliente_id && c.activo && !c.anonimizado_at), [contactos, f.cliente_id]);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    const vacios = !f.cliente_id || !f.contacto_id || !f.encargado_id || f.titulo.trim().length < 3
      || f.tarea_cliente.trim().length < 3 || f.tarea_encargado.trim().length < 3 || !f.entregables.some((x) => x.trim());
    if (vacios) return setError('Todos los campos son obligatorios, con al menos un entregable.');
    try {
      await guardar.mutateAsync({
        p: { ...f, id: plantilla?.id, dia: Number(f.dia), dias_cliente: Number(f.dias_cliente), dias_encargado: Number(f.dias_encargado), entregables: f.entregables.filter((x) => x.trim()) },
      });
      onClose();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <Modal titulo={plantilla ? 'Editar tarea recurrente' : 'Nueva tarea recurrente'} onClose={onClose} ancho="max-w-3xl">
      <form onSubmit={enviar} className="space-y-4">
        <div><label className={labelClass}>Objetivo *</label><input className={inputClass} value={f.titulo} onChange={set('titulo')} maxLength={160} placeholder="Ej: Nuevo contenido del mes" /></div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Cliente *</label>
            <select className={inputClass} value={f.cliente_id} disabled={Boolean(plantilla)} onChange={(e) => setF((p) => ({ ...p, cliente_id: e.target.value, contacto_id: '' }))}>
              <option value="">Elegir…</option>
              {clientes.filter((c) => c.activo).map((c) => <option key={c.id} value={c.id}>{c.empresa || c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Quién entrega *</label>
            <select className={inputClass} value={f.contacto_id} onChange={set('contacto_id')}>
              <option value="">Elegir…</option>
              {contactosCliente.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Encargado/a *</label>
            <select className={inputClass} value={f.encargado_id} onChange={set('encargado_id')}>
              <option value="">Elegir…</option>
              {equipo.filter((m) => m.activo).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>Se repite *</label>
            <select className={inputClass} value={f.frecuencia} onChange={(e) => setF((p) => ({ ...p, frecuencia: e.target.value, dia: e.target.value === 'semanal' ? 1 : 5 }))}>
              <option value="mensual">Cada mes</option>
              <option value="semanal">Cada semana</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{f.frecuencia === 'semanal' ? 'Día de la semana *' : 'Día del mes (1-28) *'}</label>
            {f.frecuencia === 'semanal' ? (
              <select className={inputClass} value={f.dia} onChange={set('dia')}>
                {DIAS_SEMANA.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
              </select>
            ) : (
              <input type="number" min={1} max={28} className={inputClass} value={f.dia} onChange={set('dia')} />
            )}
          </div>
          <div><label className={labelClass}>Días para el cliente *</label><input type="number" min={1} max={60} className={inputClass} value={f.dias_cliente} onChange={set('dias_cliente')} /></div>
          <div><label className={labelClass}>Días extra encargado *</label><input type="number" min={0} max={60} className={inputClass} value={f.dias_encargado} onChange={set('dias_encargado')} /></div>
        </div>
        <p className="text-[11px] text-[#9aafc3]">
          Ej.: se crea el día 5; el cliente entrega {Number(f.dias_cliente) || 0} días después y el encargado {Number(f.dias_encargado) || 0} días después del cliente.
        </p>
        <div><label className={labelClass}>Qué hace el cliente *</label><textarea className={`${inputClass} min-h-[60px]`} value={f.tarea_cliente} onChange={set('tarea_cliente')} /></div>
        <div>
          <label className={labelClass}>Entregables *</label>
          <div className="space-y-2">
            {f.entregables.map((x, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputClass} value={x} maxLength={300} onChange={(e) => setF((p) => ({ ...p, entregables: p.entregables.map((y, j) => (j === i ? e.target.value : y)) }))} />
                <button type="button" className={btnGhost} disabled={f.entregables.length === 1} aria-label="Quitar"
                  onClick={() => setF((p) => ({ ...p, entregables: p.entregables.filter((_, j) => j !== i) }))}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <button type="button" className={btnGhost} onClick={() => setF((p) => ({ ...p, entregables: [...p.entregables, ''] }))}><Plus className="w-4 h-4" /> Agregar</button>
          </div>
        </div>
        <div><label className={labelClass}>Qué hace el encargado *</label><textarea className={`${inputClass} min-h-[60px]`} value={f.tarea_encargado} onChange={set('tarea_encargado')} /></div>
        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={guardar.isPending}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

export default function PlantillasVista({ plantillas, clientes, contactos, equipo }) {
  const activar = useRpcTcliente('tcliente_plantilla_activar');
  const [form, setForm] = useState(null);
  const nombreCliente = (id) => { const c = clientes.find((x) => x.id === id); return c?.empresa || c?.nombre || '—'; };
  const nombre = (lista, id) => lista.find((x) => x.id === id)?.nombre ?? '—';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-[#9aafc3] max-w-2xl">Tareas que se crean solas cada semana o cada mes (a las 7:00), con sus entregables y plazos. Al cliente le llega el correo de tarea nueva igual que si la crearas a mano.</p>
        <button type="button" className={`${btnPrimary} ml-auto`} onClick={() => setForm({})}><Plus className="w-4 h-4" /> Nueva recurrente</button>
      </div>
      {!plantillas.length && <div className={`${card} p-6 text-sm text-[#9aafc3]`}>No hay tareas recurrentes.</div>}
      <div className="grid md:grid-cols-2 gap-3">
        {plantillas.map((p) => (
          <div key={p.id} className={`${card} p-4 ${p.activa ? '' : 'opacity-60'}`}>
            <div className="flex items-start gap-2">
              <Repeat className="w-4 h-4 text-[#67c8f3] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-white font-medium">{p.titulo}</div>
                <div className="text-xs text-[#9aafc3]">{nombreCliente(p.cliente_id)} · entrega {nombre(contactos, p.contacto_id)} · encargado {nombre(equipo, p.encargado_id)}</div>
              </div>
              <span className="ml-auto"><Pill color={p.activa ? '#199e70' : '#64748b'}>{p.activa ? 'Activa' : 'Pausada'}</Pill></span>
            </div>
            <div className="mt-2 text-xs text-[#c5d3e0]">{describirFrecuencia(p)} · cliente +{p.dias_cliente} días · encargado +{p.dias_encargado}</div>
            {p.activa && <div className="text-xs text-[#9aafc3]">Próxima: {fechaCorta(p.proxima_fecha)}</div>}
            <div className="mt-3 flex gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(p)}>Editar</button>
              <button type="button" className={btnGhost} onClick={() => activar.mutate({ p_id: p.id, p_activa: !p.activa })}>{p.activa ? 'Pausar' : 'Reanudar'}</button>
            </div>
          </div>
        ))}
      </div>
      {form && <PlantillaForm plantilla={form.id ? form : null} clientes={clientes} contactos={contactos} equipo={equipo} onClose={() => setForm(null)} />}
    </div>
  );
}
