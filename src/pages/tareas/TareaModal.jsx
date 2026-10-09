import React, { useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, MessageCircle, RefreshCw, RotateCw, Trash2 } from 'lucide-react';
import {
  ESTADOS,
  ESTADO,
  PRIORIDADES,
  formatearFecha,
  refGithub,
  useComentar,
  useDetalleTarea,
  useGuardarTarea,
  useReenviarAviso,
  useBorrarTareaArea,
  useResincronizar,
} from '../../hooks/tareas';
import { Avatar, ErrorBox, Modal, Pill, btnGhost, btnPrimary, inputClass, labelClass } from './ui';

const VACIA = {
  titulo: '',
  descripcion: '',
  proyecto_id: '',
  responsable_id: '',
  estado: 'pendiente',
  prioridad: 'media',
  fecha_limite: '',
  etiquetas: '',
};

function aFormulario(tarea, defaults) {
  if (!tarea) return { ...VACIA, ...defaults };
  return {
    titulo: tarea.titulo,
    descripcion: tarea.descripcion || '',
    proyecto_id: tarea.proyecto_id,
    responsable_id: tarea.responsable_id || '',
    estado: tarea.estado,
    prioridad: tarea.prioridad,
    fecha_limite: tarea.fecha_limite || '',
    etiquetas: (tarea.etiquetas || []).join(', '),
  };
}

const ESTADO_AVISO = {
  pendiente: { label: 'Enviando…', color: '#9aafc3' },
  enviado: { label: 'Enviado', color: '#34d399' },
  error: { label: 'Error', color: '#f87171' },
  omitido: { label: 'No enviado', color: '#f59e0b' },
};

const CAMPOS = {
  titulo: 'título',
  estado: 'estado',
  prioridad: 'prioridad',
  responsable_id: 'responsable',
  fecha_limite: 'fecha límite',
  proyecto_id: 'proyecto',
  descripcion: 'descripción',
};

export default function TareaModal({ tarea, defaults, equipo, proyectos, onClose }) {
  const [form, setForm] = useState(() => aFormulario(tarea, defaults));
  const guardar = useGuardarTarea();
  const resincronizar = useResincronizar();
  const borrar = useBorrarTareaArea();
  const esNueva = !tarea;
  const proyectoActual = proyectos.find((p) => p.id === (tarea?.proyecto_id || form.proyecto_id));
  const proyectoElegido = proyectos.find((p) => p.id === form.proyecto_id);
  const esArea = (esNueva ? proyectoElegido : proyectoActual)?.tipo === 'area';

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const activos = equipo.filter((m) => m.activo);
  // Only projects backed by a GitHub repo can hold tasks.
  const abiertos = proyectos.filter((p) => (p.github_repo || p.tipo === 'area') && (!p.archivado || p.id === form.proyecto_id));
  // An area task can move to another area; a GitHub task stays in its repo.
  const opcionesAreas = abiertos.filter((p) => p.tipo === 'area');
  const opcionesRepos = esNueva ? abiertos.filter((p) => p.tipo !== 'area') : [];

  const onSubmit = (e) => {
    e.preventDefault();
    const campos = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      proyecto_id: form.proyecto_id,
      responsable_id: form.responsable_id || null,
      estado: form.estado,
      prioridad: form.prioridad,
      fecha_limite: form.fecha_limite || null,
      etiquetas: form.etiquetas.split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (esNueva) {
      guardar.mutate(campos, { onSuccess: onClose });
      return;
    }
    // Send only what changed so GitHub doesn't get labels nobody touched.
    const cambios = {};
    const igual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    for (const [k, v] of Object.entries(campos)) {
      if (k === 'proyecto_id' && !esArea) continue;
      if (!igual(v, k === 'etiquetas' ? tarea.etiquetas || [] : tarea[k])) cambios[k] = v;
    }
    if (!Object.keys(cambios).length) {
      onClose();
      return;
    }
    guardar.mutate({ id: tarea.id, ...cambios }, { onSuccess: onClose });
  };

  const responsable = activos.find((m) => m.id === form.responsable_id);
  const canalesAviso = [
    responsable?.avisos_correo !== false && 'correo',
    responsable?.whatsapp && 'WhatsApp',
  ].filter(Boolean);

  return (
    <Modal
      titulo={esNueva
        ? (esArea ? 'Nueva tarea de área (no va a GitHub)' : 'Nueva tarea (se crea como issue en GitHub)')
        : `Tarea ${refGithub(tarea, proyectoActual)}`} onClose={onClose} ancho="max-w-3xl">
      {!esNueva && tarea.sync_estado !== 'ok' && (
        <div className={`mb-4 rounded-lg border px-3 py-2 text-sm flex flex-wrap items-center gap-3 ${
          tarea.sync_estado === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-white/10 bg-white/5 text-[#9aafc3]'}`}>
          {tarea.sync_estado === 'error' ? <AlertTriangle className="w-4 h-4" /> : <RefreshCw className="w-4 h-4 animate-spin" />}
          <span className="flex-1">
            {tarea.sync_estado === 'error'
              ? tarea.sync_error || 'No se pudo sincronizar con GitHub.'
              : 'Enviando el cambio a GitHub…'}
          </span>
          {tarea.sync_estado === 'error' && (
            <button type="button" className={btnGhost} onClick={() => resincronizar.mutate(tarea.id, { onSuccess: tarea.github_numero ? undefined : onClose })}>
              {tarea.github_numero ? 'Traer de nuevo desde GitHub' : 'Descartar'}
            </button>
          )}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="t-titulo">Título</label>
          <input id="t-titulo" className={inputClass} value={form.titulo} onChange={set('titulo')} maxLength={200} required autoFocus={esNueva} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="t-proyecto">Proyecto o área</label>
            <select id="t-proyecto" className={inputClass} value={form.proyecto_id} onChange={set('proyecto_id')} required
              disabled={!esNueva && !esArea}
              title={esNueva || esArea ? undefined : 'Para cambiar de proyecto, transfiere el issue en GitHub'}>
              <option value="" disabled>Elige un proyecto o área…</option>
              {opcionesAreas.length > 0 && (
                <optgroup label="Áreas (solo aquí)">
                  {opcionesAreas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </optgroup>
              )}
              {opcionesRepos.length > 0 && (
                <optgroup label="Proyectos (GitHub)">
                  {opcionesRepos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}{p.es_interno ? ' (interno)' : ''} — {p.github_repo}</option>
                  ))}
                </optgroup>
              )}
              {!esNueva && !esArea && proyectoActual && <option value={proyectoActual.id}>{proyectoActual.nombre}</option>}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="t-resp">Responsable</label>
            <select id="t-resp" className={inputClass} value={form.responsable_id} onChange={set('responsable_id')}>
              <option value="">{esArea && esNueva ? 'Quien lidera el área' : 'Sin asignar'}</option>
              {activos.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}{m.whatsapp ? '' : ' (sin WhatsApp)'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="t-estado">Estado</label>
            <select id="t-estado" className={inputClass} value={form.estado} onChange={set('estado')}>
              {ESTADOS.filter((s) => !esNueva || !['completada', 'cancelada'].includes(s.id)).map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="t-prio">Prioridad</label>
              <select id="t-prio" className={inputClass} value={form.prioridad} onChange={set('prioridad')}>
                {PRIORIDADES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="t-fecha">Fecha límite</label>
              <input id="t-fecha" type="date" className={inputClass} value={form.fecha_limite} onChange={set('fecha_limite')} />
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="t-desc">Descripción</label>
          <textarea id="t-desc" className={`${inputClass} min-h-[110px]`} value={form.descripcion} onChange={set('descripcion')} />
        </div>
        <div>
          <label className={labelClass} htmlFor="t-tags">Etiquetas (separadas por coma)</label>
          <input id="t-tags" className={inputClass} value={form.etiquetas} onChange={set('etiquetas')} placeholder="bug, frontend" />
        </div>

        {form.responsable_id && (esNueva || form.responsable_id !== tarea?.responsable_id) && (
          <p className="text-xs text-[#9aafc3] flex items-center gap-2">
            <MessageCircle className="w-3.5 h-3.5 text-[#34d399]" />
            {canalesAviso.length
              ? `Al guardar se le avisará por ${canalesAviso.join(' y ')} al responsable${responsable?.whatsapp ? ' (el WhatsApp no, si eres tú)' : ''}.`
              : 'Esta persona tiene los avisos apagados y sin WhatsApp en Equipo: no recibirá aviso.'}
          </p>
        )}

        <ErrorBox error={guardar.error || resincronizar.error || borrar.error} />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex gap-2 items-center">
            {tarea?.github_issue_url && (
              <a href={tarea.github_issue_url} target="_blank" rel="noreferrer" className={btnGhost}>
                <ExternalLink className="w-4 h-4" /> Abrir en GitHub
              </a>
            )}
            {!esNueva && esArea && (
              <button
                type="button"
                className={`${btnGhost} text-red-300 hover:text-red-200`}
                disabled={borrar.isPending}
                onClick={() => window.confirm('¿Borrar esta tarea de área? No se puede deshacer.') && borrar.mutate(tarea.id, { onSuccess: onClose })}
              >
                <Trash2 className="w-4 h-4" /> Borrar
              </button>
            )}
            {!esNueva && !esArea && (
              <span className="text-xs text-[#9aafc3]">Para descartarla, pásala a «Cancelada» (se cierra en GitHub).</span>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
            <button type="submit" className={btnPrimary} disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : esNueva ? 'Crear tarea' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>

      {!esNueva && <Seguimiento tarea={tarea} equipo={equipo} proyectos={proyectos} />}
    </Modal>
  );
}

function Seguimiento({ tarea, equipo, proyectos }) {
  const { data, isLoading, error } = useDetalleTarea(tarea.id);
  const comentar = useComentar();
  const reenviar = useReenviarAviso();
  const [texto, setTexto] = useState('');
  const nombre = useMemo(() => Object.fromEntries(equipo.map((m) => [m.id, m.nombre])), [equipo]);
  const proyecto = useMemo(() => Object.fromEntries(proyectos.map((p) => [p.id, p.nombre])), [proyectos]);

  const valor = (campo, v) => {
    if (v === null || v === undefined || v === '') return '—';
    if (campo === 'responsable_id') return nombre[v] || 'alguien';
    if (campo === 'proyecto_id') return proyecto[v] || 'otro proyecto';
    if (campo === 'estado') return ESTADO[v]?.label || v;
    if (campo === 'fecha_limite') return formatearFecha(v);
    return v;
  };

  const enviar = (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    comentar.mutate({ tarea_id: tarea.id, texto: texto.trim() }, { onSuccess: () => setTexto('') });
  };

  return (
    <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section>
        <h3 className="text-sm font-semibold text-white mb-3">Comentarios</h3>
        {isLoading && <p className="text-sm text-[#9aafc3]">Cargando…</p>}
        <ErrorBox error={error} />
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {data?.comentarios.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar nombre={nombre[c.autor_id] || c.autor_github} size={22} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#9aafc3]">
                  <span className="text-white">{nombre[c.autor_id] || (c.autor_github ? `@${c.autor_github}` : 'Alguien')}</span> · {new Date(c.created_at).toLocaleString('es-CL')}
                </div>
                <p className="text-sm text-[#d6e3f0] whitespace-pre-wrap break-words">{c.texto}</p>
              </div>
            </div>
          ))}
          {data && !data.comentarios.length && <p className="text-sm text-[#9aafc3]">Sin comentarios todavía.</p>}
          {tarea.github_issue_url && (
            <p className="text-[11px] text-[#9aafc3]">Los comentarios se publican en el issue de GitHub.</p>
          )}
        </div>
        <form onSubmit={enviar} className="mt-3 flex gap-2">
          <input className={inputClass} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un avance o comentario…" maxLength={5000} />
          <button className={btnPrimary} disabled={comentar.isPending || !texto.trim()}>Enviar</button>
        </form>
        <ErrorBox error={comentar.error} />
      </section>

      <section className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Avisos</h3>
            {tarea.responsable_id && (
              <button type="button" className={btnGhost} onClick={() => reenviar.mutate(tarea.id)} disabled={reenviar.isPending}>
                <RotateCw className="w-3.5 h-3.5" /> Reenviar aviso
              </button>
            )}
          </div>
          <ErrorBox error={reenviar.error} />
          <ul className="space-y-2">
            {data?.avisos.map((a) => (
              <li key={a.id} className="text-xs text-[#9aafc3]">
                <div className="flex items-center gap-2">
                  <Pill color={ESTADO_AVISO[a.estado].color}>{ESTADO_AVISO[a.estado].label}</Pill>
                  <span className="text-white">{nombre[a.equipo_id] || 'Responsable'}</span>
                  <span>· {a.canal === 'correo' ? 'correo' : 'WhatsApp'}</span>
                  <span>· {{ reasignada: 'reasignación', creada: 'creación' }[a.tipo] || 'asignación'}</span>
                  <span>· {new Date(a.created_at).toLocaleString('es-CL')}</span>
                </div>
                {a.detalle && <p className="mt-1 pl-1 break-words">{a.detalle}</p>}
              </li>
            ))}
            {data && !data.avisos.length && <li className="text-sm text-[#9aafc3]">No se han enviado avisos.</li>}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Historial</h3>
          <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {data?.historial.map((h) => (
              <li key={h.id} className="text-xs text-[#9aafc3]">
                <span className="text-white">{nombre[h.actor_id] || 'GitHub'}</span>{' '}
                {h.accion === 'creada'
                  ? 'creó la tarea'
                  : h.campo === 'descripcion'
                    ? 'editó la descripción'
                    : <>cambió {CAMPOS[h.campo] || h.campo}: {valor(h.campo, h.antes)} → <span className="text-white">{valor(h.campo, h.despues)}</span></>}
                {' · '}{new Date(h.created_at).toLocaleString('es-CL')}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
