import React, { useState } from 'react';
import { Globe, Mail, Megaphone, Pencil, Phone, Plus, Send, Trash2 } from 'lucide-react';
import {
  estaAbierta, estaVencida, formatearFecha, useBorrarCliente, useCorreosClientes, useEnviarCampana,
  useEnviarInvitacion, useEnviarPermisoWeb, useGuardarCliente, useVincularClientes,
} from '../../hooks/tareas';
import { ErrorBox, Modal, Pill, btnGhost, btnPrimary, card, inputClass, labelClass } from './ui';

const EMAIL_OK = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;

// Consent state of a client. Only the client can grant it (web form or the
// /confirmar-datos link); the panel can only withdraw promotions.
function consentimiento(c) {
  if (!c.email || !EMAIL_OK.test(c.email)) return { id: 'sin_correo', label: 'Sin correo', color: '#64748b' };
  if (!c.acepta_politicas_at) return { id: 'pendiente', label: 'Sin aceptar', color: '#f59e0b' };
  if (c.acepta_marketing) return { id: 'promociones', label: 'Acepta correos', color: '#34d399' };
  return { id: 'politicas', label: 'Solo políticas', color: '#67c8f3' };
}

const ESTADO_CORREO = { pendiente: 'enviando…', enviado: 'enviado', error: 'falló' };
const TIPO_CORREO = { invitacion: 'Primer correo', permiso_web: 'Correo permiso web', campana: 'Último correo' };

// Answer to the "Correo permiso en página web" (Powered by NexCommit in their footer).
// The client replies by email and the team writes it down here.
const PERMISO_WEB = {
  si: { label: 'Web: autorizó', color: '#34d399' },
  no: { label: 'Web: no autorizó', color: '#94a3b8' },
};
const puedePedirPermisoWeb = (c) => consentimiento(c).id === 'promociones' || consentimiento(c).id === 'politicas';

export default function ClientesVista({ clientes, vinculos, proyectos, tareas, onVerProyecto }) {
  const [editando, setEditando] = useState(null);
  const [campana, setCampana] = useState(false);
  const [aviso, setAviso] = useState('');
  const correos = useCorreosClientes();
  const invitar = useEnviarInvitacion();
  const permisoWeb = useEnviarPermisoWeb();
  const proyecto = Object.fromEntries(proyectos.map((p) => [p.id, p]));
  const proyectosDe = (clienteId) =>
    vinculos.filter((v) => v.cliente_id === clienteId).map((v) => proyecto[v.proyecto_id]).filter(Boolean);
  const ultimoCorreo = (clienteId) => (correos.data ?? []).find((x) => x.cliente_id === clienteId);

  const activos = clientes.filter((c) => c.activo);
  const aceptan = activos.filter((c) => consentimiento(c).id === 'promociones');
  const porInvitar = activos.filter((c) => consentimiento(c).id === 'pendiente');
  const porPedirPermiso = activos.filter((c) => puedePedirPermisoWeb(c) && !c.permiso_web);

  const enviarInvitacion = (lista) => {
    const n = lista.length;
    const texto = n === 1
      ? `¿Enviar el primer correo a ${lista[0].nombre} (${lista[0].email})?`
      : `¿Enviar el primer correo a los ${n} clientes que aún no aceptan? (máximo uno cada 24 h por cliente)`;
    if (!window.confirm(texto)) return;
    setAviso('');
    invitar.mutate(lista.map((c) => c.id), {
      onSuccess: (r) => setAviso(`Primer correo: ${r.enviados} enviado${r.enviados === 1 ? '' : 's'}${r.omitidos ? `, ${r.omitidos} omitido${r.omitidos === 1 ? '' : 's'} (ya enviado en las últimas 24 h o tope diario)` : ''}.`),
    });
  };

  const enviarPermisoWeb = (lista) => {
    const n = lista.length;
    const texto = n === 1
      ? `¿Enviar el correo de permiso en página web a ${lista[0].nombre} (${lista[0].email})?\n\nLe pide autorizar «© ${new Date().getFullYear()} ${lista[0].empresa || lista[0].nombre}. Powered by NexCommit» en el pie de su sitio.`
      : `¿Enviar el correo de permiso en página web a los ${n} clientes que aún no responden? (máximo uno cada 7 días por cliente)`;
    if (!window.confirm(texto)) return;
    setAviso('');
    permisoWeb.mutate(lista.map((c) => c.id), {
      onSuccess: (r) => setAviso(`Correo permiso en página web: ${r.enviados} enviado${r.enviados === 1 ? '' : 's'}${r.omitidos ? `, ${r.omitidos} omitido${r.omitidos === 1 ? '' : 's'} (ya enviado en los últimos 7 días o tope diario)` : ''}.`),
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs text-[#9aafc3] max-w-2xl">
          Un cliente puede tener varios proyectos. Se asocian aquí o desde cada proyecto (pestaña Proyectos → editar).
          Los datos de contacto solo los ve el equipo.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnGhost}
            onClick={() => enviarInvitacion(porInvitar)}
            disabled={!porInvitar.length || invitar.isPending}
            title="Correo para que acepten las políticas (obligatorio) y las promociones (opcional)"
          >
            <Send className="w-4 h-4" /> Primer correo ({porInvitar.length})
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => enviarPermisoWeb(porPedirPermiso)}
            disabled={!porPedirPermiso.length || permisoWeb.isPending}
            title="Pide autorización (opcional) para agregar «Powered by NexCommit» al pie de su web. Solo a quienes aceptaron las políticas y aún no responden."
          >
            <Globe className="w-4 h-4" /> Correo permiso en página web ({porPedirPermiso.length})
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => setCampana(true)}
            disabled={!aceptan.length}
            title="Solo a quienes aceptaron recibir correos"
          >
            <Megaphone className="w-4 h-4" /> Mandar correo ({aceptan.length})
          </button>
          <button type="button" className={btnPrimary} onClick={() => setEditando({})}>
            <Plus className="w-4 h-4" /> Nuevo cliente
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#9aafc3] mb-4">
        <span><b className="text-white">{aceptan.length}</b> aceptan correos</span>
        <span><b className="text-white">{activos.filter((c) => consentimiento(c).id === 'politicas').length}</b> solo aceptaron políticas</span>
        <span><b className="text-white">{porInvitar.length}</b> sin aceptar</span>
        <span><b className="text-white">{activos.filter((c) => consentimiento(c).id === 'sin_correo').length}</b> sin correo</span>
        <span><b className="text-white">{activos.filter((c) => c.permiso_web === 'si').length}</b> autorizaron «Powered by» en su web</span>
      </div>
      {aviso && <p className="text-sm text-emerald-300 mb-4">{aviso}</p>}
      <ErrorBox error={invitar.error || permisoWeb.error} />

      {!clientes.length && <p className="text-sm text-[#9aafc3]">Todavía no hay clientes.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {clientes.map((c) => {
          const suyos = proyectosDe(c.id);
          const ids = new Set(suyos.map((p) => p.id));
          const deCliente = tareas.filter((t) => ids.has(t.proyecto_id));
          const abiertas = deCliente.filter(estaAbierta).length;
          const vencidas = deCliente.filter(estaVencida).length;
          return (
            <div key={c.id} className={`${card} p-4 flex flex-col gap-3 ${c.activo ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-white font-semibold">{c.nombre}</span>
                  </div>
                  {c.empresa && <p className="text-xs text-[#9aafc3] mt-0.5">{c.empresa}</p>}
                </div>
                <button type="button" onClick={() => setEditando(c)} className="text-[#9aafc3] hover:text-white" aria-label={`Editar ${c.nombre}`}>
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              {(c.email || c.telefono) && (
                <div className="flex flex-wrap gap-3 text-xs text-[#9aafc3]">
                  {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-white"><Mail className="w-3.5 h-3.5" />{c.email}</a>}
                  {c.telefono && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{c.telefono}</span>}
                </div>
              )}
              <ConsentimientoFila
                cliente={c}
                ultimo={ultimoCorreo(c.id)}
                onInvitar={() => enviarInvitacion([c])}
                onPermisoWeb={() => enviarPermisoWeb([c])}
                ocupado={invitar.isPending || permisoWeb.isPending}
              />
              <div className="flex flex-wrap gap-1.5">
                {suyos.length
                  ? suyos.map((p) => (
                      <button key={p.id} type="button" onClick={() => onVerProyecto(p.id)}>
                        <Pill color={p.color}>{p.nombre}</Pill>
                      </button>
                    ))
                  : <span className="text-xs text-[#9aafc3]">Sin proyectos asociados</span>}
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-white">{abiertas} <span className="text-[#9aafc3]">tareas abiertas</span></span>
                {vencidas > 0 && <span className="text-red-300">{vencidas} vencidas</span>}
              </div>
            </div>
          );
        })}
      </div>

      {editando && (
        <ClienteForm
          cliente={editando}
          proyectos={proyectos.filter((p) => p.tipo !== 'area')}
          vinculados={editando.id ? proyectosDe(editando.id).map((p) => p.id) : []}
          onClose={() => setEditando(null)}
        />
      )}
      {campana && <CampanaModal destinatarios={aceptan} onClose={() => setCampana(false)} />}
    </div>
  );
}

function ConsentimientoFila({ cliente: c, ultimo, onInvitar, onPermisoWeb, ocupado }) {
  const estado = consentimiento(c);
  const origen = c.consentimiento_origen === 'web' ? 'por la web' : c.consentimiento_origen === 'correo' ? 'por correo' : '';
  const titulo = c.acepta_politicas_at
    ? `Aceptó políticas ${origen} el ${formatearFecha(c.acepta_politicas_at)}${c.acepta_marketing ? ' y acepta promociones' : ''}`
    : c.invitacion_enviada_at ? `Primer correo enviado el ${formatearFecha(c.invitacion_enviada_at)}` : 'Aún no se le envía el primer correo';
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[#9aafc3]">
      <Pill color={estado.color} title={titulo}>{estado.label}</Pill>
      {estado.id === 'pendiente' && c.activo && (
        <button type="button" onClick={onInvitar} disabled={ocupado} className="flex items-center gap-1 hover:text-white disabled:opacity-50">
          <Send className="w-3.5 h-3.5" /> {c.invitacion_enviada_at ? 'Reenviar primer correo' : 'Enviar primer correo'}
        </button>
      )}
      {c.permiso_web && (
        <Pill color={PERMISO_WEB[c.permiso_web].color} title={`Anotado el ${formatearFecha(c.permiso_web_at)}`}>
          {PERMISO_WEB[c.permiso_web].label}
        </Pill>
      )}
      {!c.permiso_web && puedePedirPermisoWeb(c) && c.activo && (
        <button
          type="button"
          onClick={onPermisoWeb}
          disabled={ocupado}
          className="flex items-center gap-1 hover:text-white disabled:opacity-50"
          title={c.permiso_web_enviado_at ? `Enviado el ${formatearFecha(c.permiso_web_enviado_at)}; esperando su respuesta` : 'Pedir permiso para «Powered by NexCommit» en su web'}
        >
          <Globe className="w-3.5 h-3.5" /> {c.permiso_web_enviado_at ? 'Reenviar permiso web' : 'Pedir permiso web'}
        </button>
      )}
      {ultimo && (
        <span className={ultimo.estado === 'error' ? 'text-red-300' : ''} title={ultimo.detalle || ''}>
          {TIPO_CORREO[ultimo.tipo] ?? 'Último correo'} {ESTADO_CORREO[ultimo.estado]} · {formatearFecha(ultimo.created_at)}
        </span>
      )}
    </div>
  );
}

function CampanaModal({ destinatarios, onClose }) {
  const enviar = useEnviarCampana();
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [elegidos, setElegidos] = useState(() => new Set(destinatarios.map((c) => c.id)));
  const [resultado, setResultado] = useState(null);
  const alternar = (id) => setElegidos((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const todos = elegidos.size === destinatarios.length;

  const onSubmit = (e) => {
    e.preventDefault();
    if (!window.confirm(`¿Enviar «${asunto.trim()}» a ${elegidos.size} cliente${elegidos.size === 1 ? '' : 's'}?`)) return;
    enviar.mutate(
      { asunto: asunto.trim(), cuerpo: cuerpo.trim(), ids: todos ? null : [...elegidos] },
      { onSuccess: setResultado },
    );
  };

  return (
    <Modal titulo="Mandar correo a clientes" onClose={onClose} ancho="max-w-2xl">
      {resultado ? (
        <div className="space-y-4">
          <p className="text-sm text-emerald-300">
            Listo: {resultado.enviados} correo{resultado.enviados === 1 ? '' : 's'} en camino. El estado de cada uno aparece en su ficha.
          </p>
          <div className="flex justify-end"><button type="button" className={btnPrimary} onClick={onClose}>Cerrar</button></div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-xs text-[#9aafc3]">
            Solo aparecen los clientes que aceptaron recibir correos. Cada correo sale con un saludo con su nombre y un
            enlace para darse de baja.
          </p>
          <div>
            <label className={labelClass} htmlFor="cm-asunto">Asunto</label>
            <input id="cm-asunto" className={inputClass} value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={150} required autoFocus />
          </div>
          <div>
            <label className={labelClass} htmlFor="cm-cuerpo">Mensaje</label>
            <textarea
              id="cm-cuerpo"
              className={`${inputClass} min-h-[180px]`}
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              maxLength={8000}
              required
              placeholder={'Texto simple. Deja una línea en blanco entre párrafos; los enlaces (https://…) quedan clicables.\nEl «Hola <nombre>:» y la firma se agregan solos.'}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={labelClass}>Destinatarios ({elegidos.size} de {destinatarios.length})</span>
              <button
                type="button"
                className="text-xs text-[#9aafc3] hover:text-white"
                onClick={() => setElegidos(todos ? new Set() : new Set(destinatarios.map((c) => c.id)))}
              >
                {todos ? 'Quitar todos' : 'Elegir todos'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {destinatarios.map((c) => {
                const activo = elegidos.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => alternar(c.id)}
                    title={c.email}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      activo ? 'border-[#34d399] text-white bg-[#34d399]/15' : 'border-white/10 text-[#9aafc3] hover:text-white'
                    }`}
                    aria-pressed={activo}
                  >
                    {c.nombre}
                  </button>
                );
              })}
            </div>
          </div>
          <ErrorBox error={enviar.error} />
          <div className="flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
            <button className={btnPrimary} disabled={enviar.isPending || !elegidos.size}>
              <Megaphone className="w-4 h-4" /> {enviar.isPending ? 'Enviando…' : `Enviar a ${elegidos.size}`}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ClienteForm({ cliente, proyectos, vinculados, onClose }) {
  const guardar = useGuardarCliente();
  const vincular = useVincularClientes();
  const borrar = useBorrarCliente();
  const [f, setF] = useState({
    nombre: cliente.nombre || '',
    empresa: cliente.empresa || '',
    email: cliente.email || '',
    telefono: cliente.telefono || '',
    notas: cliente.notas || '',
    color: cliente.color || '#e0a64b',
    activo: cliente.activo ?? true,
    permiso_web: cliente.permiso_web || '',
  });
  const [retirar, setRetirar] = useState(false);
  const [seleccion, setSeleccion] = useState(new Set(vinculados));
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const alternar = (id) => setSeleccion((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    const guardado = await guardar.mutateAsync({
      id: cliente.id,
      nombre: f.nombre.trim(),
      empresa: f.empresa.trim() || null,
      email: f.email.trim() || null,
      telefono: f.telefono.trim() || null,
      notas: f.notas.trim() || null,
      color: f.color,
      activo: f.activo,
      // The panel can only withdraw promotions; granting them is the client's call.
      ...(retirar ? { acepta_marketing: false } : {}),
      // Only sent when it changed: the database stamps the date and logs it as proof.
      ...(cliente.id && f.permiso_web !== (cliente.permiso_web || '') ? { permiso_web: f.permiso_web || null } : {}),
    });
    const antes = new Set(vinculados);
    await vincular.mutateAsync({
      agregar: [...seleccion].filter((id) => !antes.has(id)).map((proyecto_id) => ({ proyecto_id, cliente_id: guardado.id })),
      quitar: [...antes].filter((id) => !seleccion.has(id)).map((proyecto_id) => ({ proyecto_id, cliente_id: guardado.id })),
    });
    onClose();
  };

  const onBorrar = () => {
    if (!window.confirm(`¿Borrar a ${cliente.nombre}? Se quita de sus proyectos; las tareas no se tocan.`)) return;
    borrar.mutate(cliente.id, { onSuccess: onClose });
  };

  const ocupado = guardar.isPending || vincular.isPending;

  return (
    <Modal titulo={cliente.id ? `Editar ${cliente.nombre}` : 'Nuevo cliente'} onClose={onClose} ancho="max-w-lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className={labelClass} htmlFor="c-nombre">Nombre</label>
            <input id="c-nombre" className={inputClass} value={f.nombre} onChange={set('nombre')} required autoFocus />
          </div>
          <div>
            <label className={labelClass} htmlFor="c-color">Color</label>
            <input id="c-color" type="color" className="h-[38px] w-14 rounded-lg bg-transparent border border-white/10" value={f.color} onChange={set('color')} />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="c-empresa">Empresa</label>
          <input id="c-empresa" className={inputClass} value={f.empresa} onChange={set('empresa')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="c-email">Correo</label>
            <input id="c-email" type="email" className={inputClass} value={f.email} onChange={set('email')} />
          </div>
          <div>
            <label className={labelClass} htmlFor="c-tel">Teléfono</label>
            <input id="c-tel" className={inputClass} value={f.telefono} onChange={set('telefono')} inputMode="tel" />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="c-notas">Notas</label>
          <textarea id="c-notas" className={`${inputClass} min-h-[70px]`} value={f.notas} onChange={set('notas')} />
        </div>
        <div>
          <span className={labelClass}>Proyectos de este cliente</span>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {proyectos.map((p) => {
              const activo = seleccion.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => alternar(p.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    activo ? 'border-[#e0a64b] text-white bg-[#e0a64b]/15' : 'border-white/10 text-[#9aafc3] hover:text-white'
                  }`}
                  aria-pressed={activo}
                >
                  {p.nombre}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-[#9aafc3]">
          <input type="checkbox" checked={f.activo} onChange={set('activo')} /> Cliente activo
        </label>
        {cliente.id && (
          <div className="rounded-lg border border-white/10 p-3 text-xs text-[#9aafc3] space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">Correos</span>
              <Pill color={consentimiento(cliente).color}>{consentimiento(cliente).label}</Pill>
            </div>
            {cliente.acepta_politicas_at ? (
              <p>
                Aceptó términos y política de privacidad {cliente.consentimiento_origen === 'web' ? 'en la web' : 'desde su enlace'} el{' '}
                {formatearFecha(cliente.acepta_politicas_at)}.{' '}
                {cliente.acepta_marketing ? 'Acepta novedades y promociones.' : 'No acepta promociones.'}
              </p>
            ) : (
              <p>Todavía no acepta. Solo el cliente puede hacerlo, con el «Primer correo» o entrando por la web.</p>
            )}
            {cliente.acepta_marketing && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={retirar} onChange={(e) => setRetirar(e.target.checked)} />
                Retirar las promociones (el cliente lo pidió). No se puede deshacer desde el panel.
              </label>
            )}
          </div>
        )}
        {cliente.id && (
          <div className="rounded-lg border border-white/10 p-3 text-xs text-[#9aafc3] space-y-2">
            <span className="text-white font-medium">Permiso en página web</span>
            <p>
              {cliente.permiso_web_enviado_at
                ? `Correo de permiso enviado el ${formatearFecha(cliente.permiso_web_enviado_at)}.`
                : 'Aún no se le envía el correo de permiso.'}{' '}
              Anota aquí lo que respondió: solo con un «sí» se agrega «Powered by NexCommit» a su web.
            </p>
            <select className={inputClass} value={f.permiso_web} onChange={set('permiso_web')} aria-label="Respuesta al permiso en página web">
              <option value="">Sin respuesta</option>
              <option value="si">Autorizó (respondió «Sí, autorizo»)</option>
              <option value="no">No autorizó</option>
            </select>
            {cliente.permiso_web_at && <p>Anotado el {formatearFecha(cliente.permiso_web_at)}.</p>}
          </div>
        )}
        <ErrorBox error={guardar.error || vincular.error || borrar.error} />
        <div className="flex flex-wrap justify-between gap-2">
          {cliente.id ? (
            <button type="button" onClick={onBorrar} className={`${btnGhost} text-red-300 hover:text-red-200`} disabled={borrar.isPending}>
              <Trash2 className="w-4 h-4" /> Borrar
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
            <button className={btnPrimary} disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
