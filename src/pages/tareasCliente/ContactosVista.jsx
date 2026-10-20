// People of each client with access to /mi-espacio: create, give access (Edge Function), block, delete data.
import React, { useMemo, useState } from 'react';
import { KeyRound, Plus, ShieldOff, UserX } from 'lucide-react';
import { Modal, Pill, btnGhost, btnPrimary, card, inputClass, labelClass } from '../tareas/ui';
import { mensajeError, useDarAcceso, useRpcTcliente } from '../../hooks/tareasCliente';

const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function ContactoForm({ contacto, clienteId, clientes, onClose }) {
  const guardar = useRpcTcliente('tcliente_contacto_guardar');
  const [f, setF] = useState({
    cliente_id: contacto?.cliente_id ?? clienteId ?? '',
    nombre: contacto?.nombre ?? '',
    email: contacto?.email ?? '',
    telefono: contacto?.telefono ?? '',
    cargo: contacto?.cargo ?? '',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.cliente_id || !f.nombre.trim() || !f.email.trim()) return setError('Cliente, nombre y correo son obligatorios.');
    try {
      await guardar.mutateAsync({ p: { ...f, id: contacto?.id } });
      onClose();
    } catch (err) {
      setError(mensajeError(err));
    }
  };
  return (
    <Modal titulo={contacto ? 'Editar contacto' : 'Nuevo contacto del cliente'} onClose={onClose}>
      <form onSubmit={enviar} className="space-y-3">
        <div>
          <label className={labelClass}>Cliente *</label>
          <select className={inputClass} value={f.cliente_id} onChange={set('cliente_id')} disabled={Boolean(contacto)}>
            <option value="">Elegir…</option>
            {clientes.filter((c) => c.activo).map((c) => <option key={c.id} value={c.id}>{c.empresa || c.nombre}</option>)}
          </select>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className={labelClass}>Nombre *</label><input className={inputClass} value={f.nombre} onChange={set('nombre')} maxLength={120} /></div>
          <div><label className={labelClass}>Correo * (es su usuario)</label><input type="email" className={inputClass} value={f.email} onChange={set('email')} maxLength={120} /></div>
          <div><label className={labelClass}>Teléfono</label><input className={inputClass} value={f.telefono} onChange={set('telefono')} maxLength={30} /></div>
          <div><label className={labelClass}>Cargo</label><input className={inputClass} value={f.cargo} onChange={set('cargo')} maxLength={80} /></div>
        </div>
        <p className="text-[11px] text-[#9aafc3]">
          Datos personales (Ley 21.719): solo los necesarios para coordinar sus tareas. Al darle acceso, el correo de bienvenida le
          informa para qué se usan y cómo ejercer sus derechos.
        </p>
        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={guardar.isPending}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

export default function ContactosVista({ clientes, contactos, esDueno }) {
  const darAcceso = useDarAcceso();
  const guardar = useRpcTcliente('tcliente_contacto_guardar');
  const bloqueo = useRpcTcliente('tcliente_contacto_bloqueo');
  const anonimizar = useRpcTcliente('tcliente_contacto_anonimizar');
  const [form, setForm] = useState(null);
  const [aviso, setAviso] = useState({ tipo: '', texto: '' });
  const [verInactivos, setVerInactivos] = useState(false);

  const porCliente = useMemo(() => {
    const m = new Map();
    for (const c of contactos) {
      if (!verInactivos && (!c.activo || c.anonimizado_at)) continue;
      if (!m.has(c.cliente_id)) m.set(c.cliente_id, []);
      m.get(c.cliente_id).push(c);
    }
    return clientes.filter((c) => m.has(c.id)).map((c) => ({ cliente: c, contactos: m.get(c.id) }));
  }, [clientes, contactos, verInactivos]);

  const correr = async (fn, ok) => {
    setAviso({ tipo: '', texto: '' });
    try {
      await fn();
      if (ok) setAviso({ tipo: 'ok', texto: ok });
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-[#9aafc3] max-w-2xl">
          Las personas de cada cliente que entran a <b className="text-white">nexcommit.com/mi-espacio</b>. «Dar acceso» crea su usuario con una
          contraseña fácil y le manda un correo con un botón para verla una sola vez.
        </p>
        <label className="flex items-center gap-1.5 text-xs text-[#9aafc3] ml-auto">
          <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} /> Ver desactivados
        </label>
        <button type="button" className={btnPrimary} onClick={() => setForm({})}><Plus className="w-4 h-4" /> Nuevo contacto</button>
      </div>
      {aviso.texto && (
        <div className={`rounded-lg px-3 py-2 text-sm border ${aviso.tipo === 'ok' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
          {aviso.texto}
        </div>
      )}

      {!porCliente.length && <div className={`${card} p-6 text-sm text-[#9aafc3]`}>Todavía no hay contactos. Crea el primero para poder asignarle tareas.</div>}

      {porCliente.map(({ cliente, contactos: lista }) => (
        <section key={cliente.id} className={`${card} p-4`}>
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cliente.color }} />
            {cliente.empresa || cliente.nombre}
          </h3>
          <ul className="divide-y divide-white/5">
            {lista.map((c) => (
              <li key={c.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-[200px]">
                  <div className="text-white text-sm font-medium">{c.nombre}{c.cargo && <span className="text-[#9aafc3] font-normal"> · {c.cargo}</span>}</div>
                  <div className="text-xs text-[#9aafc3]">{c.anonimizado_at ? 'Datos eliminados' : c.email}</div>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {c.anonimizado_at ? <Pill color="#64748b">Eliminado {fecha(c.anonimizado_at)}</Pill>
                    : !c.activo ? <Pill color="#64748b">Desactivado</Pill>
                    : c.user_id ? <Pill color="#199e70">Con acceso{c.ultimo_ingreso_at ? ` · entró ${fecha(c.ultimo_ingreso_at)}` : ' · aún no entra'}</Pill>
                    : <Pill color="#c98500">Sin acceso</Pill>}
                  {c.bloqueado_at && <Pill color="#e66767">Bloqueado: no recibe correos</Pill>}
                </div>
                {!c.anonimizado_at && (
                  <div className="ml-auto flex flex-wrap gap-1.5">
                    {c.activo && (
                      <button type="button" className={btnGhost} disabled={darAcceso.isPending}
                        onClick={() => {
                          const msg = c.user_id
                            ? `¿Generar una contraseña NUEVA para ${c.nombre}? La actual deja de funcionar y le llega un correo para ver la nueva.`
                            : `¿Dar acceso a ${c.nombre}? Le llegará un correo de bienvenida a ${c.email}.`;
                          if (window.confirm(msg)) correr(() => darAcceso.mutateAsync(c.id), `Listo: le enviamos el acceso a ${c.email}.`);
                        }}>
                        <KeyRound className="w-4 h-4" /> {c.user_id ? 'Nueva contraseña' : 'Dar acceso'}
                      </button>
                    )}
                    <button type="button" className={btnGhost} onClick={() => setForm(c)}>Editar</button>
                    <button type="button" className={btnGhost} title="Derecho de bloqueo: deja de recibir correos"
                      onClick={() => correr(() => bloqueo.mutateAsync({ p_id: c.id, p_bloquear: !c.bloqueado_at }))}>
                      <ShieldOff className="w-4 h-4" /> {c.bloqueado_at ? 'Desbloquear' : 'Bloquear'}
                    </button>
                    <button type="button" className={btnGhost}
                      onClick={() => correr(() => guardar.mutateAsync({ p: { ...c, activo: !c.activo } }))}>
                      {c.activo ? 'Desactivar' : 'Reactivar'}
                    </button>
                    {esDueno && (
                      <button type="button" className={`${btnGhost} hover:!text-red-400`} title="Derecho de supresión"
                        onClick={() => window.confirm(`Esto borra para siempre el nombre, correo y teléfono de ${c.nombre} y su usuario. Sus tareas quedan como «Contacto eliminado». ¿Seguir?`)
                          && correr(() => anonimizar.mutateAsync({ p_id: c.id }), 'Datos eliminados.')}>
                        <UserX className="w-4 h-4" /> Eliminar datos
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {form && <ContactoForm contacto={form.id ? form : null} clientes={clientes} onClose={() => setForm(null)} />}
    </div>
  );
}
