// "Mis datos" in the client portal: the six rights of Ley 21.719 working in the software,
// not only in the policy text. Access/portability/rectification are self-service; deletion,
// opposition and blocking create a request the owners must answer within 30 calendar days.
import React, { useState } from 'react';
import { Download, FileJson, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { DERECHOS, fechaCorta, mensajeError } from '../../hooks/tareasCliente';

const campo = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#248bde]';
const btn = 'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50';

function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csv = (filas) =>
  filas.map((f) => f.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');

const SOLICITABLES = {
  supresion: { titulo: 'Borrar mis datos', texto: 'Eliminamos tu nombre, correo y teléfono y cerramos tu acceso. Lo que debamos guardar por ley (por ejemplo, facturas) se conserva solo el plazo legal.' },
  oposicion: { titulo: 'Oponerme a un uso de mis datos', texto: 'Cuéntanos a qué uso te opones. Los avisos de tus tareas son parte del servicio que contrataste, pero lo revisamos contigo.' },
  bloqueo: { titulo: 'Bloquear mis datos', texto: 'Mientras se resuelve una duda o reclamo, dejamos de usar tus datos (por ejemplo, no te enviamos correos).' },
};

export default function PortalMisDatos({ datos }) {
  const qc = useQueryClient();
  const c = datos.contacto;
  const [f, setF] = useState({ nombre: c.nombre, telefono: c.telefono ?? '', cargo: c.cargo ?? '' });
  const [msg, setMsg] = useState({ tipo: '', texto: '' });
  const [ocupado, setOcupado] = useState('');
  const [pedir, setPedir] = useState(null);
  const [detalle, setDetalle] = useState('');
  const [clave, setClave] = useState('');

  const correr = async (clave_, fn, ok) => {
    setMsg({ tipo: '', texto: '' });
    setOcupado(clave_);
    try {
      await fn();
      if (ok) setMsg({ tipo: 'ok', texto: ok });
      qc.invalidateQueries({ queryKey: ['portal'] });
    } catch (err) {
      setMsg({ tipo: 'error', texto: mensajeError(err) });
    } finally {
      setOcupado('');
    }
  };
  const rpc = async (nombre, args) => {
    const { data, error } = await supabase.rpc(nombre, args);
    if (error) throw error;
    return data;
  };
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="font-bold text-slate-900 mb-1">Tus datos</h3>
        <p className="text-sm text-slate-500 mb-4">Corrígelos cuando quieras. Tu correo es tu usuario: si cambió, escríbenos y lo actualizamos.</p>
        <form className="grid sm:grid-cols-2 gap-3" onSubmit={(e) => {
          e.preventDefault();
          correr('rect', () => rpc('portal_rectificar', { p_nombre: f.nombre, p_telefono: f.telefono, p_cargo: f.cargo }), 'Listo, guardamos tus datos ✅');
        }}>
          <label className="text-sm text-slate-600">Nombre<input className={campo} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} maxLength={120} required /></label>
          <label className="text-sm text-slate-600">Correo<input className={`${campo} bg-slate-50 text-slate-500`} value={c.email} disabled /></label>
          <label className="text-sm text-slate-600">Teléfono<input className={campo} value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} maxLength={30} /></label>
          <label className="text-sm text-slate-600">Cargo<input className={campo} value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} maxLength={80} /></label>
          <div className="sm:col-span-2">
            <button type="submit" className={`${btn} bg-[#248bde] text-white hover:bg-[#1d7cc9]`} disabled={ocupado === 'rect'}>
              {ocupado === 'rect' && <Loader2 className="w-4 h-4 animate-spin" />} Guardar cambios
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="font-bold text-slate-900 mb-1">Llévate una copia</h3>
        <p className="text-sm text-slate-500 mb-4">Todo lo que tenemos de ti y de tus tareas: datos, entregables, notas, historial, para qué los usamos y con quién se comparten.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`${btn} bg-slate-900 text-white hover:bg-slate-700`} disabled={Boolean(ocupado)}
            onClick={() => correr('json', async () => {
              const d = await rpc('portal_mis_datos', { p_tipo: 'portabilidad' });
              descargar(`mis-datos-nexcommit-${hoy}.json`, JSON.stringify(d, null, 2), 'application/json');
            })}>
            {ocupado === 'json' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />} Descargar todo (JSON)
          </button>
          <button type="button" className={`${btn} bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50`} disabled={Boolean(ocupado)}
            onClick={() => correr('csv', async () => {
              const d = await rpc('portal_mis_datos', { p_tipo: 'acceso' });
              const filas = [['N°', 'Tarea', 'Responsable', 'Plazo', 'Estado', 'Entregables', 'Notas', 'Archivos']];
              for (const t of d.datos.tareas) {
                filas.push([t.numero, t.titulo, t.responsable, t.fecha_cliente, t.cerrada_at ? 'cumplida' : t.cancelada_at ? 'cancelada' : t.estado_cliente,
                  t.entregables.map((x) => `${x.hecho ? '[x]' : '[ ]'} ${x.texto}`).join(' | '),
                  t.notas.map((n) => `${n.autor}: ${n.texto}`).join(' | '), t.archivos.map((a) => a.nombre).join(' | ')]);
              }
              // BOM so Excel opens the accents correctly.
              descargar(`mis-tareas-nexcommit-${hoy}.csv`, String.fromCharCode(0xfeff) + csv(filas), 'text/csv;charset=utf-8');
            })}>
            {ocupado === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Mis tareas (Excel / CSV)
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="font-bold text-slate-900 mb-1">Tus otros derechos</h3>
        <p className="text-sm text-slate-500 mb-4">Te respondemos en un máximo de 30 días corridos.</p>
        <div className="grid sm:grid-cols-3 gap-2">
          {Object.entries(SOLICITABLES).map(([tipo, s]) => (
            <button key={tipo} type="button" onClick={() => { setPedir(tipo); setDetalle(''); }}
              className={`rounded-xl p-3 text-left text-sm ring-1 transition-colors ${pedir === tipo ? 'ring-[#248bde] bg-sky-50' : 'ring-slate-200 hover:bg-slate-50'}`}>
              <b className="text-slate-800">{s.titulo}</b>
            </button>
          ))}
        </div>
        {pedir && (
          <form className="mt-4 space-y-3" onSubmit={(e) => {
            e.preventDefault();
            correr('derecho', async () => { await rpc('portal_derecho', { p_tipo: pedir, p_detalle: detalle }); setPedir(null); },
              'Recibimos tu solicitud. Te responderemos por correo dentro de 30 días.');
          }}>
            <p className="text-sm text-slate-600">{SOLICITABLES[pedir].texto}</p>
            <textarea className={`${campo} min-h-[80px]`} value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={2000} placeholder="Cuéntanos más (opcional)" />
            <button type="submit" className={`${btn} bg-[#248bde] text-white hover:bg-[#1d7cc9]`} disabled={ocupado === 'derecho'}>Enviar solicitud</button>
          </form>
        )}
        {datos.derechos.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {datos.derechos.map((d, i) => (
              <li key={i} className="py-2 flex flex-wrap gap-x-3 text-slate-600">
                <b className="text-slate-800">{DERECHOS[d.tipo]}</b>
                <span>{fechaCorta(d.created_at.slice(0, 10))}</span>
                <span className={d.estado === 'pendiente' ? 'text-amber-700' : 'text-emerald-700'}>
                  {d.estado === 'pendiente' ? `en curso · respuesta antes del ${fechaCorta(d.vence_el)}` : d.estado}
                </span>
                {d.respuesta && <span className="w-full text-slate-500">{d.respuesta}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><KeyRound className="w-4 h-4" /> Cambiar contraseña</h3>
        <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => {
          e.preventDefault();
          correr('clave', async () => {
            const { error } = await supabase.auth.updateUser({ password: clave });
            if (error) throw Object.assign(new Error('No se pudo cambiar. Usa al menos 8 caracteres.'), { amigable: true });
            setClave('');
          }, 'Contraseña cambiada 🔐');
        }}>
          <input type="password" className={campo} value={clave} onChange={(e) => setClave(e.target.value)} minLength={8} placeholder="Nueva contraseña (mín. 8)" autoComplete="new-password" required />
          <button type="submit" className={`${btn} bg-slate-900 text-white hover:bg-slate-700 shrink-0`} disabled={ocupado === 'clave'}>Cambiar</button>
        </form>
      </section>

      {msg.texto && (
        <div role="status" className={`rounded-xl px-4 py-3 text-sm ring-1 ${msg.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800 ring-emerald-100' : 'bg-rose-50 text-rose-700 ring-rose-100'}`}>
          {msg.texto}
        </div>
      )}

      <section className="rounded-2xl bg-slate-100 p-5 text-sm text-slate-600 space-y-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Cómo cuidamos tus datos</h3>
        <p><b>Para qué:</b> coordinar las tareas y entregas de tu proyecto con NexCommit. <b>Base legal:</b> el contrato de servicios con tu empresa (Ley 21.719).</p>
        <p><b>Dónde están:</b> Supabase (base de datos y archivos), Google Gmail (correos) y Vercel (sitio), con servidores en Estados Unidos. No vendemos ni compartimos tus datos con fines comerciales.</p>
        <p><b>Cuánto tiempo:</b> los archivos se borran 180 días después de cerrar cada tarea; las tareas y notas, 24 meses después; tu ficha se anonimiza 12 meses después de terminar la relación.</p>
        <p>Si no quedas conforme con nuestra respuesta, puedes reclamar ante la <b>Agencia de Protección de Datos Personales</b>. Más detalle en la <Link to="/privacy" className="text-[#248bde] underline">política de privacidad</Link> o en nexcommit@gmail.com.</p>
      </section>
    </div>
  );
}
