import React, { useMemo } from 'react';
import { AlertTriangle, CalendarClock } from 'lucide-react';
import { ESTADO, ORDEN_GRAFICOS, ahoraMs, enDiasISO, estaAbierta, estaVencida, formatearFecha, hoyISO } from '../../hooks/tareas';
import { BarraAvance, BarrasApiladas, BarrasSemanas, Leyenda } from './graficos';
import { card } from './ui';
import { useKawaii } from '../../hooks/tema';
import { Carita } from './Kawaii';

const SEMANAS = 8;
// Open-work charts never contain completed tasks: keep them out of the legend.
const IDS_ABIERTAS = ORDEN_GRAFICOS.filter((id) => id !== 'completada');

function contar(lista) {
  const c = {};
  for (const t of lista) c[t.estado] = (c[t.estado] || 0) + 1;
  return c;
}

function agrupar(lista, clave, nombre, color) {
  const grupos = new Map();
  for (const t of lista) {
    const k = clave(t) ?? 'ninguno';
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(t);
  }
  return [...grupos.entries()].map(([id, ts]) => ({
    id, nombre: nombre(id), color: color?.(id), conteos: contar(ts), total: ts.length,
  }));
}

// Monday 00:00 (local) of the week containing `ms`.
function lunesDe(ms) {
  const d = new Date(ms);
  const dia = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dia);
  return d;
}

export default function ResumenVista({ tareas, proyecto, miembro, onAbrir, onElegirProyecto, onElegirPersona }) {
  const datos = useMemo(() => {
    const activas = tareas.filter((t) => t.estado !== 'cancelada');
    const conteos = contar(activas);
    const completadas = conteos.completada || 0;
    const abiertas = activas.filter(estaAbierta);

    const porProyecto = agrupar(abiertas, (t) => t.proyecto_id, (id) => proyecto[id]?.nombre || 'Otro', (id) => proyecto[id]?.color)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    const porPersona = agrupar(abiertas, (t) => t.responsable_id, (id) => miembro[id]?.nombre || 'Sin asignar')
      .sort((a, b) => b.total - a.total);

    const ahora = ahoraMs();
    const inicio = lunesDe(ahora).getTime() - (SEMANAS - 1) * 7 * 86400000;
    const semanas = Array.from({ length: SEMANAS }, (_, i) => {
      const desde = new Date(inicio + i * 7 * 86400000);
      return {
        desde: desde.getTime(),
        etiqueta: `${String(desde.getDate()).padStart(2, '0')}/${String(desde.getMonth() + 1).padStart(2, '0')}`,
        valor: 0,
      };
    });
    for (const t of activas) {
      if (!t.completada_at) continue;
      const ms = new Date(t.completada_at).getTime();
      const i = Math.floor((ms - inicio) / (7 * 86400000));
      if (i >= 0 && i < SEMANAS) semanas[i].valor += 1;
    }

    const limite = enDiasISO(14);
    const proximas = abiertas
      .filter((t) => t.fecha_limite && t.fecha_limite <= limite)
      .sort((a, b) => a.fecha_limite.localeCompare(b.fecha_limite));

    return {
      total: activas.length,
      completadas,
      pct: activas.length ? Math.round((completadas / activas.length) * 100) : 0,
      conteos, porProyecto, porPersona, semanas, proximas,
      vencidas: abiertas.filter(estaVencida).length,
      sinFecha: abiertas.filter((t) => !t.fecha_limite).length,
    };
  }, [tareas, proyecto, miembro]);

  const hoy = hoyISO();
  const kawaii = useKawaii();
  const animo = !datos.total ? 'dormida' : datos.vencidas ? 'preocupada' : datos.pct >= 60 ? 'feliz' : 'contenta';
  const frase = {
    dormida: 'Todavía no hay tareas por aquí 💤',
    preocupada: `Hay ${datos.vencidas} atrasada${datos.vencidas === 1 ? '' : 's'}… ¡tú puedes! 💪💜`,
    feliz: '¡Vamos increíble! Borahae 💜✨',
    contenta: '¡Paso a pasito se llega lejos! 🌸',
  }[animo];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <section className={`${card} p-5 xl:col-span-2`} aria-labelledby="avance-titulo">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          {kawaii && <Carita animo={animo} size={72} className="kawaii-flota" titulo={frase} />}
          <div className="flex-1 min-w-[200px]">
            <h2 id="avance-titulo" className="text-sm font-semibold text-white">Avance general</h2>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-4xl font-semibold text-white tabular-nums">{datos.pct}%</span>
              <span className="text-sm text-[#9aafc3]">{datos.completadas} de {datos.total} tareas completadas</span>
            </div>
            {kawaii && <p className="mt-1 text-sm text-[#9aafc3]">{frase}</p>}
          </div>
          <div className="flex gap-4 text-sm">
            {datos.vencidas > 0 && (
              <span className="flex items-center gap-1.5 text-[#f2b8b8]"><AlertTriangle className="w-4 h-4" /> {datos.vencidas} vencidas</span>
            )}
            {datos.sinFecha > 0 && <span className="text-[#9aafc3]">{datos.sinFecha} abiertas sin fecha</span>}
          </div>
        </div>
        <BarraAvance conteos={datos.conteos} />
        <div className="mt-3"><Leyenda conteos={datos.conteos} /></div>
      </section>

      <section className={`${card} p-5`} aria-labelledby="proy-titulo">
        <h2 id="proy-titulo" className="text-sm font-semibold text-white">Trabajo abierto por proyecto y área</h2>
        <p className="text-xs text-[#9aafc3] mb-3">Tareas sin cerrar, por estado. Toca una fila para ver su tablero.</p>
        <Leyenda ids={IDS_ABIERTAS} />
        <div className="mt-3">
          <BarrasApiladas filas={datos.porProyecto} onElegir={onElegirProyecto} vacio="No hay tareas abiertas." />
        </div>
      </section>

      <section className={`${card} p-5`} aria-labelledby="pers-titulo">
        <h2 id="pers-titulo" className="text-sm font-semibold text-white">Carga por persona</h2>
        <p className="text-xs text-[#9aafc3] mb-3">Tareas abiertas de cada responsable, por estado.</p>
        <Leyenda ids={IDS_ABIERTAS} />
        <div className="mt-3">
          <BarrasApiladas
            filas={datos.porPersona}
            onElegir={(id) => onElegirPersona(id === 'ninguno' ? 'nadie' : id)}
            vacio="No hay tareas abiertas."
          />
        </div>
      </section>

      <section className={`${card} p-5`} aria-labelledby="sem-titulo">
        <h2 id="sem-titulo" className="text-sm font-semibold text-white">Completadas por semana</h2>
        <p className="text-xs text-[#9aafc3] mb-3">Últimas {SEMANAS} semanas (desde el lunes).</p>
        <BarrasSemanas semanas={datos.semanas} color={ESTADO.completada.color} />
      </section>

      <section className={`${card} p-5`} aria-labelledby="prox-titulo">
        <h2 id="prox-titulo" className="text-sm font-semibold text-white">Vencidas y próximas (14 días)</h2>
        <p className="text-xs text-[#9aafc3] mb-3">Lo que hay que mirar primero.</p>
        {!datos.proximas.length && <p className="text-sm text-[#9aafc3]">Nada vence en los próximos 14 días.</p>}
        <ul className="divide-y divide-white/5 max-h-72 overflow-y-auto pr-1">
          {datos.proximas.map((t) => {
            const vencida = t.fecha_limite < hoy;
            return (
              <li key={t.id}>
                <button type="button" onClick={() => onAbrir(t)} className="w-full text-left py-2 flex items-center gap-3 hover:bg-white/[0.03] rounded-md px-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ESTADO[t.estado].color }} aria-hidden="true" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-white truncate">{t.titulo}</span>
                    <span className="block text-[11px] text-[#9aafc3] truncate">
                      {proyecto[t.proyecto_id]?.nombre} · {ESTADO[t.estado].label} · {miembro[t.responsable_id]?.nombre || 'Sin asignar'}
                    </span>
                  </span>
                  <span className={`text-xs whitespace-nowrap flex items-center gap-1 ${vencida ? 'text-[#f2b8b8]' : 'text-[#9aafc3]'}`}>
                    {vencida ? <AlertTriangle className="w-3.5 h-3.5" /> : <CalendarClock className="w-3.5 h-3.5" />}
                    {vencida ? 'Vencida ' : ''}{formatearFecha(t.fecha_limite)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
