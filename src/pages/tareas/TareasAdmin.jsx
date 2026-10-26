import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, BarChart3, Briefcase, CalendarClock, CalendarDays, Handshake, LayoutGrid, List, Plus, RefreshCw, Search } from 'lucide-react';
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
  useBorrarIdea,
  useClientes,
  useEquipo,
  useGuardarTarea,
  useMiEquipoId,
  useProyectos,
  useTareasLista,
  useSyncGithub,
  useTareasRealtime,
} from '../../hooks/tareas';
import {
  ESTADO_ENCARGADO_DESDE_COLUMNA, comoTareaDelEncargado, proyectoDeCliente, useRpcTcliente, useTareasCliente,
} from '../../hooks/tareasCliente';
import TareaModal from './TareaModal';
import { emojiEstado, useTema, useTextos } from '../../hooks/tema';
import { Mascota, Vacio } from './Mascota';
import ResumenVista from './ResumenVista';
import CalendarioVista from './CalendarioVista';
import { ColumnaIdeas } from './IdeasFuturas';
import { Avatar, EstadoPill, ErrorBox, Pill, PrioridadPill, btnPrimary, card, inputClass } from './ui';

// Task views only; projects, clients, team and shortcuts live in the panel sidebar.
const VISTAS = [
  { id: 'resumen', label: 'Resumen', icon: BarChart3 },
  { id: 'tablero', label: 'Tablero', icon: LayoutGrid },
  { id: 'lista', label: 'Lista', icon: List },
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
  { id: 'areas', label: 'Por área', icon: Briefcase },
];
const COLUMNAS = ESTADOS.filter((e) => e.id !== 'cancelada');
const CATORCE_DIAS = 14 * 24 * 60 * 60 * 1000;
// Client of a task: the tag on internal tasks, or the owner of a client task.
const clienteIdDe = (t) => (t.origen === 'cliente' ? t.tareaCliente?.cliente_id : t.cliente_id);

export default function TareasAdmin({ vista = 'resumen', irA }) {
  const tema = useTema();
  const textos = useTextos();
  const [params, setParams] = useSearchParams();
  const yo = useMiEquipoId();
  const equipoQ = useEquipo();
  const proyectosQ = useProyectos();
  const tareasQ = useTareasLista();
  const tareasClienteQ = useTareasCliente();
  const clientesQ = useClientes();
  useTareasRealtime();
  const sync = useSyncGithub();

  // ?proyecto=<id> pre-filters (coming from Proyectos/Clientes); ?nueva=<id> opens the create form.
  const [filtros, setFiltros] = useState(() => ({
    q: '', proyecto: params.get('proyecto') || '', cliente: params.get('cliente') || '', responsable: '', prioridad: '', estado: '', soloVencidas: false,
  }));
  const [nuevaLocal, setNuevaLocal] = useState(null); // defaults for a new task, or null
  const [ideaOrigen, setIdeaOrigen] = useState(null); // «Proyectos futuros» idea being turned into a task
  const borrarIdea = useBorrarIdea();
  const nuevaParam = params.get('nueva');
  const nueva = nuevaLocal || (nuevaParam ? { proyecto_id: nuevaParam } : null);
  const cerrarNueva = () => {
    setNuevaLocal(null);
    setIdeaOrigen(null);
    if (nuevaParam) setParams((p) => { p.delete('nueva'); return p; }, { replace: true });
  };
  const [areaSel, setAreaSel] = useState(null);

  const equipo = useMemo(() => equipoQ.data ?? [], [equipoQ.data]);
  const proyectos = useMemo(() => proyectosQ.data ?? [], [proyectosQ.data]);
  const tareas = useMemo(() => tareasQ.data ?? [], [tareasQ.data]);
  // Team half of every client task, shown next to the internal ones (see comoTareaDelEncargado).
  const deClientes = useMemo(() => (tareasClienteQ.data ?? []).map(comoTareaDelEncargado), [tareasClienteQ.data]);
  const proyectosCliente = useMemo(() => {
    const vistos = new Map();
    for (const t of tareasClienteQ.data ?? []) if (t.cliente) vistos.set(t.cliente.id, proyectoDeCliente(t.cliente));
    return [...vistos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [tareasClienteQ.data]);
  const todas = useMemo(() => [...tareas, ...deClientes], [tareas, deClientes]);
  const areas = useMemo(() => proyectos.filter((p) => p.tipo === 'area' && !p.archivado), [proyectos]);
  const repos = useMemo(() => proyectos.filter((p) => p.tipo !== 'area' && !p.archivado), [proyectos]);
  const miembro = useMemo(() => Object.fromEntries(equipo.map((m) => [m.id, m])), [equipo]);
  const clientes = useMemo(() => clientesQ.data ?? [], [clientesQ.data]);
  const clienteDe = useMemo(() => Object.fromEntries(clientes.map((c) => [c.id, c])), [clientes]);
  const proyecto = useMemo(
    () => Object.fromEntries([...proyectos, ...proyectosCliente].map((p) => [p.id, p])),
    [proyectos, proyectosCliente],
  );

  // Deep link from the WhatsApp notice: /admin?tab=tareas&tarea=<numero> (internal tasks only).
  const setVista = (id) => irA?.(id);
  const numeroAbierto = params.get('tarea');
  const tareaAbierta = numeroAbierto ? tareas.find((t) => String(t.numero) === numeroAbierto) : null;
  const abrir = (t) => {
    if (t.origen === 'cliente') irA?.('clientes-tareas', { tarea: String(t.numero) });
    else setParams((p) => { p.set('tarea', String(t.numero)); return p; }, { replace: true });
  };
  const cerrar = () => setParams((p) => { p.delete('tarea'); return p; }, { replace: true });

  const filtradas = useMemo(() => {
    const q = filtros.q.trim().toLowerCase();
    return todas.filter((t) => {
      if (filtros.proyecto && t.proyecto_id !== filtros.proyecto) return false;
      if (filtros.cliente === 'ninguno' && clienteIdDe(t)) return false;
      if (filtros.cliente && filtros.cliente !== 'ninguno' && clienteIdDe(t) !== filtros.cliente) return false;
      if (filtros.responsable === 'yo' && t.responsable_id !== yo.data) return false;
      if (filtros.responsable === 'nadie' && t.responsable_id) return false;
      if (filtros.responsable && !['yo', 'nadie'].includes(filtros.responsable) && t.responsable_id !== filtros.responsable) return false;
      if (filtros.prioridad && t.prioridad !== filtros.prioridad) return false;
      if (filtros.estado && t.estado !== filtros.estado) return false;
      if (filtros.soloVencidas && !estaVencida(t)) return false;
      const numero = t.origen === 'cliente' ? t.numero : t.github_numero;
      if (q && !`#${numero ?? ''} ${t.titulo} ${t.descripcion ?? ''} ${proyecto[t.proyecto_id]?.nombre ?? ''} ${clienteDe[clienteIdDe(t)]?.nombre ?? ''} ${(t.etiquetas || []).join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [todas, filtros, yo.data, proyecto, clienteDe]);

  const kpis = useMemo(() => {
    const hoy = hoyISO();
    const enSiete = enDiasISO(7);
    const haceSiete = ahoraMs() - 7 * 86400000;
    const abiertas = todas.filter(estaAbierta);
    return {
      abiertas: abiertas.length,
      mias: abiertas.filter((t) => t.responsable_id && t.responsable_id === yo.data).length,
      vencidas: abiertas.filter(estaVencida).length,
      semana: abiertas.filter((t) => t.fecha_limite && t.fecha_limite >= hoy && t.fecha_limite <= enSiete).length,
      sinAsignar: abiertas.filter((t) => !t.responsable_id).length,
      completadas: todas.filter((t) => t.completada_at && new Date(t.completada_at).getTime() >= haceSiete).length,
    };
  }, [todas, yo.data]);

  const cargando = equipoQ.isLoading || proyectosQ.isLoading || tareasQ.isLoading || yo.isLoading;
  // Client tasks are a bonus here: if they fail to load, the internal board still works.
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
      proyecto_id: vista === 'areas' && areaActiva
        ? areaActiva.id
        // A client filter is not a real project: new tasks go to the internal one.
        : (!filtros.proyecto.startsWith('cliente:') && filtros.proyecto) || proyectoInterno,
      // Filtering by a client pre-fills it in the new task.
      cliente_id: filtros.cliente && filtros.cliente !== 'ninguno' ? filtros.cliente : '',
      ...defaults,
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Mascota
              animo={kpis.vencidas ? 'preocupada' : 'feliz'}
              quien={{ avatar: kpis.vencidas ? 'toph' : 'sokka', kawaii: kpis.vencidas ? 'rm' : 'jin', elemental: 'llama' }[tema]}
              size={40}
            />
            <span className="avatar-titulo">{textos.tituloTareas}</span>
          </h1>
          <p className="text-sm text-[#9aafc3]">
            Proyectos: issues de GitHub de novautomatic (nacen y se mueven en GitHub). Áreas: tareas internas que viven solo aquí.
            Con <Handshake className="inline w-3.5 h-3.5 -mt-0.5" aria-label="tarea de cliente" />: la parte del encargado de una tarea de cliente.
          </p>
          <SyncEstado sync={sync} />
          {tareasClienteQ.error && (
            <p className="text-xs text-red-300 mt-1">No se pudieron cargar las tareas de clientes; se muestran solo las internas.</p>
          )}
        </div>
        <button type="button" className={btnPrimary} onClick={() => nuevaTarea()}>
          <Plus className="w-4 h-4" /> Nueva tarea
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi tono="cielo" label={textos.kpi.abiertas} valor={kpis.abiertas} onClick={() => { setFiltros((f) => ({ ...f, responsable: '', soloVencidas: false })); setVista('lista'); }} />
        <Kpi tono="lila" label={textos.kpi.mias} valor={kpis.mias} color="#67c8f3" onClick={() => { setFiltros((f) => ({ ...f, responsable: 'yo' })); setVista('tablero'); }} />
        <Kpi tono="coral" label={textos.kpi.vencidas} valor={kpis.vencidas} color={kpis.vencidas ? '#f87171' : undefined} onClick={() => { setFiltros((f) => ({ ...f, soloVencidas: true })); setVista('lista'); }} />
        <Kpi tono="sol" label={textos.kpi.semana} valor={kpis.semana} color={kpis.semana ? '#f59e0b' : undefined} />
        <Kpi tono="durazno" label={textos.kpi.sinAsignar} valor={kpis.sinAsignar} onClick={() => { setFiltros((f) => ({ ...f, responsable: 'nadie' })); setVista('lista'); }} />
        <Kpi tono="menta" label={textos.kpi.completadas} valor={kpis.completadas} color="#34d399" />
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

      {vista !== 'areas' && (
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
            {proyectosCliente.length > 0 && (
              <optgroup label="Tareas de clientes (parte del encargado)">
                {proyectosCliente.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </optgroup>
            )}
          </select>
          <select className={`${inputClass} w-auto`} value={filtros.cliente} onChange={setFiltro('cliente')} aria-label="Cliente">
            <option value="">Todos los clientes</option>
            <option value="ninguno">Sin cliente</option>
            {clientes.filter((c) => c.activo !== false || c.id === filtros.cliente).map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
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
        <Tablero
          tareas={filtradas}
          miembro={miembro}
          proyecto={proyecto}
          clienteDe={clienteDe}
          onAbrir={abrir}
          onNueva={nuevaTarea}
          ideas={
            <ColumnaIdeas
              miembro={miembro}
              onConvertir={(idea) => { setIdeaOrigen(idea.id); nuevaTarea({ titulo: idea.tema, descripcion: idea.notas || '' }); }}
            />
          }
        />
      )}
      {vista === 'lista' && <Lista tareas={filtradas} miembro={miembro} proyecto={proyecto} clienteDe={clienteDe} onAbrir={abrir} />}
      {vista === 'resumen' && (
        <ResumenVista
          tareas={filtradas}
          proyecto={proyecto}
          miembro={miembro}
          onAbrir={abrir}
          onElegirProyecto={(id) => { setFiltros((f) => ({ ...f, proyecto: id })); setVista('tablero'); }}
          onElegirPersona={(id) => { setFiltros((f) => ({ ...f, responsable: id })); setVista('tablero'); }}
        />
      )}
      {vista === 'calendario' && <CalendarioVista tareas={filtradas} onAbrir={abrir} />}
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
            clienteDe={clienteDe}
            onAbrir={abrir}
            onNueva={() => nuevaTarea({ proyecto_id: areaActiva.id })}
          />
        </div>
      )}

      {nueva && (
        <TareaModal
          defaults={nueva}
          equipo={equipo}
          proyectos={proyectos}
          onClose={cerrarNueva}
          onCreada={ideaOrigen ? () => borrarIdea.mutate(ideaOrigen) : undefined}
        />
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

function Kpi({ label, valor, color, onClick, tono }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp type={onClick ? 'button' : undefined} onClick={onClick} className={`kpi-tile ${card} px-4 py-3 text-left ${onClick ? 'hover:border-white/25 transition-colors' : ''}`} data-tono={tono}>
      <div className="text-2xl font-semibold" style={{ color: color || '#fff' }}>{valor}</div>
      <div className="text-xs text-[#9aafc3]">{label}</div>
    </Comp>
  );
}

function Tablero({ tareas, miembro, proyecto, clienteDe = {}, onAbrir, onNueva, ideas = null }) {
  const tema = useTema();
  const guardarInterna = useGuardarTarea();
  const estadoEncargado = useRpcTcliente('tcliente_encargado_estado');
  const [aviso, setAviso] = useState('');
  const [sobre, setSobre] = useState(null);
  const ahora = ahoraMs();

  // Client tasks only move their team half: Pendiente, En progreso or Completada (= «Lista»).
  const guardar = {
    error: guardarInterna.error || estadoEncargado.error,
    mutate: ({ id, estado }) => {
      setAviso('');
      const t = tareas.find((x) => x.id === id);
      if (t?.origen !== 'cliente') return guardarInterna.mutate({ id, estado });
      const destino = ESTADO_ENCARGADO_DESDE_COLUMNA[estado];
      if (!destino) {
        setAviso('Las tareas de clientes solo pasan por Pendiente, En progreso y Completada. La revisión de la entrega se hace en «De clientes».');
        return undefined;
      }
      if (t.tareaCliente.cerrada_at || t.tareaCliente.cancelada_at) {
        setAviso('Esa tarea de cliente ya está cerrada.');
        return undefined;
      }
      return estadoEncargado.mutate({ p_tarea: t.tareaCliente.id, p_estado: destino });
    },
  };

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
      {aviso && <p className="text-sm text-amber-300">{aviso}</p>}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 snap-x">
        {ideas}
        {COLUMNAS.map((col) => {
          const lista = porColumna(col.id);
          return (
            <section
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setSobre(col.id); }}
              onDragLeave={() => setSobre((s) => (s === col.id ? null : s))}
              onDrop={soltar(col.id)}
              className={`columna-tablero snap-start shrink-0 w-[280px] rounded-xl p-2 transition-colors ${sobre === col.id ? 'bg-[#1a3050]' : 'bg-[#0c1a2c]'}`}
              aria-label={col.label}
              data-estado={col.id}
            >
              <header className="flex items-center justify-between px-2 py-1.5 mb-1">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  {emojiEstado(tema, col.id) && <span aria-hidden="true">{emojiEstado(tema, col.id)}</span>}
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
                  <Tarjeta key={t.id} t={t} miembro={miembro} proyecto={proyecto} cliente={clienteDe[t.cliente_id]} onAbrir={onAbrir} onEstado={(estado) => guardar.mutate({ id: t.id, estado })} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function Tarjeta({ t, miembro, proyecto, cliente, onAbrir, onEstado }) {
  const p = proyecto[t.proyecto_id];
  const vencida = estaVencida(t);
  return (
    <article
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/tarea', t.id)}
      className={`tarjeta-tarea ${card} p-3 cursor-grab active:cursor-grabbing hover:border-white/25 transition-colors`}
      data-estado={t.estado}
      data-vencida={vencida || undefined}
    >
      <button type="button" onClick={() => onAbrir(t)} className="text-left w-full">
        <div className="flex items-center gap-1.5 text-[11px] text-[#9aafc3] mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p?.color }} />
          <span className="truncate">{p?.nombre}</span>
          <span className="ml-auto flex items-center gap-1">
            {t.sync_estado === 'pendiente' && <RefreshCw className="w-3 h-3 animate-spin" aria-label="Sincronizando" />}
            {t.sync_estado === 'error' && <AlertTriangle className="w-3 h-3 text-red-300" aria-label="Error de sincronización" />}
            {t.origen === 'cliente' && <Handshake className="w-3 h-3" aria-label="Tarea de cliente" />}
            #{p?.tipo === 'area' || t.origen === 'cliente' ? t.numero : t.github_numero ?? '…'}
          </span>
        </div>
        <h3 className="text-sm text-white leading-snug break-words">{t.titulo}</h3>
        {t.origen === 'cliente' && (
          <p className="text-[11px] text-[#9aafc3] mt-0.5 truncate">{t.etiquetas[1]}</p>
        )}
        {cliente && (
          <p className="text-[11px] text-[#9aafc3] mt-0.5 truncate flex items-center gap-1" title="Cliente asociado">
            <Handshake className="w-3 h-3 shrink-0" style={{ color: cliente.color }} /> {cliente.nombre}
          </p>
        )}
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
        {ESTADOS.filter((e) => t.origen !== 'cliente' || ESTADO_ENCARGADO_DESDE_COLUMNA[e.id] || e.id === t.estado)
          .map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
      </select>
    </article>
  );
}

function Lista({ tareas, miembro, proyecto, clienteDe = {}, onAbrir }) {
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

  if (!ordenadas.length) {
    return <Vacio texto="No hay tareas con estos filtros." />;
  }

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
              <td className="px-3 py-2 text-[#9aafc3] whitespace-nowrap">
                {proyecto[t.proyecto_id]?.nombre}
                {clienteDe[t.cliente_id] && (
                  <div className="text-[11px] flex items-center gap-1"><Handshake className="w-3 h-3" /> {clienteDe[t.cliente_id].nombre}</div>
                )}
              </td>
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
