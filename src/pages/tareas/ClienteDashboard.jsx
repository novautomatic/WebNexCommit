// Per-client dashboard: panel → Clientes → click a client (?tab=clientes&cliente=<id>).
// Data, contacts and websites; every task (internal ones of its projects + client
// tasks); a timeline of what happened (emails we sent, their replies read from
// Gmail, deliveries, consents, reviews); and documents.
import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, Check, FileText, Handshake, Inbox, Mail, MailCheck, Pencil, Phone, RefreshCw,
} from 'lucide-react';
import { ESTADO, estaAbierta, estaVencida, formatearFecha } from '../../hooks/tareas';
import { ESTADO_CLIENTE, ESTADO_ENCARGADO, estaCerrada } from '../../hooks/tareasCliente';
import {
  useClienteDashboard, useLeerCorreoAhora, useResolverRespuesta, useUltimaLectura,
} from '../../hooks/clienteDashboard';
import { useAccionesEquipo } from '../../hooks/archivosCliente';
import ExploradorArchivos from '../../components/ExploradorArchivos';
import { ClienteForm, SitiosFila } from './ClientesVista';
import { ErrorBox, Pill, btnGhost, btnPrimary, card } from './ui';

const TIPO_CORREO = { invitacion: 'Primer correo (políticas)', permiso_web: 'Correo permiso «Powered by»', campana: 'Correo de novedades' };
const NOMBRE_AVISO = {
  cliente_bienvenida: 'Bienvenida al portal',
  cliente_nueva: 'Tarea nueva',
  cliente_diario: 'Recordatorio diario de tareas',
  cliente_devuelta: 'Entrega devuelta',
};
const CONSENTIMIENTO = {
  acepta_politicas: 'Aceptó términos y política de privacidad',
  acepta_marketing: 'Aceptó recibir novedades',
  retira_marketing: 'Retiró las novedades',
  rectifica_datos: 'Corrigió sus datos',
  autoriza_web: 'Autorizó «Powered by NexCommit» en su web',
  rechaza_web: 'No autorizó «Powered by NexCommit»',
  borra_respuesta_web: 'Se borró la respuesta al permiso web',
};
const CLASIFICACION = {
  si: { label: 'Dijo que sí', color: '#34d399' },
  no: { label: 'Dijo que no', color: '#94a3b8' },
  dudoso: { label: 'Revisar', color: '#f59e0b' },
};
const FILTROS = [
  { id: 'todo', label: 'Todo' },
  { id: 'enviado', label: 'Le escribimos' },
  { id: 'respuesta', label: 'Respondió' },
  { id: 'tarea', label: 'Tareas' },
  { id: 'otro', label: 'Consentimientos y documentos' },
];

const fechaHora = (iso) =>
  iso ? new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const diasDesde = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

export default function ClienteDashboard({ cliente, proyectos, vinculos, tareas, irA, onVolver }) {
  const q = useClienteDashboard(cliente.id);
  const [editando, setEditando] = useState(false);
  const d = q.data;

  const suyos = useMemo(() => {
    const ids = new Set(vinculos.filter((v) => v.cliente_id === cliente.id).map((v) => v.proyecto_id));
    return proyectos.filter((p) => ids.has(p.id));
  }, [vinculos, proyectos, cliente.id]);
  const internas = useMemo(() => {
    const ids = new Set(suyos.map((p) => p.id));
    return tareas.filter((t) => ids.has(t.proyecto_id));
  }, [tareas, suyos]);

  return (
    <div className="space-y-5">
      <button type="button" onClick={onVolver} className="text-sm text-[#9aafc3] hover:text-white flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Todos los clientes
      </button>

      <header className={`${card} p-5 flex flex-wrap items-start justify-between gap-4`}>
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cliente.color }} />
            <h1 className="text-2xl font-semibold text-white truncate">{cliente.nombre}</h1>
            {!cliente.activo && <Pill color="#64748b">Inactivo</Pill>}
          </div>
          {cliente.empresa && <p className="text-sm text-[#9aafc3]">{cliente.empresa}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#9aafc3]">
            {cliente.email && <a href={`mailto:${cliente.email}`} className="flex items-center gap-1 hover:text-white"><Mail className="w-3.5 h-3.5" />{cliente.email}</a>}
            {cliente.telefono && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{cliente.telefono}</span>}
          </div>
          <SitiosFila cliente={cliente} />
          <div className="flex flex-wrap gap-1.5">
            {suyos.map((p) => (
              <button key={p.id} type="button" onClick={() => irA('tablero', { proyecto: p.id })}>
                <Pill color={p.color}>{p.nombre}</Pill>
              </button>
            ))}
          </div>
          {cliente.notas && <p className="text-sm text-[#c6d4e1] whitespace-pre-line max-w-2xl">{cliente.notas}</p>}
        </div>
        <button type="button" className={btnGhost} onClick={() => setEditando(true)}>
          <Pencil className="w-4 h-4" /> Editar datos y webs
        </button>
      </header>

      <ErrorBox error={q.error} />
      {q.isLoading && <p className="text-[#9aafc3]">Cargando…</p>}
      {d && (
        <>
          <Indicadores cliente={cliente} d={d} internas={internas} />
          <PorRevisar respuestas={d.respuestas} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Tareas d={d} internas={internas} irA={irA} />
            <Contactos contactos={d.contactos} irA={irA} />
          </div>
          <LineaDeTiempo cliente={cliente} d={d} />
          <Documentos clienteId={cliente.id} documentos={d.documentos} carpetas={d.carpetas} />
        </>
      )}

      {editando && (
        <ClienteForm
          cliente={cliente}
          proyectos={proyectos.filter((p) => p.tipo !== 'area')}
          vinculados={suyos.map((p) => p.id)}
          onClose={() => setEditando(false)}
        />
      )}
    </div>
  );
}

function Seccion({ titulo, extra, children }) {
  return (
    <section className={`${card} p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-white font-semibold">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, valor, detalle, color }) {
  return (
    <div className={`${card} px-4 py-3`}>
      <div className="text-xl font-semibold truncate" style={{ color: color || '#fff' }}>{valor}</div>
      <div className="text-xs text-[#9aafc3]">{label}</div>
      {detalle && <div className="text-[11px] text-[#9aafc3] mt-0.5 truncate">{detalle}</div>}
    </div>
  );
}

// "Did they answer?": compares the last email we sent with the last one they wrote.
function Indicadores({ cliente, d, internas }) {
  const abiertasCliente = d.tareasCliente.filter((t) => !estaCerrada(t));
  const atrasadas = abiertasCliente.filter((t) => ['pendiente', 'devuelta'].includes(t.estado_cliente) && t.fecha_cliente < new Date().toISOString().slice(0, 10)).length
    + internas.filter(estaVencida).length;
  const enviados = [
    ...d.correos.filter((c) => c.estado === 'enviado').map((c) => c.created_at),
    ...d.avisos.filter((a) => a.estado === 'enviado').map((a) => a.created_at),
    ...d.resenas.map((r) => r.recordatorio_at || r.enviada_at).filter(Boolean),
  ].sort().reverse();
  const ultimoEnviado = enviados[0];
  const ultimaRespuesta = d.respuestas[0]?.fecha;
  const respondio = ultimaRespuesta && (!ultimoEnviado || ultimaRespuesta >= ultimoEnviado);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Tile label="Tareas abiertas" valor={abiertasCliente.length + internas.filter(estaAbierta).length}
        detalle={`${abiertasCliente.length} de cliente · ${internas.filter(estaAbierta).length} internas`} />
      <Tile label="Atrasadas" valor={atrasadas} color={atrasadas ? '#f87171' : undefined} />
      <Tile label="Último correo que le enviamos" valor={ultimoEnviado ? formatearFecha(ultimoEnviado) : '—'}
        detalle={ultimoEnviado ? `hace ${diasDesde(ultimoEnviado)} días` : 'Todavía nada'} />
      <Tile
        label="¿Respondió?"
        valor={!ultimoEnviado && !ultimaRespuesta ? '—' : respondio ? 'Sí' : 'No ha respondido'}
        color={respondio ? '#34d399' : ultimoEnviado ? '#f59e0b' : undefined}
        detalle={ultimaRespuesta ? `Última respuesta: ${formatearFecha(ultimaRespuesta)}` : cliente.email ? 'Sin respuestas en Gmail' : 'Sin correo registrado'}
      />
    </div>
  );
}

function PorRevisar({ respuestas }) {
  const resolver = useResolverRespuesta();
  const pendientes = respuestas.filter((r) => r.tipo === 'permiso_web' && r.clasificacion === 'dudoso' && !r.resuelta_at);
  if (!pendientes.length) return null;
  return (
    <section className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 space-y-3">
      <h2 className="text-amber-200 font-semibold">Respondió el correo de permiso «Powered by» · confirma qué dijo</h2>
      <ErrorBox error={resolver.error} />
      {pendientes.map((r) => (
        <div key={r.id} className="space-y-2">
          <p className="text-xs text-[#9aafc3]">{r.de} · {fechaHora(r.fecha)}</p>
          <blockquote className="text-sm text-white whitespace-pre-line border-l-2 border-amber-300/50 pl-3">{r.extracto || '(sin texto)'}</blockquote>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={resolver.isPending}
              onClick={() => resolver.mutate({ id: r.id, decision: 'si' })}>
              <Check className="w-4 h-4" /> Autorizó
            </button>
            <button type="button" className={btnGhost} disabled={resolver.isPending}
              onClick={() => resolver.mutate({ id: r.id, decision: 'no' })}>No autorizó</button>
            <button type="button" className={btnGhost} disabled={resolver.isPending}
              onClick={() => resolver.mutate({ id: r.id, decision: 'ignorar' })}>No era sobre eso</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function Tareas({ d, internas, irA }) {
  const [verCerradas, setVerCerradas] = useState(false);
  const deCliente = d.tareasCliente.filter((t) => verCerradas || !estaCerrada(t));
  const propias = internas.filter((t) => verCerradas || estaAbierta(t));
  return (
    <Seccion
      titulo="Tareas"
      extra={(
        <label className="flex items-center gap-2 text-xs text-[#9aafc3]">
          <input type="checkbox" checked={verCerradas} onChange={(e) => setVerCerradas(e.target.checked)} /> Ver cerradas
        </label>
      )}
    >
      <h3 className="text-xs font-medium text-[#9aafc3] mb-2 flex items-center gap-1"><Handshake className="w-3.5 h-3.5" /> De cliente (lo que entrega el cliente + lo que hace el encargado)</h3>
      {!deCliente.length && <p className="text-sm text-[#9aafc3] mb-3">Ninguna.</p>}
      <ul className="space-y-2 mb-4">
        {deCliente.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => irA('clientes-tareas', { tarea: String(t.numero) })}
              className="w-full text-left rounded-lg border border-white/10 p-2.5 hover:border-white/25">
              <div className="text-sm text-white truncate">#{t.numero} · {t.titulo}</div>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-[#9aafc3] items-center">
                {t.cancelada_at ? <Pill color="#64748b">Cancelada</Pill> : t.cerrada_at ? <Pill color="#199e70">Cumplida</Pill> : (
                  <>
                    <Pill color={ESTADO_CLIENTE[t.estado_cliente].color}>Cliente: {ESTADO_CLIENTE[t.estado_cliente].label}</Pill>
                    <Pill color={ESTADO_ENCARGADO[t.estado_encargado].color}>NexCommit: {ESTADO_ENCARGADO[t.estado_encargado].label}</Pill>
                  </>
                )}
                <span>Cliente {formatearFecha(t.fecha_cliente)} · {t.encargado?.nombre} {formatearFecha(t.fecha_encargado)}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <h3 className="text-xs font-medium text-[#9aafc3] mb-2">Internas (de sus proyectos)</h3>
      {!propias.length && <p className="text-sm text-[#9aafc3]">Ninguna.</p>}
      <ul className="space-y-1.5">
        {propias.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => irA('lista', { tarea: String(t.numero) })}
              className="w-full text-left flex items-center gap-2 text-sm hover:bg-white/5 rounded-md px-1.5 py-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ESTADO[t.estado].color }} aria-hidden="true" />
              <span className="text-white truncate flex-1">{t.titulo}</span>
              <span className={`text-xs whitespace-nowrap ${estaVencida(t) ? 'text-red-300' : 'text-[#9aafc3]'}`}>
                {ESTADO[t.estado].label}{t.fecha_limite ? ` · ${formatearFecha(t.fecha_limite)}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Seccion>
  );
}

function Contactos({ contactos, irA }) {
  return (
    <Seccion
      titulo="Personas de contacto"
      extra={<button type="button" className="text-xs text-[#9aafc3] hover:text-white" onClick={() => irA('clientes-tareas', { vista: 'contactos' })}>Gestionar →</button>}
    >
      {!contactos.length && <p className="text-sm text-[#9aafc3]">Sin contactos. Agrégalos en Tareas → De clientes → Contactos para darles acceso al portal.</p>}
      <ul className="space-y-2">
        {contactos.map((c) => (
          <li key={c.id} className="text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-white">{c.nombre}</span>
            {c.cargo && <span className="text-xs text-[#9aafc3]">{c.cargo}</span>}
            <a href={`mailto:${c.email}`} className="text-xs text-[#9aafc3] hover:text-white">{c.email}</a>
            {c.bloqueado_at ? <Pill color="#f87171">Bloqueado: no recibe correos</Pill>
              : !c.activo ? <Pill color="#64748b">Desactivado</Pill>
              : c.user_id ? <Pill color="#34d399" title={c.ultimo_ingreso_at ? `Último ingreso ${fechaHora(c.ultimo_ingreso_at)}` : 'Aún no entra'}>
                  Portal {c.ultimo_ingreso_at ? `· entró ${formatearFecha(c.ultimo_ingreso_at)}` : '· sin entrar'}
                </Pill>
              : <Pill color="#9aafc3">Sin acceso al portal</Pill>}
          </li>
        ))}
      </ul>
    </Seccion>
  );
}

function LineaDeTiempo({ cliente, d }) {
  const [filtro, setFiltro] = useState('todo');
  const leer = useLeerCorreoAhora();
  const lectura = useUltimaLectura();
  const numero = Object.fromEntries(d.tareasCliente.map((t) => [t.id, t]));
  const contacto = Object.fromEntries(d.contactos.map((c) => [c.id, c]));

  const eventos = useMemo(() => {
    const e = [];
    for (const c of d.correos) {
      e.push({ id: `c${c.id}`, grupo: 'enviado', fecha: c.created_at, icono: Mail, color: c.estado === 'error' ? '#f87171' : '#67c8f3',
        titulo: `Le enviamos: ${TIPO_CORREO[c.tipo] ?? c.tipo}`, detalle: `${c.email ?? cliente.email ?? ''} · ${c.estado === 'error' ? `falló: ${c.detalle ?? ''}` : c.estado}` });
    }
    for (const a of d.avisos) {
      e.push({ id: `a${a.id}`, grupo: 'enviado', fecha: a.created_at, icono: Mail, color: a.estado === 'error' ? '#f87171' : '#67c8f3',
        titulo: `Le enviamos: ${NOMBRE_AVISO[a.tipo] ?? a.tipo}`,
        detalle: `${contacto[a.contacto_id]?.nombre ?? a.para} · ${a.estado === 'error' ? `falló: ${a.detalle ?? ''}` : a.estado}` });
    }
    for (const r of d.resenas) {
      if (r.enviada_at) e.push({ id: `rs${r.id}`, grupo: 'enviado', fecha: r.enviada_at, icono: Mail, color: '#67c8f3', titulo: 'Le pedimos una reseña', detalle: r.nombre });
      if (r.recordatorio_at) e.push({ id: `rr${r.id}`, grupo: 'enviado', fecha: r.recordatorio_at, icono: Mail, color: '#67c8f3', titulo: 'Recordatorio de la reseña', detalle: r.nombre });
      if (r.respondida_at) e.push({ id: `ra${r.id}`, grupo: 'respuesta', fecha: r.respondida_at, icono: MailCheck, color: '#34d399', titulo: 'Escribió su reseña', detalle: r.nombre });
    }
    for (const r of d.respuestas) {
      const c = r.tipo === 'permiso_web' && r.clasificacion ? CLASIFICACION[r.clasificacion] : null;
      e.push({ id: `re${r.id}`, grupo: 'respuesta', fecha: r.fecha, icono: Inbox, color: '#34d399',
        titulo: `Respondió: ${r.asunto || '(sin asunto)'}`, detalle: r.de, texto: r.extracto, pill: c });
    }
    for (const h of d.historial) {
      const t = numero[h.tarea_id];
      e.push({ id: `h${h.id}`, grupo: 'tarea', fecha: h.created_at, icono: Handshake, color: '#9085e9',
        titulo: `#${t?.numero ?? ''} ${h.accion}`, detalle: `${h.actor}${h.detalle ? ` · ${h.detalle}` : ''}` });
    }
    for (const c of d.consentimientos) {
      e.push({ id: `k${c.id}`, grupo: 'otro', fecha: c.created_at, icono: Check, color: '#e0a64b',
        titulo: CONSENTIMIENTO[c.accion] ?? c.accion, detalle: `${c.origen === 'web' ? 'En la web' : c.origen === 'correo' ? 'Por correo' : 'Desde el panel'}${c.detalle ? ` · ${c.detalle}` : ''}` });
    }
    for (const doc of d.documentos) {
      e.push({ id: `d${doc.id}`, grupo: 'otro', fecha: doc.created_at, icono: FileText, color: '#9aafc3',
        titulo: doc.origen === 'cliente' ? `Subió un documento: ${doc.nombre}` : `Documento: ${doc.nombre}`,
        detalle: doc.origen === 'cliente' ? doc.subido_por_nombre || 'El cliente' : doc.visible_cliente ? 'Visible para el cliente' : 'Interno' });
    }
    return e.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [d, cliente.email, numero, contacto]);

  const visibles = eventos.filter((x) => filtro === 'todo' || x.grupo === filtro);
  const l = lectura.data;

  return (
    <Seccion
      titulo="Lo que ha pasado"
      extra={(
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#9aafc3]">
          {l && (
            <span className={l.estado === 'error' ? 'text-red-300' : ''} title={l.detalle || ''}>
              {l.estado === 'error' ? `Gmail: error (${(l.detalle || '').slice(0, 60)})` : `Gmail revisado ${fechaHora(l.procesada_at || l.created_at)}`}
            </span>
          )}
          <button type="button" className="flex items-center gap-1 hover:text-white disabled:opacity-50" disabled={leer.isPending}
            onClick={() => leer.mutate()} title="Busca respuestas nuevas en nexcommit@gmail.com (se ven al minuto)">
            <RefreshCw className={`w-3.5 h-3.5 ${leer.isPending ? 'animate-spin' : ''}`} /> Revisar Gmail ahora
          </button>
        </div>
      )}
    >
      <div className="flex flex-wrap gap-1.5 mb-3">
        {FILTROS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFiltro(f.id)} aria-pressed={filtro === f.id}
            className={`text-xs px-2.5 py-1 rounded-full border ${filtro === f.id ? 'border-white/40 text-white bg-white/10' : 'border-white/10 text-[#9aafc3] hover:text-white'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <ErrorBox error={leer.error} />
      {!visibles.length && <p className="text-sm text-[#9aafc3]">Nada todavía.</p>}
      <ol className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
        {visibles.map((x) => {
          const Icono = x.icono;
          return (
            <li key={x.id} className="flex gap-3">
              <span className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${x.color}22`, color: x.color }}>
                <Icono className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-white">{x.titulo}</span>
                  {x.pill && <Pill color={x.pill.color}>{x.pill.label}</Pill>}
                </div>
                <div className="text-xs text-[#9aafc3] break-words">{fechaHora(x.fecha)}{x.detalle ? ` · ${x.detalle}` : ''}</div>
                {x.texto && <p className="mt-1 text-sm text-[#c6d4e1] whitespace-pre-line line-clamp-4">{x.texto}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </Seccion>
  );
}

function Documentos({ clienteId, documentos, carpetas }) {
  const acciones = useAccionesEquipo(clienteId);
  const usado = documentos.filter((d) => d.origen === 'cliente').reduce((n, d) => n + (d.tamano || 0), 0);
  return (
    <Seccion titulo="Documentos">
      <p className="text-xs text-[#9aafc3] mb-3">
        La misma carpeta que el cliente ve en su portal. Lo que sube el cliente lo ves aquí; lo tuyo es interno salvo que lo
        marques «Lo ve el cliente». El cliente solo puede mover o borrar lo que subió él. Cupo del cliente: 500 MB.
      </p>
      <ExploradorArchivos tema="oscuro" modo="equipo" carpetas={carpetas} documentos={documentos} acciones={acciones} usado={usado} cupo={524288000} />
    </Seccion>
  );
}
