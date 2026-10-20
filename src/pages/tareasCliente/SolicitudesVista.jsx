// Requests from the client portal + data-subject rights (Ley 21.719, 30 calendar days to answer).
import React, { useState } from 'react';
import { Pill, btnGhost, btnPrimary, card, inputClass } from '../tareas/ui';
import { DERECHOS, diasHasta, fechaCorta, mensajeError, useRpcTcliente } from '../../hooks/tareasCliente';

const fecha = (iso) => new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

export default function SolicitudesVista({ datos, clientes, contactos, onCrearTarea }) {
  const rechazar = useRpcTcliente('tcliente_solicitud_rechazar');
  const resolver = useRpcTcliente('tcliente_derecho_resolver');
  const [respuesta, setRespuesta] = useState({});
  const [error, setError] = useState('');
  const solicitudes = datos?.solicitudes ?? [];
  const derechos = datos?.derechos ?? [];
  const contacto = (id) => contactos.find((c) => c.id === id);
  const cliente = (id) => { const c = clientes.find((x) => x.id === id); return c?.empresa || c?.nombre || '—'; };

  const correr = async (fn) => {
    setError('');
    try { await fn(); } catch (err) { setError(mensajeError(err)); }
  };

  const nuevas = solicitudes.filter((s) => s.estado === 'nueva');
  const pendientes = derechos.filter((d) => d.estado === 'pendiente');

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

      <section>
        <h3 className="text-white font-semibold mb-2">Derechos de datos personales <span className="text-[#9aafc3] font-normal text-sm">· Ley 21.719, responder en 30 días corridos</span></h3>
        {!pendientes.length && <div className={`${card} p-4 text-sm text-[#9aafc3]`}>Ninguna solicitud pendiente.</div>}
        <div className="space-y-2">
          {pendientes.map((d) => {
            const c = contacto(d.contacto_id);
            const quedan = diasHasta(d.vence_el);
            return (
              <div key={d.id} className={`${card} p-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill color="#e66767">{DERECHOS[d.tipo]}</Pill>
                  <span className="text-white text-sm">{c?.nombre ?? 'Contacto'} · {c ? cliente(c.cliente_id) : ''}</span>
                  <span className="ml-auto text-xs" style={{ color: quedan <= 5 ? '#f87171' : '#9aafc3' }}>
                    Pedido el {fecha(d.created_at)} · responder antes del {fechaCorta(d.vence_el)} ({quedan} días)
                  </span>
                </div>
                {d.detalle && <p className="mt-2 text-sm text-[#d6e2ee] whitespace-pre-line">{d.detalle}</p>}
                <p className="mt-2 text-xs text-[#9aafc3]">
                  {d.tipo === 'supresion' && 'Para cumplirla: primero responde aquí (la respuesta le llega por correo) y DESPUÉS Contactos → «Eliminar datos» (solo dueños). Las tareas quedan, con el nombre borrado.'}
                  {d.tipo === 'bloqueo' && 'Para cumplirla: Contactos → «Bloquear» (deja de recibir correos mientras dure).'}
                  {d.tipo === 'oposicion' && 'Los avisos de tareas son parte del contrato; si se acepta, se bloquean sus correos o se cierra su acceso.'}
                </p>
                <div className="mt-3 flex flex-col md:flex-row gap-2">
                  <input className={inputClass} placeholder="Respuesta al titular (le llega por correo y queda como constancia)" value={respuesta[d.id] ?? ''}
                    onChange={(e) => setRespuesta((r) => ({ ...r, [d.id]: e.target.value }))} />
                  <button type="button" className={btnPrimary} onClick={() => correr(() => resolver.mutateAsync({ p_id: d.id, p_estado: 'atendida', p_respuesta: respuesta[d.id] }))}>Atendida</button>
                  <button type="button" className={btnGhost} onClick={() => correr(() => resolver.mutateAsync({ p_id: d.id, p_estado: 'rechazada', p_respuesta: respuesta[d.id] }))}>Rechazar</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-white font-semibold mb-2">Solicitudes de clientes</h3>
        {!nuevas.length && <div className={`${card} p-4 text-sm text-[#9aafc3]`}>No hay solicitudes nuevas.</div>}
        <div className="space-y-2">
          {nuevas.map((s) => {
            const c = contacto(s.contacto_id);
            return (
              <div key={s.id} className={`${card} p-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-white font-medium">{s.titulo}</span>
                  <span className="text-xs text-[#9aafc3]">· {cliente(s.cliente_id)} · {c?.nombre} · {fecha(s.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-[#d6e2ee] whitespace-pre-line">{s.detalle}</p>
                <div className="mt-3 flex flex-col md:flex-row gap-2">
                  <button type="button" className={btnPrimary}
                    onClick={() => onCrearTarea({ solicitud_id: s.id, cliente_id: s.cliente_id, contacto_id: s.contacto_id, titulo: s.titulo, tarea_cliente: '' })}>
                    Crear tarea
                  </button>
                  <input className={inputClass} placeholder="Si no corresponde, explícale por qué" value={respuesta[s.id] ?? ''}
                    onChange={(e) => setRespuesta((r) => ({ ...r, [s.id]: e.target.value }))} />
                  <button type="button" className={btnGhost} onClick={() => correr(() => rechazar.mutateAsync({ p_id: s.id, p_respuesta: respuesta[s.id] }))}>No corresponde</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <details className="text-sm text-[#9aafc3]">
        <summary className="cursor-pointer">Ver resueltas ({solicitudes.length - nuevas.length + derechos.length - pendientes.length})</summary>
        <ul className="mt-2 space-y-1 text-xs">
          {derechos.filter((d) => d.estado !== 'pendiente').map((d) => (
            <li key={d.id}>{fecha(d.created_at)} · {DERECHOS[d.tipo]} · {contacto(d.contacto_id)?.nombre ?? '—'} · {d.estado} — {d.respuesta}</li>
          ))}
          {solicitudes.filter((s) => s.estado !== 'nueva').map((s) => (
            <li key={s.id}>{fecha(s.created_at)} · {s.titulo} · {s.estado}{s.respuesta ? ` — ${s.respuesta}` : ''}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
