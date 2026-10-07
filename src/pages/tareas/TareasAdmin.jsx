import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Briefcase, CalendarClock, LayoutGrid, List, Plus, RefreshCw, Search } from 'lucide-react';
import {
  ESTADOS,
  PRIORIDAD,
  PRIORIDADES,
  ahoraMs,
  enDiasISO,
  estaAbierta,
  estaVencida,
  formatearFecha,
  hoyISO,
  refGithub,
  useEquipo,
  useGuardarTarea,
  useMiEquipoId,
  useProyectos,
  useTareasLista,
  useSyncGithub,
  useTareasRealtime,
} from '../../hooks/tareas';
import TareaModal from './TareaModal';
import { Avatar, EstadoPill, ErrorBox, Pill, PrioridadPill, btnPrimary, card, inputClass } from './ui';

// Task views only; projects, clients, team and shortcuts live in the panel sidebar.
const VISTAS = [
  { id: 'tablero', label: 'Tablero', icon: LayoutGrid },
  { id: 'lista', label: 'Lista', icon: List },
  { id: 'areas', label: 'Por área', icon: Briefcase },
];
const COLUMNAS = ESTADOS.filter((e) => e.id !== 'cancelada');
const CATORCE_DIAS = 14 * 24 * 60 * 60 * 1000;

export default function TareasAdmin({ vista = 'tablero', irA }) {
  const [params, setParams] = useSearchParams();
  const yo = useMiEquipoId();
  const equipoQ = useEquipo();
  const proyectosQ = useProyectos();
  const tareasQ = useTareasLista();
  useTareasRealtime();
  const sync = useSyncGithub();

  // ?proyecto=<id> pre-filters (coming from Proyectos/Clientes); ?nueva=<id> opens the create form.
  const [filtros, setFiltros] = useState(() => ({
    q: '', proyecto: params.get('proyecto') || '', responsable: '', prioridad: '', estado: '', soloVencidas: false,
  }));
  const [nuevaLocal, setNuevaLocal] = useState(null); // defaults for a new task, or null
  const nuevaParam = params.get('nueva');
  const nueva = nuevaLocal || (nuevaParam ? { proyecto_id: nuevaParam } : null);
  const cerrarNueva = () => {
    setNuevaLocal(null);
    if (nuevaParam) setParams((p) => { p.delete('nueva'); return p; }, { replace: true });
  };
  const [areaSel, setAreaSel] = useState(null);

  const equipo = useMemo(() => equipoQ.data ?? [], [equipoQ.data]);
  const proyectos = useMemo(() => proyectosQ.data ?? [], [proyectosQ.data]);
  const tareas = useMemo(() => tareasQ.data ?? [], [tareasQ.data]);
  const areas = useMemo(() => proyectos.filter((p) => p.tipo === 'area' && !p.archivado), [proyectos]);
  const repos = useMemo(() => proyectos.filter((p) => p.tipo !== 'area' && !p.archivado), [proyectos]);
  const miembro = useMemo(() => Object.fromEntries(equipo.map((m) => [m.id, m])), [equipo]);
  const proyecto = useMemo(() => Object.fromEntries(proyectos.map((p) => [p.id, p])), [proyectos]);

  // Deep link from the WhatsApp notice: /admin?tab=tareas&tarea=<numero>
  const setVista = (id) => irA?.(id);
  const numeroAbierto = params.get('tarea');
  const tareaAbierta = numeroAbierto ? tareas.find((t) => String(t.numero) === numeroAbierto) : null;
  const abrir = (t) => setParams((p) => { p.set('tarea', String(t.numero)); return p; }, { replace: true });
  const cerrar = () => setParams((p) => { p.delete('tarea'); return p; }, { replace: true });

  const filtradas = useMemo(() => {
    const q = filtros.q.trim().toLowerCase();
    return tareas.filter((t) => {
      if (filtros.proyecto && t.proyecto_id !== filtros.proyecto) return false;
      if (filtros.responsable === 'yo' && t.responsable_id !== yo.data) return false;
      if (filtros.responsable === 'nadie' && t.responsable_id) return false;
      if (filtros.responsable && !['yo', 'nadie'].includes(filtros.responsable) && t.responsable_id !== filtros.responsable) return false;
      if (filtros.prioridad && t.prioridad !== filtros.prioridad) return false;
      if (filtros.estado && t.estado !== filtros.estado) return false;
      if (filtros.soloVencidas && !estaVencida(t)) return false;
      if (q && !`#${t.github_numero ?? ''} ${t.titulo} ${t.descripcion ?? ''} ${(t.etiquetas || []).join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tareas, filtros, yo.data]);

  const kpis = useMemo(() => {
    const hoy = hoyISO();
    const enSiete = enDiasISO(7);
    const haceSiete = ahoraMs() - 7 * 86400000;
    const abiertas = tareas.filter(estaAbierta);
    return {
      abiertas: abiertas.length,
      mias: abiertas.filter((t) => t.responsable_id && t.responsable_id === yo.data).length,
      vencidas: abiertas.filter(estaVencida).length,
      semana: abiertas.filter((t) => t.fecha_limite && t.fecha_limite >= hoy && t.fecha_limite <= enSiete).length,
      sinAsignar: abiertas.filter((t) => !t.responsable_id).length,
      completadas: tareas.filter((t) => t.completada_at && new Date(t.completada_at).getTime() >= haceSiete).length,
    };
  }, [tareas, yo.data]);

  const cargando = equipoQ.isLoading || proyectosQ.isLoading || tareasQ.isLoading || yo.isLoading;
  const error = equipoQ.error || proyectosQ.error || tareasQ.error || yo.error;

  if (cargando) return <p className="text-[#9aafc3]">Cargando tareas…</p>;
  if (error) return <ErrorBox error={error} />;
  if (!yo.data) {
    return (
      <div className={`${card} p-6 max-w-xl`}>
        <h2 className="text-white font-semibold mb-2">Tu correo no está en el equipo</h2>
        <p className="text-sm text-[#9aafc3]">
          El sistema de tareas solo lo ven las personas registradas en Equipo. Pídele a un dueño de NexCommit que te agregue con
          el mismo correo con el que iniciaste sesión.
        </p>
      </div>
    );
  }

  const setFiltro = (k) => (e) => setFiltros((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const proyectoInterno = proyectos.find((p) => p.es_interno && p.github_repo)?.id || '';
  const areaActiva = areas.find((a) => a.id === areaSel) || areas[0];
  const nuevaTarea = (defaults = {}) =>
    setNuevaLocal({
      proyecto_id: vista === 'areas' && areaActiva ? areaActiva.id : filtros.proyecto || proyectoInterno,
      ...defaults,
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tareas</h1>
          <p className="text-sm text-[#9aafc3]">
            Proyectos: issues de GitHub de novautomatic (nacen y se mueven en GitHub). Áreas: tareas internas que viven solo aquí.
          </p>
          <SyncEstado sync={sync} />
        </div>
        <button type="button" className={btnPrimary} onClick={() => nuevaTarea()}>
          <Plus className="w-4 h-4" /> Nueva tarea
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Abiertas" valor={kpis.abiertas} onClick={() => { setFiltros((f) => ({ ...f, responsable: '', soloVencidas: false })); setVista('lista'); }} />
        <Kpi label="Mías" valor={kpis.mias} color="#67c8f3" onClick={() => { setFiltros((f) => ({ ...f, responsable: 'yo' })); setVista('tablero'); }} />
        <Kpi label="Vencidas" valor={kpis.vencidas} color={kpis.vencidas ? '#f87171' : undefined} onClick={() => { setFiltros((f) => ({ ...f, soloVencidas: true })); setVista('lista'); }} />
        <Kpi label="Vencen en 7 días" valor={kpis.semana} color={kpis.semana ? '#f59e0b' : undefined} />
        <Kpi label="Sin asignar" valor={kpis.sinAsignar} onClick={() => { setFiltros((f) => ({ ...f, responsable: 'nadie' })); setVista('lista'); }} />
        <Kpi label="Completadas (7 días)" valor={kpis.completadas} color="#34d399" />
      </div>

      <div className="inline-flex rounded-lg border border-white/10 bg-[#0c1a2c] p-1" role="tablist" aria-label="Vista de tareas">
        {VISTAS.map((v) => {
          const Icon = v.icon;
          const activa = vista === v.id;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => setVista(v.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                activa ? 'bg-[#1a3050] text-white' : 'text-[#9aafc3] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{v.label}</span>
            </button>
          );
        })}
      </div>

      {(vista === 'tablero' || vista === 'lista') && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9aafc3]" />
            <input className={`${inputClass} pl-9`} placeholder="Buscar por título, #número o etiqueta" value={filtros.q} onChange={setFiltro('q')} />
          </div>
          <select className={`${inputClass} w-auto`} value={filtros.proyecto} onChange={setFiltro('proyecto')} aria-label="Proyecto">
            <option value="">Todos los proyectos y áreas</option>
            <optgroup label="Áreas">
              {areas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </optgroup>
            <optgroup label="Proyectos (GitHub)">
              {repos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </optgroup>
          </select>
          <select className={`${inputClass} w-auto`} value={filtros.responsable} onChange={setFiltro('responsable')} aria-label="Responsable">
            <option value="">Todo el equipo</option>
            <option value="yo">Mis tareas</option>
            <option value="nadie">Sin asignar</option>
            {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          <select className={`${inputClass} w-auto`} value={filtros.prioridad} onChange={setFiltro('prioridad')} aria-label="Prioridad">
            <option value="">Toda prioridad</option>
            {PRIORIDADES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          {vista === 'lista' && (
            <select className={`${inputClass} w-auto`} value={filtros.estado} onChange={setFiltro('estado')} aria-label="Estado">
              <option value="">Todo estado</option>
              {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 text-sm text-[#9aafc3] px-1">
            <input type="checkbox" checked={filtros.soloVencidas} onChange={setFiltro('soloVencidas')} /> Solo vencidas
          </label>
        </div>
      )}

      {vista === 'tablero' && (
        <Tablero tareas={filtradas} miembro={miembro} proyecto={proyecto} onAbrir={abrir} onNueva={nuevaTarea} />
      )}
      {vista === 'lista' && <Lista tareas={filtradas} miembro={miembro} proyecto={proyecto} onAbrir={abrir} />}
      {vista === 'areas' && areaActiva && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {areas.map((a) => {
              const abiertas = tareas.filter((t) => t.proyecto_id === a.id && estaAbierta(t)).length;
              const activa = a.id === areaActiva.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAreaSel(a.id)}
                  className={`${card} p-4 text-left transition-colors ${activa ? 'border-white/40' : 'hover:border-white/25'}`}
                  style={activa ? { boxShadow: `inset 3px 0 0 ${a.color}` } : undefined}
                  aria-pressed={activa}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                    <span className="text-white font-semibold text-sm">{a.nombre}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#9aafc3]">
                    <Avatar nombre={miembro[a.area_responsable_id]?.nombre} size={20} />
                    {miembro[a.area_responsable_id]?.nombre || 'Sin responsable'}
                    <span className="ml-auto text-white">{abiertas} abiertas</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[#9aafc3]">Estas tareas no van a GitHub. Si no eliges responsable, quedan a cargo de quien lidera el área.</p>
            <button type="button" className={btnPrimary} onClick={() => nuevaTarea({ proyecto_id: areaActiva.id })}>
              <Plus className="w-4 h-4" /> Tarea en {areaActiva.nombre}
            </button>
          </div>
          <Tablero
            tareas={tareas.filter((t) => t.proyecto_id === areaActiva.id)}
            miembro={miembro}
            proyecto={proyecto}
            onAbrir={abrir}
            onNueva={() => nuevaTarea({ proyecto_id: areaActiva.id })}
          />
        </div>
      )}

      {nueva && (
        <TareaModal defaults={nueva} equipo={equipo} proyectos={proyectos} onClose={cerrarNueva} />
      )}
      {tareaAbierta && (
        <TareaModal key={tareaAbierta.id} tarea={tareaAbierta} equipo={equipo} proyectos={proyectos} onClose={cerrar} />
      )}
      {numeroAbierto && !tareaAbierta && (
        <ErrorBox error={`La tarea #${numeroAbierto} no existe o fue borrada.`} />
      )}
    </div>
  );
}

function SyncEstado({ sync }) {
  const e = sync.data;
  if (sync.error) return <p className="text-xs text-red-300 mt-1">No se pudo consultar la sincronización: {sync.error.message}</p>;
  if (!e) return null;
  if (e.ultimo_error) {
    return (
      <p className="text-xs text-red-300 mt-1 flex items-center gap-1">
        <AlertTriangle className="w-3.5 h-3.5" /> GitHub respondió con error: {e.ultimo_error}
      </p>
    );
  }
  return (
    <p className="text-xs text-[#9aafc3] mt-1">
      {e.ultimo_ok
        ? `Sincronizado con GitHub: ${new Date(e.ultimo_ok).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
        : 'Primera sincronización con GitHub en curso…'}
    </p>
  );
}

function Kpi({ label, valor, color, onClick }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp type={onClick ? 'button' : undefined} onClick={onClick} className={`${card} px-4 py-3 text-left ${onClick ? 'hover:border-white/25 transition-colors' : ''}`}>
      <div className="text-2xl font-semibold" style={{ color: color || '#fff' }}>{valor}</div>
      <div className="text-xs text-[#9aafc3]">{label}</div>
    </Comp>
  );
}

function Tablero({ tareas, miembro, proyecto, onAbrir, onNueva }) {
  const guardar = useGuardarTarea();
  const [sobre, setSobre] = useState(null);
  const ahora = ahoraMs();

  const porColumna = (estado) =>
    tareas
      .filter((t) => t.estado === estado)
      // Done column only shows the last 14 days so it doesn't swallow the board.
      .filter((t) => estado !== 'completada' || !t.completada_at || ahora - new Date(t.completada_at).getTime() < CATORCE_DIAS)
      .sort((a, b) => PRIORIDAD[a.prioridad].peso - PRIORIDAD[b.prioridad].peso || (a.fecha_limite || '9999').localeCompare(b.fecha_limite || '9999') || a.orden - b.orden);

  const soltar = (estado) => (e) => {
    e.preventDefault();
    setSobre(null);
    const id = e.dataTransfer.getData('text/tarea');
    const t = tareas.find((x) => x.id === id);
    if (t && t.estado !== estado) guardar.mutate({ id, estado });
  };

  return (
    <>
      <ErrorBox error={guardar.error} />
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 snap-x">
        {COLUMNAS.map((col) => {
          const lista = porColumna(col.id);
          return (
            <section
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setSobre(col.id); }}
              onDragLeave={() => setSobre((s) => (s === col.id ? null : s))}
              onDrop={soltar(col.id)}
              className={`snap-start shrink-0 w-[280px] rounded-xl p-2 transition-colors ${sobre === col.id ? 'bg-[#1a3050]' : 'bg-[#0c1a2c]'}`}
              aria-label={col.label}
            >
              <header className="flex items-center justify-between px-2 py-1.5 mb-1">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  {col.label}
                  <span className="text-[#9aafc3] font-normal">{lista.length}</span>
                </div>
                {col.id === 'pendiente' && (
                  <button type="button" onClick={() => onNueva()} className="text-[#9aafc3] hover:text-white" aria-label="Nueva tarea">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </header>
              <div className="space-y-2 min-h-[60px]">
                {lista.map((t) => (
                  <Tarjeta key={t.id} t={t} miembro={miembro} proyecto={proyecto} onAbrir={onAbrir} onEstado={(estado) => guardar.mutate({ id: t.id, estado })} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function Tarjeta({ t, miembro, proyecto, onAbrir, onEstado }) {
  const p = proyecto[t.proyecto_id];
  const vencida = estaVencida(t);
  return (
    <article
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/tarea', t.id)}
      className={`${card} p-3 cursor-grab active:cursor-grabbing hover:border-white/25 transition-colors`}
    >
      <button type="button" onClick={() => onAbrir(t)} className="text-left w-full">
        <div className="flex items-center gap-1.5 text-[11px] text-[#9aafc3] mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p?.color }} />
          <span className="truncate">{p?.nombre}</span>
          <span className="ml-auto flex items-center gap-1">
            {t.sync_estado === 'pendiente' && <RefreshCw className="w-3 h-3 animate-spin" aria-label="Sincronizando" />}
            {t.sync_estado === 'error' && <AlertTriangle className="w-3 h-3 text-red-300" aria-label="Error de sincronización" />}
            #{p?.tipo === 'area' ? t.numero : t.github_numero ?? '…'}
          </span>
        </div>
        <h3 className="text-sm text-white leading-snug break-words">{t.titulo}</h3>
      </button>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <PrioridadPill prioridad={t.prioridad} />
        {t.fecha_limite && (
          <Pill color={vencida ? '#f87171' : '#9aafc3'} title={vencida ? 'Vencida' : 'Fecha límite'}>
            <CalendarClock className="w-3 h-3" /> {formatearFecha(t.fecha_limite)}
          </Pill>
        )}
        <span className="ml-auto"><Avatar nombre={miembro[t.responsable_id]?.nombre} size={22} /></span>
      </div>
      {/* Touch screens can't drag: change state from the card. */}
      <select
        className="md:hidden mt-2 w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white"
        value={t.estado}
        onChange={(e) => onEstado(e.target.value)}
        aria-label="Cambiar estado"
      >
        {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
      </select>
    </article>
  );
}

function Lista({ tareas, miembro, proyecto, onAbrir }) {
  const [orden, setOrden] = useState('fecha');
  const ordenadas = [...tareas].sort((a, b) => {
    if (orden === 'prioridad') return PRIORIDAD[a.prioridad].peso - PRIORIDAD[b.prioridad].peso;
    if (orden === 'creada') return b.created_at.localeCompare(a.created_at);
    return (a.fecha_limite || '9999').localeCompare(b.fecha_limite || '9999');
  });
  const th = 'px-3 py-2 text-left text-xs font-medium text-[#9aafc3] whitespace-nowrap';
  const ordenable = (id, label) => (
    <button type="button" onClick={() => setOrden(id)} className={orden === id ? 'text-white' : 'hover:text-white'}>{label}</button>
  );

  if (!ordenadas.length) return <p className="text-sm text-[#9aafc3]">No hay tareas con estos filtros.</p>;

  return (
    <div className={`${card} overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead className="border-b border-white/10">
          <tr>
            <th className={th}>#</th>
            <th className={th}>Tarea</th>
            <th className={th}>Proyecto</th>
            <th className={th}>Estado</th>
            <th className={th}>{ordenable('prioridad', 'Prioridad')}</th>
            <th className={th}>Responsable</th>
            <th className={th}>{ordenable('fecha', 'Fecha límite')}</th>
            <th className={th}>{ordenable('creada', 'Creada')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {ordenadas.map((t) => (
            <tr key={t.id} onClick={() => onAbrir(t)} className="cursor-pointer hover:bg-white/5">
              <td className="px-3 py-2 text-[#9aafc3] whitespace-nowrap">{refGithub(t, proyecto[t.proyecto_id])}</td>
              <td className="px-3 py-2 text-white max-w-[360px]">
                <div className="truncate">{t.titulo}</div>
                {(t.etiquetas || []).length > 0 && (
                  <div className="text-[11px] text-[#9aafc3] truncate">{t.etiquetas.join(' · ')}</div>
                )}
              </td>
              <td className="px-3 py-2 text-[#9aafc3] whitespace-nowrap">{proyecto[t.proyecto_id]?.nombre}</td>
              <td className="px-3 py-2"><EstadoPill estado={t.estado} /></td>
              <td className="px-3 py-2"><PrioridadPill prioridad={t.prioridad} /></td>
              <td className="px-3 py-2 text-[#9aafc3] whitespace-nowrap">{miembro[t.responsable_id]?.nombre || '—'}</td>
              <td className={`px-3 py-2 whitespace-nowrap ${estaVencida(t) ? 'text-red-300' : 'text-[#9aafc3]'}`}>{formatearFecha(t.fecha_limite) || '—'}</td>
              <td className="px-3 py-2 text-[#9aafc3] whitespace-nowrap">{formatearFecha(t.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
