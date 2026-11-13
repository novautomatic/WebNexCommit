// /ventas: app de vendedores y captadores (pensada para el celular).
// Captador: jornada + inscribir + sus inscritos + sus pagos.
// Vendedor: además su embudo de prospectos, propuestas y tabla de comisiones.
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import SEO from '../../components/SEO';
import { useAuth } from '../../components/AuthContext';
import {
  CONCEPTOS, ESTADOS_VENTA, ETAPAS, pesos,
  useConfigVentas, useIniciarJornada, useJornadas, usePagosVentas, useProspectos,
  useSoyVendedor, useTerminarJornada, useVentas,
} from '../../hooks/ventas';
import { EtapaChip, FichaProspecto, FormInscripcion, TablaComisiones } from './piezas';
import { fecha, hoyISO, ui } from './estilos';

function Jornada() {
  const jornadas = useJornadas();
  const iniciar = useIniciarJornada();
  const terminar = useTerminarJornada();
  const [zona, setZona] = useState('');
  const [error, setError] = useState('');
  const abierta = (jornadas.data ?? []).find((j) => j.estado === 'abierta');
  const correr = async (fn) => { setError(''); try { await fn(); } catch (e) { setError(e.message); } };

  return (
    <div className={`${ui.card} space-y-2`}>
      {abierta ? (
        <>
          <p className="text-white">Jornada en curso en <b>{abierta.zona}</b> desde las {new Date(abierta.inicio).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}.</p>
          <p className={ui.muted}>Todo lo que inscribas ahora cuenta para esta jornada.</p>
          <button type="button" className={ui.btnSec} onClick={() => correr(() => terminar.mutateAsync())}>Terminar jornada</button>
        </>
      ) : (
        <>
          <p className="text-white">¿Sales a terreno? Inicia tu jornada.</p>
          <div className="flex gap-2">
            <input className={ui.input} value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Comuna o zona" aria-label="Zona de la jornada" />
            <button type="button" className={ui.btn} disabled={iniciar.isPending} onClick={() => correr(async () => { await iniciar.mutateAsync(zona); setZona(''); })}>Iniciar</button>
          </div>
        </>
      )}
      {error && <p className={ui.error} role="alert">{error}</p>}
    </div>
  );
}

function MisProspectos({ yo }) {
  const { data = [] } = useProspectos();
  const [filtro, setFiltro] = useState('activos');
  const [abierto, setAbierto] = useState(null);
  const hoy = hoyISO();
  const mios = data.filter((p) => p.asignado_a === yo.id);
  const lista = mios.filter((p) => (filtro === 'activos' ? !['ganado', 'perdido'].includes(p.etapa) : filtro === 'todos' || p.etapa === filtro))
    .sort((a, b) => (a.proximo_paso_fecha ?? '9999').localeCompare(b.proximo_paso_fecha ?? '9999'));
  const actual = mios.find((p) => p.id === abierto);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ id: 'activos', label: 'Activos' }, ...ETAPAS, { id: 'todos', label: 'Todos' }].map((e) => (
          <button key={e.id} type="button" onClick={() => setFiltro(e.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${filtro === e.id ? 'bg-[#248bde] text-white' : 'border border-white/10 text-[#9aafc3]'}`}>
            {e.label} ({e.id === 'activos' ? mios.filter((p) => !['ganado', 'perdido'].includes(p.etapa)).length : e.id === 'todos' ? mios.length : mios.filter((p) => p.etapa === e.id).length})
          </button>
        ))}
      </div>
      {lista.length === 0 && <p className={ui.muted}>No hay prospectos aquí.</p>}
      <ul className="space-y-2">
        {lista.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => setAbierto(p.id)} className={`${ui.card} w-full text-left hover:border-[#248bde]/50`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">{p.negocio}</p>
                  <p className={ui.muted}>{p.contacto}{p.comuna ? ` · ${p.comuna}` : ''}</p>
                </div>
                <EtapaChip etapa={p.etapa} />
              </div>
              {p.proximo_paso && (
                <p className={`mt-2 text-sm ${p.proximo_paso_fecha && p.proximo_paso_fecha < hoy ? 'text-amber-300' : 'text-[#cfe0f0]'}`}>
                  → {p.proximo_paso}{p.proximo_paso_fecha ? ` · ${fecha(`${p.proximo_paso_fecha}T12:00`)}` : ''}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
      {actual && <FichaProspecto prospecto={actual} onClose={() => setAbierto(null)} puedeProponer />}
    </div>
  );
}

function MisInscritos({ yo }) {
  const { data = [] } = useProspectos();
  const mios = data.filter((p) => p.captado_por === yo.id && p.origen === 'terreno');
  return (
    <div className={ui.card}>
      <h2 className={`${ui.h2} mb-2`}>Mis inscritos ({mios.length})</h2>
      <p className={`${ui.muted} mb-3`}>Se pagan los que la jefatura valida: número real, sin repetir y que respondió.</p>
      <ul className="divide-y divide-white/5">
        {mios.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span className="text-white">{p.negocio} <span className="text-[#9aafc3]">· {fecha(p.created_at)}</span></span>
            <span className={p.validado ? 'text-emerald-300' : p.validado === false ? 'text-red-300' : 'text-[#9aafc3]'}>
              {p.validado ? 'Válido' : p.validado === false ? 'No válido' : 'Por revisar'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MisVentas() {
  const { data = [] } = useVentas();
  const { data: prospectos = [] } = useProspectos();
  const nombre = Object.fromEntries(prospectos.map((p) => [p.id, p.negocio]));
  return (
    <div className="space-y-2">
      {data.length === 0 && <p className={ui.muted}>Aún no tienes propuestas. Ábrelas desde un prospecto con «Armar propuesta».</p>}
      {data.map((v) => (
        <div key={v.id} className={ui.card}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-white">{nombre[v.prospecto_id] ?? 'Cliente'} · {v.descripcion}</p>
              <p className={ui.muted}>Total {pesos(v.total)} · {v.nivel_precio === 'lista' ? 'precio lista' : v.nivel_precio === 'oferta' ? 'oferta' : 'última oferta'} · tabla {v.tabla}</p>
            </div>
            <span className="text-sm font-semibold text-[#67c8f3]">{pesos(v.comision)}</span>
          </div>
          <p className="mt-1 text-sm text-[#cfe0f0]">{ESTADOS_VENTA[v.estado]}{v.nota_jefe ? ` · ${v.nota_jefe}` : ''}</p>
        </div>
      ))}
    </div>
  );
}

function MisPagos() {
  const { data = [] } = usePagosVentas();
  const pendiente = data.filter((g) => !g.pagado_at).reduce((s, g) => s + Number(g.monto), 0);
  const pagado = data.filter((g) => g.pagado_at).reduce((s, g) => s + Number(g.monto), 0);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className={ui.card}><p className={ui.muted}>Por recibir</p><p className="text-2xl font-semibold text-[#67c8f3]">{pesos(pendiente)}</p></div>
        <div className={ui.card}><p className={ui.muted}>Ya transferido</p><p className="text-2xl font-semibold text-white">{pesos(pagado)}</p></div>
      </div>
      <div className={ui.card}>
        <ul className="divide-y divide-white/5">
          {data.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="text-white">{CONCEPTOS[g.concepto]}<span className="block text-xs text-[#9aafc3]">{g.detalle}</span></span>
              <span className="text-right">{pesos(g.monto)}<span className="block text-xs text-[#9aafc3]">{g.pagado_at ? `Transferido ${fecha(g.pagado_at)}` : 'Pendiente'}</span></span>
            </li>
          ))}
          {data.length === 0 && <li className={`${ui.muted} py-2`}>Aún no hay pagos.</li>}
        </ul>
      </div>
    </div>
  );
}

export default function VentasApp() {
  const { user, loading, logout } = useAuth();
  const yo = useSoyVendedor(Boolean(user));
  const conf = useConfigVentas();
  const [tab, setTab] = useState(null);

  const tabs = useMemo(() => (yo.data?.rol === 'vendedor'
    ? [['prospectos', 'Prospectos'], ['inscribir', 'Registrar'], ['ventas', 'Propuestas'], ['pagos', 'Mis pagos'], ['comisiones', 'Comisiones']]
    : [['inscribir', 'Inscribir'], ['inscritos', 'Mis inscritos'], ['pagos', 'Mis pagos']]), [yo.data?.rol]);

  if (loading || (user && yo.isLoading)) return <div className="min-h-screen bg-[#0a1628] p-8 text-[#9aafc3]">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!yo.data) {
    return (
      <div className="min-h-screen bg-[#0a1628] p-8 text-center text-[#cfe0f0]">
        <p>Tu cuenta no tiene acceso a ventas.</p>
        <button type="button" onClick={logout} className={`${ui.btnSec} mt-4`}>Salir</button>
      </div>
    );
  }
  const actual = tab ?? tabs[0][0];

  return (
    <div className="min-h-screen bg-[#0a1628] pb-16">
      <SEO title="Ventas — NexCommit" noIndex />
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0d1e30]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-semibold text-white">Hola, {yo.data.nombre.split(' ')[0]}</p>
            <p className="text-xs text-[#9aafc3]">{yo.data.rol === 'vendedor' ? 'Vendedor' : 'Captador'} · NexCommit</p>
          </div>
          <button type="button" onClick={logout} className="rounded-lg p-2 text-red-300 hover:bg-red-500/10" aria-label="Salir"><LogOut className="h-5 w-5" /></button>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2" aria-label="Secciones">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} aria-current={actual === id ? 'page' : undefined}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm ${actual === id ? 'border-[#67c8f3] text-white' : 'border-transparent text-[#9aafc3]'}`}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        {actual === 'inscribir' && (
          <>
            <Jornada />
            <FormInscripcion
              titulo={yo.data.rol === 'vendedor' ? 'Registrar prospecto' : 'Inscribir negocio'}
              ayuda={yo.data.rol === 'vendedor'
                ? 'Fuera de una jornada, el prospecto queda a tu nombre y protegido. En jornada, va a la jefatura como inscrito de terreno.'
                : `Beneficio para el negocio: ${conf.data?.config?.pct_oferta ?? 10}% de descuento en la implementación. Ganas ${pesos(conf.data?.config?.pago_inscrito ?? 1500)} por cada inscrito válido.`}
            />
          </>
        )}
        {actual === 'prospectos' && <MisProspectos yo={yo.data} />}
        {actual === 'inscritos' && <MisInscritos yo={yo.data} />}
        {actual === 'ventas' && <MisVentas />}
        {actual === 'pagos' && <MisPagos />}
        {actual === 'comisiones' && (
          <div className={ui.card}>
            <h2 className={`${ui.h2} mb-1`}>Tabla de comisiones</h2>
            <p className={`${ui.muted} mb-3`}>Sobre el total del contrato: implementación + {conf.data?.config?.meses_minimos ?? 6} meses de mensualidad, al precio final.</p>
            <TablaComisiones tramos={conf.data?.tramos} config={conf.data?.config} />
          </div>
        )}
      </main>
    </div>
  );
}
