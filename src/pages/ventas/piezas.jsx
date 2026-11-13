// Piezas compartidas del CRM de vendedores: las usan el panel de la jefatura
// (/admin?tab=ventas) y la app de vendedores y captadores (/ventas).
import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { RESPONSABLE } from '../../config/legal';
import {
  ETAPA, ETAPAS, calcularComision, pesos, precioSegunNivel, wspLink,
  useConfigVentas, useInscribir, useMoverProspecto, useNotaProspecto, useNotasProspecto,
  useProponer, useProximoPaso,
} from '../../hooks/ventas';
import { ui } from './estilos';

export function EtapaChip({ etapa }) {
  const e = ETAPA[etapa] ?? ETAPA.nuevo;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-0.5 text-xs text-[#cfe0f0]">
      <span className="h-2 w-2 rounded-full" style={{ background: e.color }} aria-hidden="true" />
      {e.label}
    </span>
  );
}

export function Modal({ titulo, onClose, children, ancho = 'max-w-2xl' }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className={`w-full ${ancho} max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#0c1a2c] p-4 sm:p-6`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className={ui.h2}>{titulo}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#9aafc3] hover:bg-white/5 hover:text-white" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const VACIO = { contacto: '', negocio: '', rubro: '', comuna: '', whatsapp: '', email: '', interes: '', acepta: false };

/** Ficha de inscripción. La casilla parte desmarcada y la marca la persona (Ley 19.628). */
export function FormInscripcion({ titulo = 'Inscribir negocio', ayuda, onListo }) {
  const [f, setF] = useState(VACIO);
  const [msg, setMsg] = useState(null);
  const inscribir = useInscribir();
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      await inscribir.mutateAsync(f);
      setMsg({ ok: true, texto: `Listo: ${f.negocio} quedó registrado.` });
      setF(VACIO);
      onListo?.();
    } catch (err) {
      setMsg({ ok: false, texto: err.message });
    }
  };

  return (
    <form onSubmit={enviar} className={`${ui.card} space-y-3`}>
      <div>
        <h2 className={ui.h2}>{titulo}</h2>
        {ayuda && <p className={`${ui.muted} mt-1`}>{ayuda}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={ui.label} htmlFor="i-contacto">Nombre de la persona *</label>
          <input id="i-contacto" className={ui.input} value={f.contacto} onChange={set('contacto')} required autoComplete="off" /></div>
        <div><label className={ui.label} htmlFor="i-negocio">Nombre del negocio *</label>
          <input id="i-negocio" className={ui.input} value={f.negocio} onChange={set('negocio')} required autoComplete="off" /></div>
        <div><label className={ui.label} htmlFor="i-wsp">WhatsApp *</label>
          <input id="i-wsp" className={ui.input} value={f.whatsapp} onChange={set('whatsapp')} required inputMode="tel" placeholder="9 1234 5678" autoComplete="off" /></div>
        <div><label className={ui.label} htmlFor="i-rubro">Rubro</label>
          <input id="i-rubro" className={ui.input} value={f.rubro} onChange={set('rubro')} placeholder="Almacén, clínica, taller…" /></div>
        <div><label className={ui.label} htmlFor="i-comuna">Comuna</label>
          <input id="i-comuna" className={ui.input} value={f.comuna} onChange={set('comuna')} /></div>
        <div><label className={ui.label} htmlFor="i-email">Correo (opcional)</label>
          <input id="i-email" type="email" className={ui.input} value={f.email} onChange={set('email')} autoComplete="off" /></div>
      </div>
      <div><label className={ui.label} htmlFor="i-interes">¿Qué le interesa?</label>
        <input id="i-interes" className={ui.input} value={f.interes} onChange={set('interes')} placeholder="Página web, chatbot, Google, tienda online…" /></div>

      <div className="rounded-lg border border-white/10 bg-[#0a1628] p-3 text-xs text-[#9aafc3] space-y-2">
        <p>
          Muéstrale esto a la persona: {RESPONSABLE.marca} ({RESPONSABLE.razonSocial}) usa su nombre, negocio y WhatsApp
          solo para contactarla y enviarle una propuesta. No se comparten con nadie. Puede pedir que se borren escribiendo a{' '}
          {RESPONSABLE.correo}.
        </p>
        <label className="flex items-start gap-2 text-sm text-white">
          <input type="checkbox" className="mt-1" checked={f.acepta} onChange={set('acepta')} />
          <span>La persona autoriza que {RESPONSABLE.marca} la contacte por WhatsApp para enviarle una propuesta.</span>
        </label>
      </div>

      {msg && <p className={msg.ok ? ui.ok : ui.error} role="status">{msg.texto}</p>}
      <button type="submit" className={`${ui.btn} w-full sm:w-auto`} disabled={inscribir.isPending || !f.acepta}>
        {inscribir.isPending ? 'Guardando…' : 'Inscribir'}
      </button>
    </form>
  );
}

/** Propuesta del vendedor: muestra la comisión estimada antes de enviarla a revisión. */
export function FormPropuesta({ prospecto, onListo }) {
  const { data } = useConfigVentas();
  const config = data?.config;
  const [f, setF] = useState({ descripcion: '', lista: '', nivel: prospecto.origen === 'terreno' ? 'oferta' : 'lista', mensualidad: '', meses: 6 });
  const [error, setError] = useState('');
  const proponer = useProponer();
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const lista = Number(f.lista) || 0;
  const impl = precioSegunNivel(lista, f.nivel, config);
  const total = impl + (Number(f.mensualidad) || 0) * (Number(f.meses) || 0);
  const tablaTipo = prospecto.asignado_por_jefe ? 'asignado' : 'normal';
  const comision = calcularComision(total, tablaTipo, data?.tramos, config);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await proponer.mutateAsync({
        prospecto: prospecto.id, descripcion: f.descripcion, lista,
        nivel: f.nivel, mensualidad: Number(f.mensualidad) || 0, meses: Number(f.meses),
      });
      onListo?.();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div><label className={ui.label} htmlFor="p-desc">Qué se vende *</label>
        <input id="p-desc" className={ui.input} value={f.descripcion} onChange={set('descripcion')} required placeholder="Landing + chatbot + mantención" /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={ui.label} htmlFor="p-lista">Implementación, precio lista (CLP + IVA) *</label>
          <input id="p-lista" className={ui.input} value={f.lista} onChange={set('lista')} required inputMode="numeric" /></div>
        <div><label className={ui.label} htmlFor="p-nivel">Precio</label>
          <select id="p-nivel" className={ui.input} value={f.nivel} onChange={set('nivel')}>
            <option value="lista" disabled={prospecto.origen === 'terreno'}>Lista</option>
            <option value="oferta">Oferta (−{config?.pct_oferta ?? 10}%)</option>
            <option value="ultima">Última oferta (−{config?.pct_ultima ?? 15}%) · máx. {config?.tope_ultimas_mes ?? 2} al mes</option>
          </select></div>
        <div><label className={ui.label} htmlFor="p-mens">Mensualidad (precio lista)</label>
          <input id="p-mens" className={ui.input} value={f.mensualidad} onChange={set('mensualidad')} inputMode="numeric" placeholder="0" /></div>
        <div><label className={ui.label} htmlFor="p-meses">Meses de contrato (mín. {config?.meses_minimos ?? 6})</label>
          <input id="p-meses" type="number" min={config?.meses_minimos ?? 6} className={ui.input} value={f.meses} onChange={set('meses')} /></div>
      </div>
      <dl className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-[#0a1628] p-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-[#9aafc3]">Implementación</dt><dd className="text-white">{pesos(impl)}</dd></div>
        <div><dt className="text-xs text-[#9aafc3]">Total contrato</dt><dd className="text-white">{pesos(total)}</dd></div>
        <div><dt className="text-xs text-[#9aafc3]">Tabla</dt><dd className="text-white">{tablaTipo === 'asignado' ? 'Asignado' : 'Normal'}</dd></div>
        <div><dt className="text-xs text-[#9aafc3]">Tu comisión</dt><dd className="font-semibold text-[#67c8f3]">{pesos(comision)}</dd></div>
      </dl>
      <p className="text-xs text-[#9aafc3]">Se paga la mitad cuando el cliente paga el primer 50% y la otra mitad cuando paga el segundo. La propuesta la revisa la jefatura antes de enviarla al cliente.</p>
      {error && <p className={ui.error} role="alert">{error}</p>}
      <button type="submit" className={ui.btn} disabled={proponer.isPending}>{proponer.isPending ? 'Enviando…' : 'Enviar a revisión'}</button>
    </form>
  );
}

/** Ficha de un prospecto: etapa, próximo paso, notas y propuesta. `extra` = controles de la jefatura. */
export function FichaProspecto({ prospecto: p, onClose, puedeProponer = false, extra = null, nombres = {} }) {
  const notas = useNotasProspecto(p.id);
  const mover = useMoverProspecto();
  const paso = useProximoPaso();
  const nota = useNotaProspecto();
  const [motivo, setMotivo] = useState('');
  const [etapa, setEtapa] = useState(p.etapa);
  const [proxTexto, setProxTexto] = useState(p.proximo_paso ?? '');
  const [proxFecha, setProxFecha] = useState(p.proximo_paso_fecha ?? '');
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState('nota');
  const [error, setError] = useState('');
  const [proponiendo, setProponiendo] = useState(false);

  const correr = async (fn) => {
    setError('');
    try { await fn(); } catch (e) { setError(e.message); }
  };

  const saludo = `Hola ${p.contacto.split(' ')[0]}, te escribo de NexCommit por ${p.negocio}.`;

  return (
    <Modal titulo={`${p.negocio} · ${p.contacto}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#cfe0f0]">
          <EtapaChip etapa={p.etapa} />
          {p.rubro && <span>· {p.rubro}</span>}
          {p.comuna && <span>· {p.comuna}</span>}
          <span>· {p.origen === 'terreno' ? 'Terreno' : p.origen === 'propio' ? 'Propio' : 'Panel'}</span>
          {p.asignado_por_jefe && <span className="rounded bg-white/5 px-1.5 text-xs">Tabla de asignados</span>}
          {nombres[p.captado_por] && <span className="text-[#9aafc3]">· Captó: {nombres[p.captado_por]}</span>}
        </div>
        {p.interes && <p className={ui.muted}>Le interesa: {p.interes}</p>}
        <div className="flex flex-wrap gap-2">
          <a className={ui.btn} href={wspLink(p.whatsapp, saludo)} target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4" /> WhatsApp +{p.whatsapp}
          </a>
          {p.email && <a className={ui.btnSec} href={`mailto:${p.email}`}>{p.email}</a>}
        </div>

        {extra}

        <div className={`${ui.card} space-y-2`}>
          <label className={ui.label} htmlFor="f-etapa">Etapa</label>
          <div className="flex flex-wrap gap-2">
            <select id="f-etapa" className={`${ui.input} sm:w-48`} value={etapa} onChange={(e) => setEtapa(e.target.value)}>
              {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
            {etapa === 'perdido' && (
              <input className={`${ui.input} sm:flex-1`} placeholder="¿Por qué se perdió?" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            )}
            <button type="button" className={ui.btnSec} disabled={etapa === p.etapa || mover.isPending}
              onClick={() => correr(() => mover.mutateAsync({ id: p.id, etapa, motivo }))}>Cambiar etapa</button>
          </div>
          {p.motivo_perdida && <p className={ui.muted}>Motivo: {p.motivo_perdida}</p>}
        </div>

        <div className={`${ui.card} space-y-2`}>
          <span className={ui.label}>Próximo paso</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className={`${ui.input} sm:flex-1`} value={proxTexto} onChange={(e) => setProxTexto(e.target.value)} placeholder="Llamar para agendar reunión" aria-label="Próximo paso" />
            <input type="date" className={`${ui.input} sm:w-44`} value={proxFecha} onChange={(e) => setProxFecha(e.target.value)} aria-label="Fecha del próximo paso" />
            <button type="button" className={ui.btnSec} disabled={paso.isPending}
              onClick={() => correr(() => paso.mutateAsync({ id: p.id, texto: proxTexto, fecha: proxFecha }))}>Guardar</button>
          </div>
        </div>

        {puedeProponer && !['ganado', 'perdido'].includes(p.etapa) && (
          <div className={ui.card}>
            {proponiendo
              ? <FormPropuesta prospecto={p} onListo={() => setProponiendo(false)} />
              : <button type="button" className={ui.btn} onClick={() => setProponiendo(true)}>Armar propuesta</button>}
          </div>
        )}

        <div className={`${ui.card} space-y-3`}>
          <span className={ui.label}>Actividad</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select className={`${ui.input} sm:w-36`} value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de nota">
              <option value="nota">Nota</option><option value="llamada">Llamada</option>
              <option value="whatsapp">WhatsApp</option><option value="reunion">Reunión</option>
            </select>
            <input className={`${ui.input} sm:flex-1`} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Qué pasó" aria-label="Texto de la nota" />
            <button type="button" className={ui.btnSec} disabled={!texto.trim() || nota.isPending}
              onClick={() => correr(async () => { await nota.mutateAsync({ id: p.id, tipo, texto }); setTexto(''); })}>Anotar</button>
          </div>
          <ul className="space-y-2">
            {(notas.data ?? []).map((n) => (
              <li key={n.id} className="text-sm">
                <span className="text-[#9aafc3]">{new Date(n.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })} · {n.autor}{n.tipo !== 'nota' && n.tipo !== 'sistema' ? ` · ${n.tipo}` : ''}</span>
                <p className={n.tipo === 'sistema' ? 'text-[#9aafc3] italic' : 'text-white'}>{n.texto}</p>
              </li>
            ))}
          </ul>
        </div>
        {error && <p className={ui.error} role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

export function TablaComisiones({ tramos = [], config }) {
  if (!config) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-[#9aafc3]">
          <th className="py-2 pr-3">Total del contrato</th><th className="py-2 pr-3">Comisión</th><th className="py-2">Si te lo asignan</th>
        </tr></thead>
        <tbody>
          {tramos.map((t) => (
            <tr key={t.id} className="border-t border-white/5 text-[#cfe0f0]">
              <td className="py-1.5 pr-3">{t.hasta == null ? `Desde ${pesos(t.desde)}` : t.desde === 0 ? `Menos de ${pesos(t.hasta + 1)}` : `${pesos(t.desde)} – ${pesos(t.hasta)}`}</td>
              <td className="py-1.5 pr-3">{t.monto != null ? pesos(t.monto) : `${t.pct}% del total`}</td>
              <td className="py-1.5">{t.monto != null ? pesos(calcularComision(t.desde, 'asignado', [t], config)) : `${Math.round((t.pct * config.pct_asignado) / 100)}% del total`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
