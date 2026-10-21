// Panel → Reseñas: pedir reseñas a clientes, aprobarlas y configurar el botón de Google.
// Flujo completo en supabase/migrations/20261021130100_resenas_1_tablas.sql.
import React, { useMemo, useState } from 'react';
import { Check, EyeOff, Mail, RotateCcw, Send, Trash2, X } from 'lucide-react';
import { useClientes } from '../../hooks/tareas';
import {
  useBorrarResena, useCancelarResena, useContactosCliente, useEnviarResena, useGuardarResenasConfig,
  useReenviarResena, useResenas, useResenasConfig, useRevisarResena, useSolicitudesResena,
} from '../../hooks/resenas';
import { SERVICIOS_RESENA, SERVICIO_RESENA } from '../../data/RESENAS';
import { ErrorBox, Pill, btnGhost, btnPrimary, card, inputClass, labelClass } from '../tareas/ui';

const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

const ESTADO_SOLICITUD = {
  pendiente: { label: 'Esperando', color: '#67c8f3' },
  respondida: { label: 'Respondida', color: '#34d399' },
  vencida: { label: 'Vencida', color: '#9aafc3' },
  cancelada: { label: 'Cancelada', color: '#64748b' },
};
const ENVIO = {
  pendiente: { label: 'Enviando…', color: '#fbbf24' },
  enviado: { label: 'Correo enviado', color: '#34d399' },
  error: { label: 'Error de envío', color: '#f87171' },
};

// ─── Pedir reseña ──────────────────────────────────────────────────────────
function PedirResena() {
  const { data: clientes } = useClientes();
  const [clienteId, setClienteId] = useState('');
  const [servicio, setServicio] = useState('desarrollo-web');
  const [principal, setPrincipal] = useState(true);
  const [elegidos, setElegidos] = useState([]);
  const [resultado, setResultado] = useState(null);
  const { data: contactos } = useContactosCliente(clienteId);
  const enviar = useEnviarResena();
  const cliente = (clientes ?? []).find((c) => c.id === clienteId);
  const activos = (clientes ?? []).filter((c) => c.activo);

  const elegirCliente = (id) => {
    setClienteId(id);
    setElegidos([]);
    setPrincipal(true);
    setResultado(null);
  };
  const alternar = (id) => setElegidos((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const mandar = () => {
    setResultado(null);
    enviar.mutate(
      { cliente: clienteId, servicio, frase: SERVICIO_RESENA[servicio].frase, principal: principal && !!cliente?.email, contactos: elegidos },
      { onSuccess: (r) => { setResultado(r); setElegidos([]); } },
    );
  };
  const nada = !(principal && cliente?.email) && !elegidos.length;

  return (
    <div className={`${card} p-4 space-y-4`}>
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2"><Mail className="w-4 h-4 text-[#67c8f3]" /> Pedir una reseña</h3>
        <p className="text-xs text-[#9aafc3] mt-1">
          Solo a clientes a los que ya les entregamos su proyecto. Cada persona recibe un enlace personal que vence en 30 días
          y un recordatorio automático a los 5 días si no responde.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Cliente</span>
          <select className={inputClass} value={clienteId} onChange={(e) => elegirCliente(e.target.value)}>
            <option value="">Elige un cliente…</option>
            {activos.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.empresa ? ` · ${c.empresa}` : ''}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>¿Qué le hicimos?</span>
          <select className={inputClass} value={servicio} onChange={(e) => setServicio(e.target.value)}>
            {SERVICIOS_RESENA.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
          </select>
          <span className="text-[11px] text-[#5f7891]">El correo dirá «¿cómo te fue con {SERVICIO_RESENA[servicio].frase}?» y la reseña se mostrará en esa página de servicio.</span>
        </label>
      </div>

      {cliente && (
        <div>
          <span className={labelClass}>¿A quién se la pedimos?</span>
          <div className="space-y-1.5">
            <label className={`flex items-center gap-2 text-sm ${cliente.email ? 'text-white' : 'text-[#5f7891]'}`}>
              <input type="checkbox" checked={principal && !!cliente.email} disabled={!cliente.email} onChange={(e) => setPrincipal(e.target.checked)} />
              {cliente.nombre} <span className="text-[#9aafc3]">· {cliente.email || 'sin correo en la ficha'}</span>
              <Pill color="#9aafc3">Ficha</Pill>
            </label>
            {(contactos ?? []).map((k) => {
              const off = !k.activo || !!k.bloqueado_at;
              return (
                <label key={k.id} className={`flex items-center gap-2 text-sm ${off ? 'text-[#5f7891]' : 'text-white'}`}>
                  <input type="checkbox" checked={elegidos.includes(k.id)} disabled={off} onChange={() => alternar(k.id)} />
                  {k.nombre}{k.cargo ? ` (${k.cargo})` : ''} <span className="text-[#9aafc3]">· {k.email}</span>
                  <Pill color="#67c8f3">Portal</Pill>
                  {off && <Pill color="#f87171">{k.bloqueado_at ? 'Bloqueado' : 'Inactivo'}</Pill>}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <ErrorBox error={enviar.error} />
      {resultado && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {resultado.enviados ? `Enviada${resultado.enviados > 1 ? 's' : ''} ${resultado.enviados} solicitud${resultado.enviados > 1 ? 'es' : ''}.` : 'No se envió ninguna.'}
          {resultado.omitidos?.map((o) => <div key={o.email} className="text-amber-200">Omitido {o.email}: {o.motivo}.</div>)}
        </div>
      )}
      <button type="button" className={btnPrimary} disabled={!cliente || nada || enviar.isPending} onClick={mandar}>
        <Send className="w-4 h-4" /> {enviar.isPending ? 'Enviando…' : 'Enviar solicitud de reseña'}
      </button>
    </div>
  );
}

// ─── Una reseña ────────────────────────────────────────────────────────────
function TarjetaResena({ r }) {
  const revisar = useRevisarResena();
  const borrar = useBorrarResena();
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const ocupado = revisar.isPending || borrar.isPending;
  const firma = r.publicar_nombre ? [r.nombre, r.cargo, r.empresa].filter(Boolean).join(' · ') : r.empresa || 'Cliente de NexCommit';

  return (
    <div className={`${card} p-4 space-y-3`}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#9aafc3]">
        <span className="text-white font-medium text-sm">{r.nombre}</span>
        {r.cargo && <span>{r.cargo}</span>}
        {r.empresa && <span>· {r.empresa}</span>}
        <span className="ml-auto">{fecha(r.created_at)}</span>
      </div>
      <p className="text-[#e6f1fb] text-sm leading-relaxed whitespace-pre-line">{r.texto}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[#9aafc3]">En la web firma:</span>
        <span className="text-white">{firma}</span>
        {!r.publicar_nombre && <Pill color="#fbbf24" title="No autorizó publicar su nombre">Sin nombre</Pill>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={`${inputClass} !w-auto !py-1.5 !text-xs`}
          value={r.servicio}
          onChange={(e) => revisar.mutate({ id: r.id, estado: r.estado, servicio: e.target.value, motivo: r.motivo })}
          title="Servicio donde se muestra"
        >
          {SERVICIOS_RESENA.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
          {!SERVICIO_RESENA[r.servicio] && <option value={r.servicio}>{r.servicio}</option>}
        </select>
        {r.estado !== 'aprobada' && (
          <button type="button" className={`${btnPrimary} !py-1.5 !text-xs`} disabled={ocupado} onClick={() => revisar.mutate({ id: r.id, estado: 'aprobada' })}>
            <Check className="w-3.5 h-3.5" /> Aprobar y publicar
          </button>
        )}
        {r.estado === 'aprobada' && (
          <button type="button" className={`${btnGhost} !py-1.5 !text-xs`} disabled={ocupado} onClick={() => revisar.mutate({ id: r.id, estado: 'pendiente' })}>
            <EyeOff className="w-3.5 h-3.5" /> Despublicar
          </button>
        )}
        {r.estado === 'pendiente' && !rechazando && (
          <button type="button" className={`${btnGhost} !py-1.5 !text-xs`} disabled={ocupado} onClick={() => setRechazando(true)}>
            <X className="w-3.5 h-3.5" /> Rechazar
          </button>
        )}
        <button
          type="button"
          className={`${btnGhost} !py-1.5 !text-xs ml-auto`}
          disabled={ocupado}
          title="Si el autor pide retirarla: se borra entera"
          onClick={() => window.confirm('¿Borrar esta reseña para siempre? Úsalo cuando el autor pida retirarla.') && borrar.mutate(r.id)}
        >
          <Trash2 className="w-3.5 h-3.5" /> Borrar
        </button>
      </div>
      {rechazando && (
        <div className="flex flex-wrap gap-2">
          <input className={`${inputClass} !py-1.5 !text-xs flex-1 min-w-[12rem]`} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            maxLength={300} placeholder="Motivo (interno, opcional)" />
          <button type="button" className={`${btnGhost} !py-1.5 !text-xs`} disabled={ocupado}
            onClick={() => revisar.mutate({ id: r.id, estado: 'rechazada', motivo }, { onSuccess: () => setRechazando(false) })}>
            Confirmar rechazo
          </button>
          <button type="button" className={`${btnGhost} !py-1.5 !text-xs`} onClick={() => setRechazando(false)}>Cancelar</button>
        </div>
      )}
      {r.estado === 'rechazada' && (
        <p className="text-xs text-[#9aafc3]">
          Rechazada {r.revisor?.nombre ? `por ${r.revisor.nombre}` : ''} el {fecha(r.revisada_at)}{r.motivo ? ` · ${r.motivo}` : ''}. Se borra sola a los 90 días.
        </p>
      )}
      {r.estado === 'aprobada' && (
        <p className="text-xs text-[#9aafc3]">Publicada {r.revisor?.nombre ? `por ${r.revisor.nombre}` : ''} el {fecha(r.revisada_at)}.</p>
      )}
      <ErrorBox error={revisar.error || borrar.error} />
    </div>
  );
}

// ─── Solicitudes enviadas ──────────────────────────────────────────────────
function Solicitudes() {
  const { data, isLoading, error } = useSolicitudesResena();
  const reenviar = useReenviarResena();
  const cancelar = useCancelarResena();
  return (
    <div className={`${card} overflow-x-auto`}>
      <ErrorBox error={error || reenviar.error || cancelar.error} />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-[#5f7891]">
            <th className="px-3 py-2">Persona</th>
            <th className="px-3 py-2">Servicio</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((s) => {
            const abierta = s.estado === 'pendiente' || s.estado === 'vencida';
            return (
              <tr key={s.id} className="border-t border-white/5 align-top">
                <td className="px-3 py-3">
                  <div className="text-white">{s.nombre}</div>
                  <div className="text-xs text-[#9aafc3] break-all">{s.email}</div>
                  <div className="text-[11px] text-[#5f7891]">{s.cliente?.empresa || s.cliente?.nombre}</div>
                </td>
                <td className="px-3 py-3 text-xs text-[#cfe0f0]">{SERVICIO_RESENA[s.servicio]?.label || s.servicio}</td>
                <td className="px-3 py-3 text-xs space-y-1">
                  <div className="flex flex-wrap gap-1">
                    <Pill color={ESTADO_SOLICITUD[s.estado]?.color}>{ESTADO_SOLICITUD[s.estado]?.label}</Pill>
                    {s.envio_estado && <Pill color={ENVIO[s.envio_estado].color} title={s.envio_detalle || undefined}>{ENVIO[s.envio_estado].label}</Pill>}
                  </div>
                  <div className="text-[#5f7891]">
                    Enviada {fecha(s.enviada_at)}
                    {s.recordatorio_at && ` · recordatorio ${fecha(s.recordatorio_at)}`}
                    {s.estado === 'pendiente' && ` · vence ${fecha(s.expira_at)}`}
                    {s.respondida_at && ` · respondió ${fecha(s.respondida_at)}`}
                  </div>
                  {s.envio_estado === 'error' && s.envio_detalle && <div className="text-red-300">{s.envio_detalle}</div>}
                </td>
                <td className="px-3 py-3">
                  {abierta && (
                    <div className="flex flex-col gap-1.5">
                      <button type="button" className={`${btnGhost} !px-2.5 !py-1.5 !text-xs`} disabled={reenviar.isPending} onClick={() => reenviar.mutate(s.id)}>
                        <RotateCcw className="w-3.5 h-3.5" /> Reenviar
                      </button>
                      <button type="button" className={`${btnGhost} !px-2.5 !py-1.5 !text-xs`} disabled={cancelar.isPending} onClick={() => cancelar.mutate(s.id)}>
                        <X className="w-3.5 h-3.5" /> Cancelar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {isLoading && <p className="p-4 text-sm text-[#9aafc3]">Cargando…</p>}
      {!isLoading && !data?.length && <p className="p-4 text-sm text-[#9aafc3]">Todavía no se ha pedido ninguna reseña.</p>}
    </div>
  );
}

// ─── Botón de Google ───────────────────────────────────────────────────────
function ConfigGoogle() {
  const { data } = useResenasConfig();
  const guardar = useGuardarResenasConfig();
  const [url, setUrl] = useState(null);
  const valor = url ?? data?.google_url ?? '';
  const activo = !!data?.google_activo;
  return (
    <div className={`${card} p-4 space-y-3`}>
      <div>
        <h3 className="text-white font-semibold">Botón «Déjala también en Google»</h3>
        <p className="text-xs text-[#9aafc3] mt-1">
          Se muestra a todos por igual después de enviar la reseña (mostrarlo solo a los contentos va contra las reglas de Google).
          Enciéndelo cuando el Perfil de Negocio esté verificado: antes, Google puede ocultar las opiniones.
          El enlace sale de Google → tu perfil → «Comparte tu vínculo de opiniones» → «Compartir vínculo».
        </p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input className={`${inputClass} flex-1 min-w-[16rem]`} value={valor} onChange={(e) => setUrl(e.target.value)} placeholder="https://g.page/r/…/review" />
        <button type="button" className={btnGhost} disabled={guardar.isPending} onClick={() => guardar.mutate({ url: valor, activo })}>Guardar enlace</button>
        <button type="button" className={activo ? btnGhost : btnPrimary} disabled={guardar.isPending}
          onClick={() => guardar.mutate({ url: valor, activo: !activo })}>
          {activo ? 'Apagar botón' : 'Encender botón'}
        </button>
        <Pill color={activo ? '#34d399' : '#9aafc3'}>{activo ? 'Encendido' : 'Apagado'}</Pill>
      </div>
      <ErrorBox error={guardar.error} />
    </div>
  );
}

export default function ResenasAdmin() {
  const { data, isLoading, error } = useResenas();
  const [vista, setVista] = useState('pendiente');
  const cuenta = useMemo(() => {
    const c = { pendiente: 0, aprobada: 0, rechazada: 0 };
    (data ?? []).forEach((r) => { c[r.estado] += 1; });
    return c;
  }, [data]);
  const lista = (data ?? []).filter((r) => r.estado === vista);
  const VISTAS = [
    ['pendiente', `Por revisar (${cuenta.pendiente})`],
    ['aprobada', `Publicadas (${cuenta.aprobada})`],
    ['rechazada', `Rechazadas (${cuenta.rechazada})`],
    ['solicitudes', 'Solicitudes enviadas'],
    ['google', 'Google'],
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">Reseñas</h2>
        <p className="text-sm text-[#9aafc3]">
          Las aprobadas aparecen en la home, en las landings de Google Ads y en la página de su servicio. El texto no se edita:
          se aprueba tal cual o se rechaza. Si alguien pide retirar la suya, bórrala.
        </p>
      </div>
      <PedirResena />
      <div className="flex flex-wrap gap-1">
        {VISTAS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setVista(k)}
            className={`text-xs px-3 py-1.5 rounded-full border ${vista === k ? 'border-[#67c8f3] text-white' : 'border-white/10 text-[#9aafc3]'}`}>
            {l}
          </button>
        ))}
      </div>
      {vista === 'solicitudes' && <Solicitudes />}
      {vista === 'google' && <ConfigGoogle />}
      {!['solicitudes', 'google'].includes(vista) && (
        <>
          <ErrorBox error={error} />
          {isLoading && <p className="text-sm text-[#9aafc3]">Cargando…</p>}
          {!isLoading && !lista.length && <p className="text-sm text-[#9aafc3]">No hay reseñas en esta vista.</p>}
          <div className="grid gap-3 lg:grid-cols-2">{lista.map((r) => <TarjetaResena key={r.id} r={r} />)}</div>
        </>
      )}
    </div>
  );
}
