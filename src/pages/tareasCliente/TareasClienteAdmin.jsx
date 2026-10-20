// Panel → "Tareas de clientes" (/admin?tab=clientes-tareas). Separate from the internal
// GitHub-backed tasks: every task has a client half (deliverables + date) and a team half.
// ?vista=tareas|solicitudes|recurrentes|contactos · ?tarea=<numero> opens one (links in emails).
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Avatar, Pill, btnPrimary, card, inputClass } from '../tareas/ui';
import { useEquipo, useMiEquipoId } from '../../hooks/tareas';
import {
  ESTADO_CLIENTE,
  ESTADO_ENCARGADO,
  diasHasta,
  esperaCliente,
  estaCerrada,
  fechaCorta,
  textoPlazo,
  useClientesBasico,
  useContactos,
  usePlantillas,
  useSolicitudes,
  useTareasCliente,
} from '../../hooks/tareasCliente';
import TareaClienteForm from './TareaClienteForm';
import TareaClienteDetalle from './TareaClienteDetalle';
import ContactosVista from './ContactosVista';
import PlantillasVista from './PlantillasVista';
import SolicitudesVista from './SolicitudesVista';

const VISTAS = [
  { id: 'tareas', label: 'Tareas' },
  { id: 'solicitudes', label: 'Solicitudes' },
  { id: 'recurrentes', label: 'Recurrentes' },
  { id: 'contactos', label: 'Contactos' },
];

const FILTROS = [
  { id: 'abiertas', label: 'Abiertas', fn: (t) => !estaCerrada(t) },
  { id: 'revisar', label: 'Por revisar', fn: (t) => !estaCerrada(t) && t.estado_cliente === 'entregada' },
  { id: 'vencidas', label: 'Cliente atrasado', fn: (t) => esperaCliente(t) && diasHasta(t.fecha_cliente) < 0 },
  { id: 'cerradas', label: 'Cerradas', fn: (t) => estaCerrada(t) },
  { id: 'todas', label: 'Todas', fn: () => true },
];

function FilaTarea({ t, onClick }) {
  const n = diasHasta(t.fecha_cliente);
  const espera = esperaCliente(t);
  const hechos = t.entregables.filter((x) => x.hecho).length;
  const total = t.entregables.length;
  const ec = ESTADO_CLIENTE[t.estado_cliente];
  const ee = ESTADO_ENCARGADO[t.estado_encargado];
  return (
    <button type="button" onClick={onClick}
      className={`${card} w-full text-left p-4 hover:border-[#67c8f3]/40 transition-colors ${estaCerrada(t) ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#5f7891]">#{t.numero}</span>
        <span className="text-white font-medium">{t.titulo}</span>
        <Pill color={t.cliente?.color || '#e0a64b'}>{t.cliente?.empresa || t.cliente?.nombre}</Pill>
        {t.cancelada_at && <Pill color="#64748b">Cancelada</Pill>}
        {t.cerrada_at && <Pill color="#199e70">Cumplida</Pill>}
      </div>
      <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[#8fc0f5] text-xs shrink-0">Cliente</span>
          <span className="text-[#d6e2ee] truncate">{t.contacto?.nombre}</span>
          <Pill color={ec.color}>{ec.label}</Pill>
          <span className="text-xs shrink-0" style={{ color: espera && n < 0 ? '#f87171' : espera && n <= 1 ? '#f59e0b' : '#9aafc3' }}>
            {fechaCorta(t.fecha_cliente)}{espera ? ` · ${textoPlazo(t.fecha_cliente)}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[#6fd3ad] text-xs shrink-0">NexCommit</span>
          <Avatar nombre={t.encargado?.nombre} size={20} />
          <span className="text-[#d6e2ee] truncate">{t.encargado?.nombre?.split(' ')[0]}</span>
          <Pill color={ee.color}>{ee.label}</Pill>
          <span className="text-xs text-[#9aafc3] shrink-0">{fechaCorta(t.fecha_encargado)}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full bg-[#199e70]" style={{ width: `${total ? (hechos / total) * 100 : 0}%` }} />
        </div>
        <span className="text-[11px] text-[#9aafc3]">{hechos}/{total} entregables</span>
      </div>
    </button>
  );
}

export default function TareasClienteAdmin() {
  const [params, setParams] = useSearchParams();
  const vista = VISTAS.some((v) => v.id === params.get('vista')) ? params.get('vista') : 'tareas';
  const numeroAbierto = Number(params.get('tarea')) || null;

  const { data: tareas = [], isLoading, error } = useTareasCliente();
  const { data: clientes = [] } = useClientesBasico();
  const { data: contactos = [] } = useContactos();
  const { data: plantillas = [] } = usePlantillas();
  const { data: solicitudes } = useSolicitudes();
  const { data: equipo = [] } = useEquipo();
  const { data: yo } = useMiEquipoId();
  const esDueno = equipo.some((m) => m.id === yo && m.rol === 'dueno');

  const [filtro, setFiltro] = useState('abiertas');
  const [fCliente, setFCliente] = useState('');
  const [fEncargado, setFEncargado] = useState('');
  const [texto, setTexto] = useState('');
  const [form, setForm] = useState(null); // { tarea?, inicial? }

  const ir = (cambios) => {
    const p = new URLSearchParams(params);
    Object.entries(cambios).forEach(([k, v]) => (v == null ? p.delete(k) : p.set(k, String(v))));
    setParams(p, { replace: true });
  };

  const lista = useMemo(() => {
    const fn = FILTROS.find((x) => x.id === filtro).fn;
    const q = texto.trim().toLowerCase();
    return tareas
      .filter(fn)
      .filter((t) => !fCliente || t.cliente_id === fCliente)
      .filter((t) => !fEncargado || t.encargado_id === fEncargado)
      .filter((t) => !q || `${t.titulo} ${t.contacto?.nombre} ${t.cliente?.nombre} ${t.cliente?.empresa} #${t.numero}`.toLowerCase().includes(q))
      .sort((a, b) => Number(estaCerrada(a)) - Number(estaCerrada(b)) || a.fecha_cliente.localeCompare(b.fecha_cliente));
  }, [tareas, filtro, fCliente, fEncargado, texto]);

  const abierta = numeroAbierto ? tareas.find((t) => t.numero === numeroAbierto) : null;
  const pendientesSolic = (solicitudes?.solicitudes ?? []).filter((s) => s.estado === 'nueva').length
    + (solicitudes?.derechos ?? []).filter((d) => d.estado === 'pendiente').length;
  const porRevisar = tareas.filter(FILTROS[1].fn).length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Tareas de clientes</h1>
          <p className="text-sm text-[#9aafc3]">Lo que cada cliente nos debe entregar y lo que hacemos nosotros con eso.</p>
        </div>
        {vista === 'tareas' && (
          <button type="button" className={`${btnPrimary} ml-auto`} onClick={() => setForm({})}>
            <Plus className="w-4 h-4" /> Nueva tarea
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-white/10 mb-5 overflow-x-auto">
        {VISTAS.map((v) => (
          <button key={v.id} type="button" onClick={() => ir({ vista: v.id, tarea: null })}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${vista === v.id ? 'border-[#67c8f3] text-white' : 'border-transparent text-[#9aafc3] hover:text-white'}`}>
            {v.label}
            {v.id === 'solicitudes' && pendientesSolic > 0 && <span className="ml-1.5 rounded-full bg-[#e66767] px-1.5 text-[10px] text-white">{pendientesSolic}</span>}
            {v.id === 'tareas' && porRevisar > 0 && <span className="ml-1.5 rounded-full bg-[#9085e9] px-1.5 text-[10px] text-white">{porRevisar}</span>}
          </button>
        ))}
      </div>

      {vista === 'tareas' && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex gap-1 flex-wrap">
              {FILTROS.map((x) => (
                <button key={x.id} type="button" onClick={() => setFiltro(x.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${filtro === x.id ? 'border-[#67c8f3] text-white bg-[#67c8f3]/10' : 'border-white/10 text-[#9aafc3] hover:text-white'}`}>
                  {x.label}
                </button>
              ))}
            </div>
            <select className={`${inputClass} !w-auto`} value={fCliente} onChange={(e) => setFCliente(e.target.value)} aria-label="Filtrar por cliente">
              <option value="">Todos los clientes</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.empresa || c.nombre}</option>)}
            </select>
            <select className={`${inputClass} !w-auto`} value={fEncargado} onChange={(e) => setFEncargado(e.target.value)} aria-label="Filtrar por encargado">
              <option value="">Todos los encargados</option>
              {equipo.filter((m) => m.activo).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5f7891]" />
              <input className={`${inputClass} pl-9`} placeholder="Buscar…" value={texto} onChange={(e) => setTexto(e.target.value)} />
            </div>
          </div>

          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 mb-3">
            No se pudieron cargar las tareas. ¿Ya se corrieron las 14 partes de la migración tareas_clientes?
          </div>}
          {isLoading ? <p className="text-sm text-[#9aafc3]">Cargando…</p> : (
            <div className="space-y-2">
              {lista.map((t) => <FilaTarea key={t.id} t={t} onClick={() => ir({ tarea: t.numero })} />)}
              {!lista.length && <div className={`${card} p-6 text-sm text-[#9aafc3]`}>No hay tareas con este filtro.</div>}
            </div>
          )}
        </>
      )}

      {vista === 'solicitudes' && (
        <SolicitudesVista datos={solicitudes} clientes={clientes} contactos={contactos} onCrearTarea={(inicial) => setForm({ inicial })} />
      )}
      {vista === 'recurrentes' && <PlantillasVista plantillas={plantillas} clientes={clientes} contactos={contactos} equipo={equipo} />}
      {vista === 'contactos' && <ContactosVista clientes={clientes} contactos={contactos} esDueno={esDueno} />}

      {abierta && !form && (
        <TareaClienteDetalle tarea={abierta} onClose={() => ir({ tarea: null })} onEditar={() => setForm({ tarea: abierta })} />
      )}
      {form && (
        <TareaClienteForm
          tarea={form.tarea}
          inicial={form.inicial}
          clientes={clientes}
          contactos={contactos}
          equipo={equipo}
          onClose={() => setForm(null)}
          onGuardada={(r) => r?.numero && ir({ vista: 'tareas', tarea: r.numero })}
        />
      )}
    </div>
  );
}
