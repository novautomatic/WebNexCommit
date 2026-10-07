// Management sections of the panel (sidebar → Gestión). Each one loads its own data;
// react-query shares the cache with the tasks zone.
import React from 'react';
import { useClientes, useEquipo, useProyectoClientes, useProyectos, useTareasLista } from '../../hooks/tareas';
import ProyectosVista from './ProyectosVista';
import ClientesVista from './ClientesVista';
import EquipoVista from './EquipoVista';
import { ErrorBox } from './ui';

function Encabezado({ titulo, children }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold text-white">{titulo}</h1>
      {children && <p className="text-sm text-[#9aafc3] mt-1">{children}</p>}
    </div>
  );
}

function Estado({ consultas, children }) {
  const error = consultas.find((q) => q.error)?.error;
  if (error) return <ErrorBox error={error} />;
  if (consultas.some((q) => q.isLoading)) return <p className="text-[#9aafc3]">Cargando…</p>;
  return children;
}

export function ProyectosPagina({ irA }) {
  const proyectos = useProyectos();
  const tareas = useTareasLista();
  const clientes = useClientes();
  const vinculos = useProyectoClientes();
  return (
    <>
      <Encabezado titulo="Proyectos">Cada proyecto es un repositorio de GitHub; sus tareas nacen y se mueven allá.</Encabezado>
      <Estado consultas={[proyectos, tareas, clientes, vinculos]}>
        <ProyectosVista
          proyectos={proyectos.data ?? []}
          tareas={tareas.data ?? []}
          clientes={clientes.data ?? []}
          vinculos={vinculos.data ?? []}
          onNuevaTarea={(id) => irA('tablero', { proyecto: id, nueva: id })}
          onVerProyecto={(id) => irA('tablero', { proyecto: id })}
        />
      </Estado>
    </>
  );
}

export function ClientesPagina({ irA }) {
  const proyectos = useProyectos();
  const tareas = useTareasLista();
  const clientes = useClientes();
  const vinculos = useProyectoClientes();
  return (
    <>
      <Encabezado titulo="Clientes">Quién es cliente de qué proyecto, y cuánto trabajo tiene abierto.</Encabezado>
      <Estado consultas={[proyectos, tareas, clientes, vinculos]}>
        <ClientesVista
          clientes={clientes.data ?? []}
          vinculos={vinculos.data ?? []}
          proyectos={proyectos.data ?? []}
          tareas={tareas.data ?? []}
          onVerProyecto={(id) => irA('tablero', { proyecto: id })}
        />
      </Estado>
    </>
  );
}

export function EquipoPagina() {
  const equipo = useEquipo();
  const tareas = useTareasLista();
  return (
    <>
      <Encabezado titulo="Equipo" />
      <Estado consultas={[equipo, tareas]}>
        <EquipoVista equipo={equipo.data ?? []} tareas={tareas.data ?? []} />
      </Estado>
    </>
  );
}
