// One task card in the client portal: checklist, files per deliverable, notes, "Listo, entregué".
import React, { useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Loader2, MessageCircle, Paperclip, PartyPopper, Send, Upload, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { abrirArchivo, diasHasta, fechaCorta, mensajeError, pesoLegible, subirArchivo } from '../../hooks/tareasCliente';

const fechaHora = (iso) => new Date(iso).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function ChipPlazo({ fecha, activa }) {
  const n = diasHasta(fecha);
  if (!activa) return <span className="text-xs text-slate-500">{fechaCorta(fecha)}</span>;
  const [texto, clase] =
    n > 1 ? [`Faltan ${n} días · ${fechaCorta(fecha)}`, 'bg-sky-50 text-sky-700 ring-sky-200']
    : n === 1 ? [`Mañana · ${fechaCorta(fecha)}`, 'bg-amber-50 text-amber-700 ring-amber-200']
    : n === 0 ? ['Vence hoy ⏰', 'bg-amber-50 text-amber-700 ring-amber-200']
    : [`Venció el ${fechaCorta(fecha)} · ¡aún estás a tiempo!`, 'bg-rose-50 text-rose-700 ring-rose-200'];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${clase}`}>{texto}</span>;
}

const ESTADO_NEXCOMMIT = {
  pendiente: 'Esperando tu entrega para empezar',
  en_progreso: 'Trabajando en ello 🛠️',
  lista: '¡Listo! ✅',
};

export default function PortalTarea({ t, abiertaInicial = false }) {
  const qc = useQueryClient();
  const [abierta, setAbierta] = useState(abiertaInicial);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState('');
  const [nota, setNota] = useState('');
  const input = useRef(null);
  const destino = useRef(null);

  const cerrada = Boolean(t.cerrada_at || t.cancelada_at);
  const meToca = !cerrada && ['pendiente', 'devuelta'].includes(t.estado_cliente);
  const hechos = t.entregables.filter((x) => x.hecho).length;
  const total = t.entregables.length;
  const todo = hechos === total;
  const ultimaDelEquipo = [...t.notas].reverse().find((n) => n.del_equipo);

  const refrescar = () => qc.invalidateQueries({ queryKey: ['portal'] });
  const correr = async (clave, fn) => {
    setError('');
    setOcupado(clave);
    try {
      await fn();
      await refrescar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setOcupado('');
    }
  };
  const rpc = async (nombre, args) => {
    const { error: e } = await supabase.rpc(nombre, args);
    if (e) throw e;
  };

  const elegir = (entregableId) => {
    destino.current = entregableId;
    input.current?.click();
  };
  const alElegir = (e) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    if (files.length) correr(`subir-${destino.current}`, async () => {
      for (const file of files) await subirArchivo({ tareaId: t.id, entregableId: destino.current, file });
    });
  };

  const archivosDe = (id) => t.archivos.filter((a) => (a.entregable_id ?? null) === id);
  const archivos = (lista) => (lista.length ? (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {lista.map((a) => (
        <li key={a.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 pl-2.5 pr-1 py-1 text-xs text-slate-700 max-w-full">
          <Paperclip className="w-3 h-3 shrink-0" />
          <button type="button" className="truncate hover:underline" onClick={() => correr('', () => abrirArchivo(a.ruta, a.nombre))}>{a.nombre}</button>
          <span className="text-slate-400 shrink-0">{pesoLegible(a.tamano)}</span>
          {a.mio && meToca && (
            <button type="button" aria-label={`Quitar ${a.nombre}`} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-rose-600"
              onClick={() => window.confirm(`¿Quitar «${a.nombre}»?`) && correr('', () => rpc('tcliente_quitar_archivo', { p_archivo: a.id }))}>
              <X className="w-3 h-3" />
            </button>
          )}
        </li>
      ))}
    </ul>
  ) : null);

  return (
    <article id={`tarea-${t.id}`} className={`rounded-2xl bg-white shadow-sm ring-1 ${t.estado_cliente === 'devuelta' && !cerrada ? 'ring-rose-200' : 'ring-slate-200'} overflow-hidden`}>
      <input ref={input} type="file" multiple className="hidden" onChange={alElegir} />
      <button type="button" onClick={() => setAbierta((a) => !a)} className="w-full text-left p-5 flex items-start gap-3" aria-expanded={abierta}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {meToca && <ChipPlazo fecha={t.fecha_cliente} activa />}
            {!meToca && !cerrada && t.estado_cliente === 'entregada' && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">Entregada · la estamos revisando 👀</span>}
            {!meToca && !cerrada && t.estado_cliente === 'aprobada' && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">Tu parte está aprobada 🙌</span>}
            {t.cerrada_at && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">Cumplida 🎉</span>}
            {t.cancelada_at && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Cancelada</span>}
          </div>
          <h3 className="text-lg font-bold text-slate-900 leading-snug">{t.titulo}</h3>
          {!t.es_mia && <p className="text-xs text-slate-500 mt-0.5">Le toca a {t.responsable}</p>}
          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#248bde] to-[#67c8f3] transition-all" style={{ width: `${total ? (hechos / total) * 100 : 0}%` }} />
            </div>
            <span className="text-xs font-medium text-slate-500">{hechos}/{total}</span>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 mt-1 transition-transform ${abierta ? 'rotate-180' : ''}`} />
      </button>

      {abierta && (
        <div className="px-5 pb-5 space-y-5">
          {t.estado_cliente === 'devuelta' && ultimaDelEquipo && !cerrada && (
            <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900 ring-1 ring-rose-100">
              <b>{ultimaDelEquipo.autor.split(' ')[0]} revisó tu entrega y nos falta un detalle:</b>
              <p className="mt-1 whitespace-pre-line">{ultimaDelEquipo.texto}</p>
            </div>
          )}

          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-[#248bde] mb-1.5">Lo que necesitamos de ti</h4>
            <p className="text-slate-700 whitespace-pre-line">{t.tarea_cliente}</p>
            <ul className="mt-3 space-y-2">
              {t.entregables.map((x) => (
                <li key={x.id} className={`rounded-xl p-3 ring-1 ${x.hecho ? 'bg-emerald-50/60 ring-emerald-100' : 'bg-slate-50 ring-slate-100'}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={x.hecho} disabled={!meToca || ocupado === `m-${x.id}`}
                      onChange={(e) => correr(`m-${x.id}`, () => rpc('tcliente_entregable_marcar', { p_entregable: x.id, p_hecho: e.target.checked }))}
                      className="mt-0.5 h-5 w-5 rounded accent-emerald-600 cursor-pointer disabled:cursor-default" aria-label={x.texto} />
                    <span className={`flex-1 text-sm ${x.hecho ? 'text-slate-500 line-through' : 'text-slate-800 font-medium'}`}>{x.texto}</span>
                    {meToca && (
                      <button type="button" onClick={() => elegir(x.id)} disabled={Boolean(ocupado)}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#248bde] ring-1 ring-sky-200 hover:bg-sky-50 disabled:opacity-50">
                        {ocupado === `subir-${x.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Subir
                      </button>
                    )}
                  </div>
                  {archivos(archivosDe(x.id))}
                </li>
              ))}
            </ul>
            {(archivosDe(null).length > 0 || meToca) && (
              <div className="mt-3">
                {archivos(archivosDe(null))}
                {meToca && (
                  <button type="button" onClick={() => elegir(null)} disabled={Boolean(ocupado)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#248bde]">
                    {ocupado === 'subir-null' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />} Subir otro archivo
                  </button>
                )}
              </div>
            )}
            <p className="mt-2 text-[11px] text-slate-400">
              Hasta 50 MB por archivo. ¿Algo más pesado? Pega un enlace de Drive o WeTransfer en una nota. Por favor no subas
              datos de salud ni fichas de tus clientes o pacientes salvo que lo hayamos acordado.
            </p>
          </section>

          {meToca && (
            <div className={`rounded-2xl p-4 text-center ${todo ? 'bg-gradient-to-r from-emerald-50 to-sky-50 ring-1 ring-emerald-100' : 'bg-slate-50'}`}>
              <button type="button" disabled={!todo || ocupado === 'entregar'}
                onClick={() => window.confirm('¿Todo listo para que lo revisemos?') && correr('entregar', () => rpc('portal_entregar', { p_tarea: t.id }))}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 font-bold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-300 disabled:shadow-none transition-colors">
                {ocupado === 'entregar' ? <Loader2 className="w-5 h-5 animate-spin" /> : <PartyPopper className="w-5 h-5" />} Listo, entregué
              </button>
              <p className="mt-2 text-xs text-slate-500">
                {todo ? 'Cuando lo pulses dejamos de mandarte recordatorios y nos ponemos manos a la obra.' : `Marca ${total - hechos === 1 ? 'el que falta' : `los ${total - hechos} que faltan`} para poder entregar.`}
              </p>
            </div>
          )}

          <section className="rounded-xl bg-slate-50 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-1.5">Lo que hará NexCommit</h4>
            <p className="text-sm text-slate-700 whitespace-pre-line">{t.tarea_encargado}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>Con <b className="text-slate-700">{t.encargado}</b></span>
              <span>· {ESTADO_NEXCOMMIT[t.estado_encargado]}</span>
              <span>· para el {fechaCorta(t.fecha_encargado)}</span>
            </div>
          </section>

          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> Notas</h4>
            <ul className="space-y-2">
              {t.notas.map((n) => (
                <li key={n.id} className={`rounded-xl px-3.5 py-2.5 text-sm max-w-[90%] ${n.del_equipo ? 'bg-sky-50 text-slate-800' : 'bg-slate-100 text-slate-800 ml-auto'}`}>
                  <div className="text-[11px] text-slate-500 mb-0.5"><b>{n.del_equipo ? `${n.autor.split(' ')[0]} · NexCommit` : n.autor.split(' ')[0]}</b> · {fechaHora(n.created_at)}</div>
                  <div className="whitespace-pre-line break-words">{n.texto}</div>
                </li>
              ))}
              {!t.notas.length && <li className="text-sm text-slate-400">¿Dudas o algo que contarnos? Déjalo aquí y le avisamos a {t.encargado.split(' ')[0]}.</li>}
            </ul>
            {!t.cancelada_at && (
              <form className="mt-3 flex gap-2" onSubmit={(e) => {
                e.preventDefault();
                if (nota.trim()) correr('nota', async () => { await rpc('portal_nota', { p_tarea: t.id, p_texto: nota, p_entregable: null }); setNota(''); });
              }}>
                <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={4000} placeholder="Escribe una nota…"
                  className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#248bde]" />
                <button type="submit" disabled={!nota.trim() || ocupado === 'nota'} aria-label="Enviar nota"
                  className="rounded-full bg-[#248bde] p-2.5 text-white hover:bg-[#1d7cc9] disabled:opacity-40">
                  {ocupado === 'nota' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            )}
          </section>

          {error && <div role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">{error}</div>}

          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer select-none">Historial de la tarea</summary>
            <ul className="mt-2 space-y-1">
              {t.historial.map((h, i) => (
                <li key={i}><CheckCircle2 className="inline w-3 h-3 mr-1 text-slate-300" />{fechaHora(h.created_at)} · <b>{h.actor.split(' ')[0]}</b> {h.accion.toLowerCase()}{h.detalle ? ` — ${h.detalle}` : ''}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </article>
  );
}
