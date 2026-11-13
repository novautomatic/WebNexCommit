// Panel → Ventas (solo dueños = jefatura de ventas). CRM de vendedores y captadores:
// prospectos y asignación, revisión de propuestas, pagos de clientes, jornadas,
// lo que se debe a cada persona, el equipo de ventas y las tablas de comisión.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, KeyRound, Plus, Trash2, X } from 'lucide-react';
import {
  CONCEPTOS, ESTADOS_VENTA, ETAPAS, pesos, wspLink,
  useAsignar, useBorrarProspecto, useCalcularBonos, useCancelarVenta, useConfigVentas, useDarAccesoVendedor,
  useEsJefeVentas, useGuardarConfigVentas, useGuardarPersona, useGuardarTramo, useJornadas, useMarcarPagado,
  usePagosVentas, usePersonasVentas, useProspectos, useRegistrarPagoCliente, useRevisarJornada, useRevisarVenta,
  useValidarInscrito, useVentas,
} from '../../hooks/ventas';
import { EtapaChip, FichaProspecto, FormInscripcion, Modal, TablaComisiones } from './piezas';
import { fecha, hoyISO, ui } from './estilos';

const VISTAS = [
  ['resumen', 'Resumen'], ['prospectos', 'Prospectos'], ['propuestas', 'Propuestas y ventas'],
  ['jornadas', 'Jornadas'], ['pagos', 'Pagos'], ['equipo', 'Equipo de ventas'], ['comisiones', 'Comisiones'],
];

function useAccion() {
  const [error, setError] = useState('');
  const correr = async (fn) => {
    setError('');
    try { return await fn(); } catch (e) { setError(e.message); return null; }
  };
  return { error, correr };
}

function Kpi({ titulo, valor, nota }) {
  return (
    <div className={ui.card}>
      <p className="text-xs text-[#9aafc3]">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{valor}</p>
      {nota && <p className="text-xs text-[#9aafc3]">{nota}</p>}
    </div>
  );
}

const esteMes = (f) => f && f.slice(0, 7) === hoyISO().slice(0, 7);

function Resumen({ prospectos, ventas, personas, pagos, irA }) {
  const vendedores = personas.filter((p) => p.rol === 'vendedor' && p.activo);
  const vendidoMes = ventas.filter((v) => esteMes(v.pago1_at)).reduce((s, v) => s + Number(v.total), 0);
  const porPagar = pagos.filter((g) => !g.pagado_at).reduce((s, g) => s + Number(g.monto), 0);
  const maxEtapa = Math.max(1, ...ETAPAS.map((e) => prospectos.filter((p) => p.etapa === e.id).length));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi titulo="Inscritos este mes" valor={prospectos.filter((p) => esteMes(p.created_at)).length} />
        <button type="button" className="text-left" onClick={() => irA('prospectos', { asignado: 'sin' })}>
          <Kpi titulo="Sin asignar" valor={prospectos.filter((p) => !p.asignado_a && !['ganado', 'perdido'].includes(p.etapa)).length} nota="Toca para asignar" />
        </button>
        <button type="button" className="text-left" onClick={() => irA('propuestas')}>
          <Kpi titulo="Propuestas por revisar" valor={ventas.filter((v) => v.estado === 'propuesta').length} />
        </button>
        <Kpi titulo="Vendido este mes" valor={pesos(vendidoMes)} nota="Contratos con 1.er pago este mes" />
        <Kpi titulo="Por transferir" valor={pesos(porPagar)} />
      </div>
      <div className={ui.card}>
        <h2 className={`${ui.h2} mb-3`}>Embudo</h2>
        <div className="space-y-2">
          {ETAPAS.map((e) => {
            const n = prospectos.filter((p) => p.etapa === e.id).length;
            return (
              <div key={e.id} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-[#cfe0f0]">{e.label}</span>
                <div className="h-5 flex-1 rounded bg-white/5">
                  <div className="h-5 rounded" style={{ width: `${(n / maxEtapa) * 100}%`, background: e.color }} />
                </div>
                <span className="w-8 text-right text-white">{n}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className={`${ui.card} overflow-x-auto`}>
        <h2 className={`${ui.h2} mb-3`}>Vendedores</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-[#9aafc3]">
            <th className="py-2 pr-3">Vendedor</th><th className="pr-3">Activos</th><th className="pr-3">Pasos vencidos</th><th className="pr-3">Ventas del mes</th><th>Vendido del mes</th>
          </tr></thead>
          <tbody>
            {vendedores.map((v) => {
              const suyos = prospectos.filter((p) => p.asignado_a === v.id);
              const delMes = ventas.filter((x) => x.vendedor_id === v.id && esteMes(x.pago1_at));
              return (
                <tr key={v.id} className="border-t border-white/5 text-[#cfe0f0]">
                  <td className="py-2 pr-3 text-white">{v.nombre}</td>
                  <td className="pr-3">{suyos.filter((p) => !['ganado', 'perdido'].includes(p.etapa)).length}</td>
                  <td className="pr-3">{suyos.filter((p) => p.proximo_paso_fecha && p.proximo_paso_fecha < hoyISO() && !['ganado', 'perdido'].includes(p.etapa)).length}</td>
                  <td className="pr-3">{delMes.length}</td>
                  <td>{pesos(delMes.reduce((s, x) => s + Number(x.total), 0))}</td>
                </tr>
              );
            })}
            {vendedores.length === 0 && <tr><td colSpan={5} className="py-2 text-[#9aafc3]">Agrega vendedores en «Equipo de ventas».</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Prospectos({ prospectos, personas, filtroInicial }) {
  const asignar = useAsignar();
  const validar = useValidarInscrito();
  const borrar = useBorrarProspecto();
  const { error, correr } = useAccion();
  const [texto, setTexto] = useState('');
  const [etapa, setEtapa] = useState('');
  const [asignado, setAsignado] = useState(filtroInicial ?? '');
  const [origen, setOrigen] = useState('');
  const [abierto, setAbierto] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const nombres = Object.fromEntries(personas.map((p) => [p.id, p.nombre]));
  const vendedores = personas.filter((p) => p.rol === 'vendedor' && p.activo);

  const lista = prospectos.filter((p) => {
    const t = texto.trim().toLowerCase();
    if (t && ![p.negocio, p.contacto, p.comuna, p.rubro, p.whatsapp].some((x) => (x ?? '').toLowerCase().includes(t))) return false;
    if (etapa && p.etapa !== etapa) return false;
    if (origen && p.origen !== origen) return false;
    if (asignado === 'sin' && p.asignado_a) return false;
    if (asignado && asignado !== 'sin' && p.asignado_a !== asignado) return false;
    return true;
  });
  const actual = prospectos.find((p) => p.id === abierto);

  const controlesJefe = actual && (
    <div className={`${ui.card} space-y-3`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className={`${ui.label} sm:mb-0 sm:w-24`} htmlFor="j-asig">Asignado a</label>
        <select id="j-asig" className={`${ui.input} sm:w-60`} value={actual.asignado_a ?? ''}
          onChange={(e) => correr(() => asignar.mutateAsync({ id: actual.id, vendedor: e.target.value }))}>
          <option value="">Sin asignar (lo veo yo)</option>
          {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
      </div>
      {actual.origen === 'terreno' && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[#9aafc3]">Inscrito válido (se paga al captador):</span>
          <button type="button" className={actual.validado ? ui.btn : ui.btnSec} onClick={() => correr(() => validar.mutateAsync({ id: actual.id, valido: true }))}><Check className="h-4 w-4" /> Sí</button>
          <button type="button" className={actual.validado === false ? ui.btnPeligro : ui.btnSec} onClick={() => correr(() => validar.mutateAsync({ id: actual.id, valido: false }))}><X className="h-4 w-4" /> No</button>
        </div>
      )}
      <button type="button" className={ui.btnPeligro} onClick={() => {
        if (window.confirm('¿Borrar este prospecto y sus notas? Úsalo cuando la persona pide que borren sus datos.')) {
          correr(async () => { await borrar.mutateAsync(actual.id); setAbierto(null); });
        }
      }}><Trash2 className="h-4 w-4" /> Borrar datos</button>
      {error && <p className={ui.error} role="alert">{error}</p>}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input className={`${ui.input} sm:w-64`} placeholder="Buscar negocio, persona, comuna…" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar" />
        <select className={`${ui.input} sm:w-40`} value={etapa} onChange={(e) => setEtapa(e.target.value)} aria-label="Etapa">
          <option value="">Todas las etapas</option>{ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <select className={`${ui.input} sm:w-48`} value={asignado} onChange={(e) => setAsignado(e.target.value)} aria-label="Asignado">
          <option value="">Todos</option><option value="sin">Sin asignar</option>
          {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
        <select className={`${ui.input} sm:w-36`} value={origen} onChange={(e) => setOrigen(e.target.value)} aria-label="Origen">
          <option value="">Todo origen</option><option value="terreno">Terreno</option><option value="propio">Propio</option><option value="panel">Panel</option>
        </select>
        <button type="button" className={ui.btn} onClick={() => setNuevo(true)}><Plus className="h-4 w-4" /> Agregar</button>
      </div>
      <div className={`${ui.card} overflow-x-auto p-0`}>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-[#9aafc3]">
            <th className="px-4 py-2">Negocio</th><th className="px-2">Origen</th><th className="px-2">Asignado</th><th className="px-2">Etapa</th><th className="px-2">Próximo paso</th><th className="px-2">Válido</th><th className="px-2">Creado</th>
          </tr></thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className="cursor-pointer border-t border-white/5 text-[#cfe0f0] hover:bg-white/5" onClick={() => setAbierto(p.id)}>
                <td className="px-4 py-2"><span className="text-white">{p.negocio}</span><span className="block text-xs text-[#9aafc3]">{p.contacto}{p.comuna ? ` · ${p.comuna}` : ''}</span></td>
                <td className="px-2">{p.origen}{p.captado_por ? <span className="block text-xs text-[#9aafc3]">{nombres[p.captado_por]}</span> : null}</td>
                <td className="px-2">{p.asignado_a ? nombres[p.asignado_a] : <span className="text-amber-300">Sin asignar</span>}</td>
                <td className="px-2"><EtapaChip etapa={p.etapa} /></td>
                <td className="px-2 text-xs">{p.proximo_paso ?? '—'}{p.proximo_paso_fecha ? ` · ${fecha(`${p.proximo_paso_fecha}T12:00`)}` : ''}</td>
                <td className="px-2">{p.origen !== 'terreno' ? '—' : p.validado ? '✔' : p.validado === false ? '✘' : '?'}</td>
                <td className="px-2 text-xs">{fecha(p.created_at)}</td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={7} className="px-4 py-3 text-[#9aafc3]">No hay prospectos con esos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
      {actual && <FichaProspecto prospecto={actual} onClose={() => setAbierto(null)} extra={controlesJefe} nombres={nombres} />}
      {nuevo && (
        <Modal titulo="Agregar prospecto" onClose={() => setNuevo(false)}>
          <FormInscripcion titulo="Datos del negocio" ayuda="Queda sin asignar: después lo asignas a un vendedor (tabla de asignados) o lo atiendes tú." onListo={() => setNuevo(false)} />
        </Modal>
      )}
    </div>
  );
}

function Propuestas({ ventas, prospectos, personas }) {
  const revisar = useRevisarVenta();
  const pago = useRegistrarPagoCliente();
  const cancelar = useCancelarVenta();
  const { error, correr } = useAccion();
  const [estado, setEstado] = useState('abiertas');
  const nombres = Object.fromEntries(personas.map((p) => [p.id, p.nombre]));
  const negocio = Object.fromEntries(prospectos.map((p) => [p.id, p.negocio]));
  const lista = ventas.filter((v) => (estado === 'abiertas' ? ['propuesta', 'aprobada', 'en_curso'].includes(v.estado) : estado === 'todas' || v.estado === estado));
  const pedirNota = (t) => window.prompt(t) ?? null;

  return (
    <div className="space-y-3">
      <select className={`${ui.input} sm:w-60`} value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
        <option value="abiertas">Abiertas</option>
        {Object.entries(ESTADOS_VENTA).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        <option value="todas">Todas</option>
      </select>
      {error && <p className={ui.error} role="alert">{error}</p>}
      {lista.length === 0 && <p className={ui.muted}>Nada por aquí.</p>}
      {lista.map((v) => (
        <div key={v.id} className={`${ui.card} space-y-2`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-white">{negocio[v.prospecto_id] ?? 'Cliente'} · {v.descripcion}</p>
              <p className={ui.muted}>{nombres[v.vendedor_id]} · {fecha(v.created_at)} · {ESTADOS_VENTA[v.estado]}</p>
            </div>
            <div className="text-right">
              <p className="text-white">{pesos(v.total)}</p>
              <p className="text-xs text-[#9aafc3]">comisión {pesos(v.comision)} · tabla {v.tabla}</p>
            </div>
          </div>
          <p className="text-sm text-[#cfe0f0]">
            Implementación {pesos(v.implementacion)} ({v.nivel_precio === 'lista' ? 'lista' : `${v.nivel_precio === 'oferta' ? 'oferta' : 'última oferta'}, lista ${pesos(v.implementacion_lista)}`})
            {Number(v.mensualidad) > 0 && ` + ${v.meses} × ${pesos(v.mensualidad)}`}
          </p>
          {v.nota_jefe && <p className={ui.muted}>Nota: {v.nota_jefe}</p>}
          <div className="flex flex-wrap gap-2">
            {v.estado === 'propuesta' && (
              <>
                <button type="button" className={ui.btn} onClick={() => { const n = pedirNota('Nota para el vendedor (opcional)'); if (n !== null) correr(() => revisar.mutateAsync({ id: v.id, aprobar: true, nota: n })); }}>Aprobar</button>
                <button type="button" className={ui.btnPeligro} onClick={() => { const n = pedirNota('¿Por qué se rechaza?'); if (n !== null) correr(() => revisar.mutateAsync({ id: v.id, aprobar: false, nota: n })); }}>Rechazar</button>
              </>
            )}
            {v.estado === 'aprobada' && <button type="button" className={ui.btn} onClick={() => correr(() => pago.mutateAsync({ id: v.id, numero: 1 }))}>Cliente pagó el 1.er 50%</button>}
            {v.estado === 'en_curso' && <button type="button" className={ui.btn} onClick={() => correr(() => pago.mutateAsync({ id: v.id, numero: 2 }))}>Cliente pagó el 2.º 50%</button>}
            {['aprobada', 'en_curso'].includes(v.estado) && (
              <button type="button" className={ui.btnPeligro} onClick={() => { const n = pedirNota('¿Por qué se cancela? Lo ya generado se mantiene.'); if (n !== null) correr(() => cancelar.mutateAsync({ id: v.id, nota: n })); }}>Cancelar</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Jornadas({ jornadas, prospectos, personas }) {
  const revisar = useRevisarJornada();
  const { error, correr } = useAccion();
  const nombres = Object.fromEntries(personas.map((p) => [p.id, p.nombre]));
  const horas = (j) => (j.fin ? ((new Date(j.fin) - new Date(j.inicio)) / 36e5).toFixed(1) : '—');
  return (
    <div className={`${ui.card} overflow-x-auto p-0`}>
      {error && <p className={`${ui.error} px-4 pt-3`} role="alert">{error}</p>}
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-[#9aafc3]">
          <th className="px-4 py-2">Persona</th><th className="px-2">Fecha</th><th className="px-2">Zona</th><th className="px-2">Horas</th><th className="px-2">Inscritos</th><th className="px-2">Estado</th><th className="px-2" />
        </tr></thead>
        <tbody>
          {jornadas.map((j) => (
            <tr key={j.id} className="border-t border-white/5 text-[#cfe0f0]">
              <td className="px-4 py-2 text-white">{nombres[j.persona_id]}</td>
              <td className="px-2">{fecha(j.inicio)}</td>
              <td className="px-2">{j.zona}</td>
              <td className="px-2">{horas(j)}</td>
              <td className="px-2">{prospectos.filter((p) => p.jornada_id === j.id).length}</td>
              <td className="px-2">{j.estado}</td>
              <td className="px-2 py-1 whitespace-nowrap">
                {['abierta', 'cerrada'].includes(j.estado) && (
                  <>
                    <button type="button" className={`${ui.btnSec} mr-1`} onClick={() => correr(() => revisar.mutateAsync({ id: j.id, aprobar: true }))}>Aprobar</button>
                    <button type="button" className={ui.btnPeligro} onClick={() => correr(() => revisar.mutateAsync({ id: j.id, aprobar: false }))}>Rechazar</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {jornadas.length === 0 && <tr><td colSpan={7} className="px-4 py-3 text-[#9aafc3]">Aún no hay jornadas.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Pagos({ pagos, personas }) {
  const marcar = useMarcarPagado();
  const bonos = useCalcularBonos();
  const { error, correr } = useAccion();
  const [sel, setSel] = useState([]);
  const [verPagados, setVerPagados] = useState(false);
  const [mes, setMes] = useState(hoyISO().slice(0, 7));
  const [aviso, setAviso] = useState('');
  const lista = pagos.filter((g) => verPagados || !g.pagado_at);

  const porPersona = personas.map((p) => ({
    ...p, pendiente: pagos.filter((g) => g.persona_id === p.id && !g.pagado_at).reduce((s, g) => s + Number(g.monto), 0),
  })).filter((p) => p.pendiente > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {porPersona.map((p) => (
          <div key={p.id} className={ui.card}>
            <p className="text-white">{p.nombre}</p>
            <p className="text-2xl font-semibold text-[#67c8f3]">{pesos(p.pendiente)}</p>
            <button type="button" className={`${ui.btnSec} mt-2`} onClick={() => setSel(pagos.filter((g) => g.persona_id === p.id && !g.pagado_at).map((g) => g.id))}>Seleccionar todo</button>
          </div>
        ))}
        {porPersona.length === 0 && <p className={ui.muted}>No se debe nada.</p>}
      </div>
      <div className={`${ui.card} flex flex-wrap items-end gap-2`}>
        <div><label className={ui.label} htmlFor="b-mes">Bonos por meta del mes</label>
          <input id="b-mes" type="month" className={ui.input} value={mes} onChange={(e) => setMes(e.target.value)} /></div>
        <button type="button" className={ui.btnSec} onClick={() => correr(async () => { const n = await bonos.mutateAsync(`${mes}-01`); setAviso(`${n ?? 0} bono(s) calculado(s).`); })}>Calcular bonos</button>
        {aviso && <span className={ui.ok}>{aviso}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={ui.btn} disabled={!sel.length} onClick={() => correr(async () => { await marcar.mutateAsync({ ids: sel, pagado: true }); setSel([]); })}>
          Marcar transferido ({sel.length}) · {pesos(pagos.filter((g) => sel.includes(g.id)).reduce((s, g) => s + Number(g.monto), 0))}
        </button>
        <label className="flex items-center gap-2 text-sm text-[#9aafc3]"><input type="checkbox" checked={verPagados} onChange={(e) => setVerPagados(e.target.checked)} /> Ver también lo transferido</label>
      </div>
      {error && <p className={ui.error} role="alert">{error}</p>}
      <div className={`${ui.card} overflow-x-auto p-0`}>
        <table className="w-full text-sm">
          <tbody>
            {lista.map((g) => (
              <tr key={g.id} className="border-t border-white/5 text-[#cfe0f0]">
                <td className="px-4 py-2">
                  {!g.pagado_at && <input type="checkbox" aria-label="Seleccionar" checked={sel.includes(g.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, g.id] : s.filter((x) => x !== g.id)))} />}
                </td>
                <td className="px-2 text-white">{personas.find((p) => p.id === g.persona_id)?.nombre}</td>
                <td className="px-2">{CONCEPTOS[g.concepto]}<span className="block text-xs text-[#9aafc3]">{g.detalle}</span></td>
                <td className="px-2 text-right">{pesos(g.monto)}</td>
                <td className="px-2 text-xs">{g.pagado_at ? (
                  <button type="button" className="underline" onClick={() => correr(() => marcar.mutateAsync({ ids: [g.id], pagado: false }))}>Transferido {fecha(g.pagado_at)} · deshacer</button>
                ) : 'Pendiente'}</td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td className="px-4 py-3 text-[#9aafc3]">Sin pagos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PERSONA_VACIA = { nombre: '', email: '', whatsapp: '', rol: 'vendedor', activo: true };

function Equipo({ personas }) {
  const guardar = useGuardarPersona();
  const acceso = useDarAccesoVendedor();
  const { error, correr } = useAccion();
  const [f, setF] = useState(null);
  const [clave, setClave] = useState(null);

  const enviar = (e) => {
    e.preventDefault();
    const d = (f.whatsapp ?? '').replace(/\D/g, '');
    correr(async () => {
      await guardar.mutateAsync({ ...f, email: f.email.trim().toLowerCase(), whatsapp: d ? `569${d.slice(-8)}` : null });
      setF(null);
    });
  };

  return (
    <div className="space-y-3">
      <button type="button" className={ui.btn} onClick={() => setF(PERSONA_VACIA)}><Plus className="h-4 w-4" /> Agregar persona</button>
      {error && <p className={ui.error} role="alert">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {personas.map((p) => (
          <div key={p.id} className={`${ui.card} space-y-1 ${p.activo ? '' : 'opacity-60'}`}>
            <p className="font-medium text-white">{p.nombre} <span className="text-xs text-[#9aafc3]">· {p.rol}{p.activo ? '' : ' · inactivo'}</span></p>
            <p className="text-sm text-[#cfe0f0]">{p.email}</p>
            {p.whatsapp && <p className="text-sm text-[#cfe0f0]">+{p.whatsapp}</p>}
            <p className="text-xs text-[#9aafc3]">Desde {fecha(`${p.inicio}T12:00`)} · {p.user_id ? 'con acceso' : 'sin acceso aún'}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className={ui.btnSec} onClick={() => setF(p)}>Editar</button>
              {p.activo && (
                <button type="button" className={ui.btnSec} disabled={acceso.isPending}
                  onClick={() => correr(async () => { const r = await acceso.mutateAsync(p.id); if (r) setClave({ ...r, persona: p }); })}>
                  <KeyRound className="h-4 w-4" /> {p.user_id ? 'Nueva clave' : 'Dar acceso'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {f && (
        <Modal titulo={f.id ? 'Editar persona' : 'Agregar persona'} onClose={() => setF(null)} ancho="max-w-lg">
          <form onSubmit={enviar} className="space-y-3">
            <div><label className={ui.label} htmlFor="e-nombre">Nombre</label><input id="e-nombre" className={ui.input} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required /></div>
            <div><label className={ui.label} htmlFor="e-email">Correo (con el que entra)</label><input id="e-email" type="email" className={ui.input} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
            <div><label className={ui.label} htmlFor="e-wsp">WhatsApp</label><input id="e-wsp" className={ui.input} value={f.whatsapp ?? ''} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} inputMode="tel" /></div>
            <div><label className={ui.label} htmlFor="e-rol">Rol</label>
              <select id="e-rol" className={ui.input} value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>
                <option value="vendedor">Vendedor</option><option value="captador">Captador</option>
              </select></div>
            <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Activo (si lo desactivas, pierde el acceso)</label>
            <button type="submit" className={ui.btn} disabled={guardar.isPending}>Guardar</button>
          </form>
        </Modal>
      )}
      {clave && (
        <Modal titulo={`Acceso de ${clave.persona.nombre}`} onClose={() => setClave(null)} ancho="max-w-lg">
          <div className="space-y-3 text-sm text-[#cfe0f0]">
            <p>Esta contraseña se muestra una sola vez. Pásasela por WhatsApp.</p>
            <p className="rounded-lg bg-[#0a1628] p-3 font-mono text-lg text-white">{clave.clave}</p>
            <p>Entra en <b>nexcommit.com/login</b> con {clave.email}.</p>
            {clave.persona.whatsapp && (
              <a className={ui.btn} target="_blank" rel="noreferrer" href={wspLink(clave.persona.whatsapp,
                `Hola ${clave.persona.nombre.split(' ')[0]}, tu acceso a ventas de NexCommit:\nhttps://www.nexcommit.com/login\nCorreo: ${clave.email}\nClave: ${clave.clave}`)}>
                Enviar por WhatsApp
              </a>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

const CAMPOS_CONFIG = [
  ['pct_asignado', '% de la tabla para clientes asignados'], ['pct_oferta', '% descuento oferta'], ['pct_ultima', '% descuento última oferta'],
  ['tope_ultimas_mes', 'Últimas ofertas al mes por vendedor'], ['pago_jornada', 'Pago por jornada (CLP)'], ['pago_inscrito', 'Pago por inscrito válido (CLP)'],
  ['meses_minimos', 'Meses mínimos de contrato'], ['dias_proteccion', 'Días de protección del prospecto propio'],
];

function Comisiones() {
  const { data } = useConfigVentas();
  const guardar = useGuardarConfigVentas();
  const tramo = useGuardarTramo();
  const { error, correr } = useAccion();
  const [f, setF] = useState(null);
  const [ok, setOk] = useState('');
  const config = f ?? data?.config;
  if (!config) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={`${ui.card} space-y-3`}>
        <h2 className={ui.h2}>Reglas</h2>
        {CAMPOS_CONFIG.map(([k, l]) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <label className="text-sm text-[#cfe0f0]" htmlFor={`c-${k}`}>{l}</label>
            <input id={`c-${k}`} className={`${ui.input} w-32 text-right`} inputMode="numeric" value={config[k]} onChange={(e) => setF({ ...config, [k]: e.target.value })} />
          </div>
        ))}
        <div><label className={ui.label} htmlFor="c-bonos">Bonos por meta (JSON: desde → bono)</label>
          <textarea id="c-bonos" rows={3} className={`${ui.input} font-mono text-xs`} value={typeof config.bonos === 'string' ? config.bonos : JSON.stringify(config.bonos)}
            onChange={(e) => setF({ ...config, bonos: e.target.value })} /></div>
        <button type="button" className={ui.btn} disabled={!f || guardar.isPending} onClick={() => correr(async () => {
          const { id: _ID, ...campos } = f;
          const bonosJson = typeof campos.bonos === 'string' ? JSON.parse(campos.bonos) : campos.bonos;
          const num = Object.fromEntries(CAMPOS_CONFIG.map(([k]) => [k, Number(campos[k])]));
          await guardar.mutateAsync({ ...num, bonos: bonosJson });
          setF(null); setOk('Guardado.');
        })}>Guardar reglas</button>
        {ok && <span className={`${ui.ok} ml-2`}>{ok}</span>}
        {error && <p className={ui.error} role="alert">{error}</p>}
      </div>
      <div className={`${ui.card} space-y-3`}>
        <h2 className={ui.h2}>Tramos</h2>
        <p className={ui.muted}>Monto fijo por tramo, o % del total en el primero y el último. La tabla de asignados se calcula sola con el % de arriba.</p>
        <TablaComisiones tramos={data.tramos} config={data.config} />
        <details>
          <summary className="cursor-pointer text-sm text-[#67c8f3]">Editar montos</summary>
          <div className="mt-2 space-y-1">
            {data.tramos.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm text-[#cfe0f0]">
                <span className="w-44">{pesos(t.desde)} – {t.hasta == null ? '…' : pesos(t.hasta)}</span>
                <input className={`${ui.input} w-32 text-right`} defaultValue={t.monto ?? t.pct} aria-label="Comisión del tramo"
                  onBlur={(e) => { const v = Number(e.target.value); if (v !== Number(t.monto ?? t.pct)) correr(() => tramo.mutateAsync({ id: t.id, ...(t.monto != null ? { monto: v } : { pct: v }) })); }} />
                <span>{t.monto != null ? 'CLP' : '%'}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

export default function VentasAdmin() {
  const [params, setParams] = useSearchParams();
  const jefe = useEsJefeVentas();
  const prospectos = useProspectos();
  const ventas = useVentas();
  const personas = usePersonasVentas();
  const jornadas = useJornadas();
  const pagos = usePagosVentas();
  const vista = VISTAS.some(([id]) => id === params.get('vista')) ? params.get('vista') : 'resumen';
  const irA = (v, extra = {}) => setParams({ tab: 'ventas', vista: v, ...extra }, { replace: true });

  const datos = useMemo(() => ({
    prospectos: prospectos.data ?? [], ventas: ventas.data ?? [], personas: personas.data ?? [],
    jornadas: jornadas.data ?? [], pagos: pagos.data ?? [],
  }), [prospectos.data, ventas.data, personas.data, jornadas.data, pagos.data]);

  if (jefe.isLoading) return <p className={ui.muted}>Cargando…</p>;
  if (!jefe.data) return <p className={ui.muted}>Ventas es solo para los dueños (jefatura de ventas).</p>;
  const porRevisar = datos.ventas.filter((v) => v.estado === 'propuesta').length;
  const sinAsignar = datos.prospectos.filter((p) => !p.asignado_a && !['ganado', 'perdido'].includes(p.etapa)).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Ventas</h1>
        <p className={ui.muted}>Vendedores y captadores entran en nexcommit.com/ventas. Tú asignas, revisas cada propuesta y pagas.</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-white/10" aria-label="Vistas de ventas">
        {VISTAS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => irA(id)} aria-current={vista === id ? 'page' : undefined}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm ${vista === id ? 'border-[#67c8f3] text-white' : 'border-transparent text-[#9aafc3] hover:text-white'}`}>
            {label}
            {id === 'propuestas' && porRevisar > 0 && <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 text-xs text-amber-300">{porRevisar}</span>}
            {id === 'prospectos' && sinAsignar > 0 && <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 text-xs text-amber-300">{sinAsignar}</span>}
          </button>
        ))}
      </nav>
      {vista === 'resumen' && <Resumen {...datos} irA={irA} />}
      {vista === 'prospectos' && <Prospectos {...datos} filtroInicial={params.get('asignado')} />}
      {vista === 'propuestas' && <Propuestas {...datos} />}
      {vista === 'jornadas' && <Jornadas {...datos} />}
      {vista === 'pagos' && <Pagos {...datos} />}
      {vista === 'equipo' && <Equipo {...datos} />}
      {vista === 'comisiones' && <Comisiones />}
    </div>
  );
}
