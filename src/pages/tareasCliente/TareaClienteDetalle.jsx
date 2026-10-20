// Team view of one client task: both halves, deliverables, files, notes, history and sent emails.
import React, { useRef, useState } from 'react';
import { Ban, Check, CornerUpLeft, Download, Lock, Paperclip, Pencil, X } from 'lucide-react';
import { Modal, Pill, btnGhost, btnPrimary, inputClass, labelClass } from '../tareas/ui';
import {
  ESTADO_CLIENTE,
  ESTADO_ENCARGADO,
  abrirArchivo,
  diasHasta,
  esperaCliente,
  estaCerrada,
  fechaCorta,
  mensajeError,
  pesoLegible,
  subirArchivo,
  textoPlazo,
  useDetalleTareaCliente,
  useRpcTcliente,
} from '../../hooks/tareasCliente';
import { useQueryClient } from '@tanstack/react-query';

const fechaHora = (iso) =>
  new Date(iso).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const NOMBRE_AVISO = {
  cliente_nueva: 'Tarea nueva al cliente',
  cliente_diario: 'Recordatorio diario al cliente',
  cliente_devuelta: 'Devolución al cliente',
  encargado_asignado: 'Asignación al encargado',
  encargado_entrega: 'Entrega al encargado',
  encargado_nota: 'Nota al encargado',
  encargado_recordatorio: 'Recordatorio al encargado',
  duenos_vencida: 'Vencida a los dueños',
};

function Plazo({ fecha, activo }) {
  const n = diasHasta(fecha);
  const color = !activo ? '#9aafc3' : n < 0 ? '#f87171' : n <= 1 ? '#f59e0b' : '#9aafc3';
  return (
    <span className="text-xs" style={{ color }}>
      {fechaCorta(fecha)}{activo ? ` · ${textoPlazo(fecha)}` : ''}
    </span>
  );
}

export default function TareaClienteDetalle({ tarea: t, onClose, onEditar }) {
  const qc = useQueryClient();
  const { data, isLoading } = useDetalleTareaCliente(t.id);
  const marcar = useRpcTcliente('tcliente_entregable_marcar');
  const aprobar = useRpcTcliente('tcliente_aprobar');
  const devolver = useRpcTcliente('tcliente_devolver');
  const estadoEnc = useRpcTcliente('tcliente_encargado_estado');
  const nota = useRpcTcliente('tcliente_nota');
  const cancelar = useRpcTcliente('tcliente_cancelar');
  const quitar = useRpcTcliente('tcliente_quitar_archivo');
  const [error, setError] = useState('');
  const [textoNota, setTextoNota] = useState('');
  const [interna, setInterna] = useState(false);
  const [devolviendo, setDevolviendo] = useState(false);
  const [textoDevolver, setTextoDevolver] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const inputArchivo = useRef(null);
  const destino = useRef(null);

  const cerrada = estaCerrada(t);
  const correr = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const elegirArchivos = (entregableId) => {
    destino.current = entregableId;
    inputArchivo.current?.click();
  };
  const alElegir = async (e) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    if (!files.length) return;
    setSubiendo(true);
    await correr(async () => {
      for (const file of files) await subirArchivo({ tareaId: t.id, entregableId: destino.current, file });
    });
    setSubiendo(false);
    qc.invalidateQueries({ queryKey: ['tcliente'] });
  };

  const archivosDe = (entregableId) => (data?.archivos ?? []).filter((a) => (a.entregable_id ?? null) === entregableId);
  const listaArchivos = (lista) =>
    lista.length ? (
      <ul className="mt-1 space-y-1">
        {lista.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-xs text-[#c5d3e0]">
            <Paperclip className="w-3 h-3 shrink-0" />
            <button type="button" className="truncate hover:text-white underline-offset-2 hover:underline" onClick={() => correr(() => abrirArchivo(a.ruta, a.nombre))}>
              {a.nombre}
            </button>
            <span className="text-[#5f7891] shrink-0">{pesoLegible(a.tamano)} · {a.subido_por}</span>
            {a.borrado_at ? (
              <span className="text-[#5f7891]">(borrado por plazo)</span>
            ) : (
              <button type="button" className="ml-auto text-[#5f7891] hover:text-red-400" aria-label={`Quitar ${a.nombre}`}
                onClick={() => window.confirm(`¿Quitar «${a.nombre}»?`) && correr(() => quitar.mutateAsync({ p_archivo: a.id }))}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    ) : null;

  const ec = ESTADO_CLIENTE[t.estado_cliente];
  const hechos = t.entregables.filter((x) => x.hecho).length;

  return (
    <Modal titulo={`#${t.numero} · ${t.titulo}`} onClose={onClose} ancho="max-w-4xl">
      <input ref={inputArchivo} type="file" multiple className="hidden" onChange={alElegir} />
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-[#9aafc3]">
        <Pill color={t.cliente?.color || '#e0a64b'}>{t.cliente?.empresa || t.cliente?.nombre}</Pill>
        <span>Entrega: <b className="text-white">{t.contacto?.nombre}</b></span>
        <span>· Encargado/a: <b className="text-white">{t.encargado?.nombre}</b></span>
        {t.cancelada_at && <Pill color="#64748b">Cancelada</Pill>}
        {t.cerrada_at && <Pill color="#199e70">Cumplida</Pill>}
        <div className="ml-auto flex gap-2">
          {!cerrada && (
            <button type="button" className={btnGhost} onClick={onEditar}><Pencil className="w-4 h-4" /> Editar</button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Client half */}
        <section className="rounded-xl border border-[#3987e5]/30 bg-[#3987e5]/5 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-[#8fc0f5]">Cliente · {t.contacto?.nombre}</h3>
            <Pill color={ec.color}>{ec.label}</Pill>
          </div>
          <Plazo fecha={t.fecha_cliente} activo={esperaCliente(t)} />
          <p className="mt-2 text-sm text-[#d6e2ee] whitespace-pre-line">{t.tarea_cliente}</p>
          <div className="mt-3 text-xs text-[#9aafc3]">Entregables · {hechos}/{t.entregables.length}</div>
          <ul className="mt-1 space-y-2">
            {t.entregables.map((x) => (
              <li key={x.id} className="rounded-lg bg-black/10 px-2.5 py-2">
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1 accent-[#199e70]" checked={x.hecho} disabled={cerrada}
                    onChange={(e) => correr(() => marcar.mutateAsync({ p_entregable: x.id, p_hecho: e.target.checked }))} />
                  <span className={`text-sm ${x.hecho ? 'text-[#9aafc3] line-through' : 'text-white'}`}>{x.texto}</span>
                  {!cerrada && (
                    <button type="button" className="ml-auto text-[#9aafc3] hover:text-white" title="Subir archivo a este entregable"
                      onClick={() => elegirArchivos(x.id)}>
                      <Paperclip className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {listaArchivos(archivosDe(x.id))}
              </li>
            ))}
          </ul>
          {archivosDe(null).length > 0 && (
            <div className="mt-3"><div className="text-xs text-[#9aafc3]">Otros archivos</div>{listaArchivos(archivosDe(null))}</div>
          )}
          {!cerrada && (
            <button type="button" className={`${btnGhost} mt-3`} onClick={() => elegirArchivos(null)} disabled={subiendo}>
              <Paperclip className="w-4 h-4" /> {subiendo ? 'Subiendo…' : 'Subir archivo'}
            </button>
          )}

          {!cerrada && t.estado_cliente === 'entregada' && !devolviendo && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} onClick={() => correr(() => aprobar.mutateAsync({ p_tarea: t.id }))}>
                <Check className="w-4 h-4" /> Aprobar entrega
              </button>
              <button type="button" className={btnGhost} onClick={() => setDevolviendo(true)}>
                <CornerUpLeft className="w-4 h-4" /> Falta algo
              </button>
            </div>
          )}
          {devolviendo && (
            <div className="mt-4 space-y-2">
              <label className={labelClass}>¿Qué falta? (le llega al cliente por correo)</label>
              <textarea className={`${inputClass} min-h-[70px]`} value={textoDevolver} onChange={(e) => setTextoDevolver(e.target.value)} />
              <div className="flex gap-2">
                <button type="button" className={btnPrimary} onClick={() => correr(async () => {
                  await devolver.mutateAsync({ p_tarea: t.id, p_nota: textoDevolver });
                  setDevolviendo(false);
                  setTextoDevolver('');
                })}>Devolver al cliente</button>
                <button type="button" className={btnGhost} onClick={() => setDevolviendo(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </section>

        {/* Team half */}
        <section className="rounded-xl border border-[#199e70]/30 bg-[#199e70]/5 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-[#6fd3ad]">NexCommit · {t.encargado?.nombre}</h3>
            <Pill color={ESTADO_ENCARGADO[t.estado_encargado].color}>{ESTADO_ENCARGADO[t.estado_encargado].label}</Pill>
          </div>
          <Plazo fecha={t.fecha_encargado} activo={!cerrada && t.estado_encargado !== 'lista'} />
          <p className="mt-2 text-sm text-[#d6e2ee] whitespace-pre-line">{t.tarea_encargado}</p>
          {!cerrada && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(ESTADO_ENCARGADO).map(([id, e]) => (
                <button key={id} type="button" disabled={t.estado_encargado === id}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${t.estado_encargado === id ? 'text-white' : 'text-[#9aafc3] border-white/10 hover:text-white'}`}
                  style={t.estado_encargado === id ? { borderColor: e.color, backgroundColor: `${e.color}26` } : undefined}
                  onClick={() => correr(() => estadoEnc.mutateAsync({ p_tarea: t.id, p_estado: id }))}>
                  {e.label}
                </button>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-[#9aafc3]">
            La tarea se cierra sola cuando la entrega del cliente está aprobada y esta parte está «Lista».
          </p>
        </section>
      </div>

      {/* Notes */}
      <section className="mt-5">
        <h3 className="text-sm font-semibold text-white mb-2">Notas</h3>
        {isLoading ? <p className="text-sm text-[#9aafc3]">Cargando…</p> : (
          <ul className="space-y-2 mb-3">
            {(data?.notas ?? []).map((n) => (
              <li key={n.id} className={`rounded-lg px-3 py-2 text-sm ${n.interna ? 'bg-amber-500/10 border border-amber-500/20' : n.autor_contacto_id ? 'bg-[#3987e5]/10' : 'bg-white/5'}`}>
                <div className="text-xs text-[#9aafc3] mb-0.5 flex items-center gap-1">
                  {n.interna && <Lock className="w-3 h-3" />} <b className="text-[#c5d3e0]">{n.autor_nombre}</b> · {fechaHora(n.created_at)}
                  {n.interna && ' · solo el equipo'}
                </div>
                <div className="text-[#e3ebf3] whitespace-pre-line">{n.texto}</div>
              </li>
            ))}
            {!data?.notas?.length && <li className="text-sm text-[#5f7891]">Sin notas todavía.</li>}
          </ul>
        )}
        <div className="flex flex-col gap-2">
          <textarea className={`${inputClass} min-h-[60px]`} value={textoNota} onChange={(e) => setTextoNota(e.target.value)} placeholder="Escribe una nota…" maxLength={4000} />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-[#9aafc3]">
              <input type="checkbox" checked={interna} onChange={(e) => setInterna(e.target.checked)} /> Interna (el cliente no la ve)
            </label>
            <button type="button" className={`${btnPrimary} ml-auto`} disabled={!textoNota.trim() || nota.isPending}
              onClick={() => correr(async () => {
                await nota.mutateAsync({ p_tarea: t.id, p_texto: textoNota, p_interna: interna, p_entregable: null });
                setTextoNota('');
              })}>
              Agregar nota
            </button>
          </div>
        </div>
      </section>

      <div className="mt-5 grid md:grid-cols-2 gap-4">
        <section>
          <h3 className="text-sm font-semibold text-white mb-2">Historial</h3>
          <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
            {(data?.historial ?? []).map((h) => (
              <li key={h.id} className="text-xs text-[#9aafc3]">
                <span className="text-[#5f7891]">{fechaHora(h.created_at)}</span> · <b className="text-[#c5d3e0]">{h.actor}</b> {h.accion}
                {h.detalle && <span className="text-[#7f95aa]"> — {h.detalle}</span>}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="text-sm font-semibold text-white mb-2">Correos enviados</h3>
          <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
            {(data?.avisos ?? []).map((a) => (
              <li key={a.id} className="text-xs text-[#9aafc3]">
                <span className="text-[#5f7891]">{fechaHora(a.created_at)}</span> · {NOMBRE_AVISO[a.tipo] ?? a.tipo}{' '}
                <span style={{ color: a.estado === 'enviado' ? '#6fd3ad' : a.estado === 'error' ? '#f87171' : '#f59e0b' }}>
                  {a.estado}
                </span>
                {a.detalle && <span className="text-[#7f95aa]"> — {a.detalle}</span>}
              </li>
            ))}
            {!data?.avisos?.length && <li className="text-xs text-[#5f7891]">Ninguno todavía.</li>}
          </ul>
        </section>
      </div>

      {!cerrada && (
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-between">
          <button type="button" className="inline-flex items-center gap-1.5 text-xs text-[#9aafc3] hover:text-red-400"
            onClick={() => {
              const motivo = window.prompt('¿Por qué se cancela esta tarea? (queda en el historial)');
              if (motivo) correr(async () => { await cancelar.mutateAsync({ p_tarea: t.id, p_motivo: motivo }); onClose(); });
            }}>
            <Ban className="w-3.5 h-3.5" /> Cancelar tarea
          </button>
          <span className="text-[11px] text-[#5f7891] inline-flex items-center gap-1">
            <Download className="w-3 h-3" /> Los archivos se borran 180 días después de cerrar la tarea.
          </span>
        </div>
      )}
    </Modal>
  );
}
