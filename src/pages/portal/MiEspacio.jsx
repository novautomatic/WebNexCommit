// Client portal /mi-espacio. Ways in:
//   ?e=<token>      link from any email: valid 1 day, opens the whole portal (Edge Function
//                   portal-clientes → token_hash → supabase.auth.verifyOtp = real session)
//   ?clave=<token>  welcome email: shows the initial password ONCE (RPC portal_ver_clave)
//   email + password
// &t=<tarea_id> opens that task. Tokens are removed from the URL as soon as they are read
// (they must not stay in history nor reach analytics).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, FileText, History, Inbox, Loader2, LogOut, Mail, Lock, Send, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import SEO from '../../components/SEO';
import { BrandLogo } from '../../components/Brand';
import { useAuth } from '../../components/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { funcionPortal, mensajeError } from '../../hooks/tareasCliente';
import { useAccionesPortal, usePortalArchivos } from '../../hooks/archivosCliente';
import ExploradorArchivos from '../../components/ExploradorArchivos';
import PortalTarea from './PortalTarea';
import PortalMisDatos from './PortalMisDatos';

const campo = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#248bde]';
const btnAzul = 'inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#248bde] px-5 py-3 font-bold text-white hover:bg-[#1d7cc9] disabled:opacity-60';

function Marco({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf4fd] to-[#f6f8fb] text-slate-800">
      <SEO title="Mi espacio | NexCommit" description="Tu espacio de cliente en NexCommit." canonicalUrl="https://www.nexcommit.com/mi-espacio" noIndex />
      {children}
    </div>
  );
}

function Tarjeta({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl ring-1 ring-slate-200">
        <div className="mb-6 rounded-2xl bg-[#071b31] px-4 py-3 inline-flex"><BrandLogo /></div>
        {children}
      </div>
    </div>
  );
}

function VerClave({ token, onListo }) {
  const [estado, setEstado] = useState({ cargando: true });
  const [copiada, setCopiada] = useState(false);
  const pedido = useRef(false);
  useEffect(() => {
    if (pedido.current) return; // single-use: never ask twice (StrictMode runs effects twice)
    pedido.current = true;
    supabase.rpc('portal_ver_clave', { p_token: token }).then(({ data, error }) =>
      setEstado(error ? { error: mensajeError(error, 'No pudimos mostrar tu contraseña. Escríbenos y te mandamos una nueva.') } : { ...data }));
  }, [token]);

  if (estado.cargando) return <Tarjeta><p className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Buscando tu contraseña…</p></Tarjeta>;
  if (estado.error) return (
    <Tarjeta>
      <h1 className="text-xl font-bold mb-2">Este enlace ya no sirve 😕</h1>
      <p className="text-slate-600 mb-5">{estado.error}</p>
      <button type="button" className={btnAzul} onClick={() => onListo('')}>Ir a iniciar sesión</button>
    </Tarjeta>
  );
  return (
    <Tarjeta>
      <h1 className="text-2xl font-bold mb-1">¡Bienvenida/o! 🎉</h1>
      <p className="text-slate-600 mb-5">Esta es tu contraseña. <b>Guárdala ahora</b>: por seguridad no la volveremos a mostrar.</p>
      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 mb-5">
        <div className="text-xs text-slate-500">Usuario</div>
        <div className="font-semibold mb-3 break-all">{estado.usuario}</div>
        <div className="text-xs text-slate-500">Contraseña</div>
        <div className="flex items-center gap-2">
          <code className="text-2xl font-bold tracking-wide text-[#071b31]">{estado.clave}</code>
          <button type="button" className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-[#248bde] ring-1 ring-sky-200 hover:bg-sky-50"
            onClick={() => navigator.clipboard?.writeText(estado.clave).then(() => setCopiada(true))}>
            <Copy className="w-3.5 h-3.5" /> {copiada ? 'Copiada' : 'Copiar'}
          </button>
        </div>
      </div>
      <button type="button" className={btnAzul} onClick={() => onListo(estado.usuario)}>Ya la guardé, entrar</button>
      <p className="mt-3 text-xs text-slate-500 text-center">Puedes cambiarla cuando quieras en «Mis datos».</p>
    </Tarjeta>
  );
}

function Login({ emailInicial, aviso }) {
  const [email, setEmail] = useState(emailInicial || '');
  const [clave, setClave] = useState('');
  const [modo, setModo] = useState('login');
  const [msg, setMsg] = useState(aviso || '');
  const [ok, setOk] = useState('');
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setMsg('');
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave });
    setEnviando(false);
    if (error) setMsg(error.status === 429 ? 'Demasiados intentos. Espera unos minutos.' : 'El correo o la contraseña no coinciden.');
  };
  const recuperar = async (e) => {
    e.preventDefault();
    setMsg('');
    setEnviando(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setEnviando(false);
    setOk('Si ese correo tiene acceso, te llegará un enlace para crear una contraseña nueva. Revisa también spam.');
  };

  return (
    <Tarjeta>
      <h1 className="text-2xl font-bold mb-1">{modo === 'login' ? 'Tu espacio NexCommit' : 'Recuperar contraseña'}</h1>
      <p className="text-slate-600 mb-6">{modo === 'login' ? 'Tus tareas, archivos y avances del proyecto en un solo lugar.' : 'Te mandamos un enlace para crear una nueva.'}</p>
      <form onSubmit={modo === 'login' ? entrar : recuperar} className="space-y-3">
        <label className="block text-sm text-slate-600">Correo
          <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="email" className={`${campo} pl-9`} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></div>
        </label>
        {modo === 'login' && (
          <label className="block text-sm text-slate-600">Contraseña
            <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="password" className={`${campo} pl-9`} value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" required /></div>
          </label>
        )}
        {msg && <p role="alert" className="text-sm text-rose-600">{msg}</p>}
        {ok && <p className="text-sm text-emerald-700">{ok}</p>}
        <button type="submit" className={btnAzul} disabled={enviando}>
          {enviando && <Loader2 className="w-4 h-4 animate-spin" />} {modo === 'login' ? 'Entrar' : 'Enviar enlace'}
        </button>
      </form>
      <button type="button" className="mt-4 w-full text-sm text-slate-500 hover:text-[#248bde]" onClick={() => { setModo(modo === 'login' ? 'recuperar' : 'login'); setMsg(''); setOk(''); }}>
        {modo === 'login' ? '¿Olvidaste tu contraseña?' : 'Volver'}
      </button>
    </Tarjeta>
  );
}

function PedirAlgo({ solicitudes }) {
  const [titulo, setTitulo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [msg, setMsg] = useState({ tipo: '', texto: '' });
  const [enviando, setEnviando] = useState(false);
  const qc = useQueryClient();
  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    const { error } = await supabase.rpc('portal_solicitud', { p_titulo: titulo, p_detalle: detalle });
    setEnviando(false);
    if (error) return setMsg({ tipo: 'error', texto: mensajeError(error, 'Revisa que el título y el detalle tengan al menos 3 letras.') });
    setTitulo('');
    setDetalle('');
    setMsg({ tipo: 'ok', texto: '¡Recibido! Lo revisamos y te avisamos 🙌' });
    qc.invalidateQueries({ queryKey: ['portal'] });
  };
  const ESTADOS = { nueva: ['En revisión', 'text-amber-700'], aceptada: ['Aceptada · ya es una tarea', 'text-emerald-700'], rechazada: ['No corresponde', 'text-slate-500'] };
  return (
    <div className="space-y-5">
      <form onSubmit={enviar} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 space-y-3">
        <h3 className="font-bold text-slate-900">¿Necesitas algo de nosotros?</h3>
        <p className="text-sm text-slate-500">Un cambio en tu web, una idea, una duda… cuéntanos y el equipo lo revisa.</p>
        <input className={campo} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={160} placeholder="¿Qué necesitas? (ej: Cambiar el banner de Navidad)" required />
        <textarea className={`${campo} min-h-[110px]`} value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={4000} placeholder="Cuéntanos los detalles" required />
        {msg.texto && <p className={`text-sm ${msg.tipo === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>{msg.texto}</p>}
        <button type="submit" className={`${btnAzul} sm:w-auto`} disabled={enviando}>{enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar</button>
      </form>
      {solicitudes.length > 0 && (
        <ul className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 divide-y divide-slate-100">
          {solicitudes.map((s) => (
            <li key={s.id} className="py-3 text-sm">
              <div className="flex flex-wrap gap-2"><b className="text-slate-800">{s.titulo}</b><span className={ESTADOS[s.estado][1]}>{ESTADOS[s.estado][0]}</span></div>
              {s.respuesta && <p className="text-slate-500 mt-1">{s.respuesta}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The client's document container: what NexCommit shares + its own folders and uploads.
function PortalDocumentos() {
  const { data, isLoading, error } = usePortalArchivos();
  const acciones = useAccionesPortal(data?.cliente_id);
  if (isLoading) return <p className="text-center text-sm text-slate-500 py-10">Cargando…</p>;
  if (error) return <p className="text-center text-sm text-red-600 py-10">{mensajeError(error, 'No pudimos cargar tus documentos. Intenta de nuevo en un rato.')}</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Tu carpeta para compartir archivos con NexCommit: crea carpetas, sube fotos, logos o documentos y ordénalos como quieras.
        Solo los ve tu equipo y NexCommit. Lo que te compartimos nosotros aparece marcado «de NexCommit».
      </p>
      <ExploradorArchivos tema="claro" modo="cliente" carpetas={data.carpetas} documentos={data.documentos}
        acciones={acciones} usado={data.usado} cupo={data.cupo} />
    </div>
  );
}

const PESTANAS = [
  { id: 'tareas', label: 'Mis tareas', icon: Inbox },
  { id: 'historial', label: 'Historial', icon: History },
  { id: 'documentos', label: 'Documentos', icon: FileText },
  { id: 'pedir', label: 'Pedir algo', icon: Sparkles },
  { id: 'datos', label: 'Mis datos', icon: UserRound },
];

function Portal({ tareaInicial }) {
  const qc = useQueryClient();
  const [pestana, setPestana] = useState('tareas');
  const { data, error, isLoading } = useQuery({
    queryKey: ['portal', 'datos'],
    queryFn: async () => {
      const { data: d, error: e } = await supabase.rpc('portal_datos');
      if (e) throw e;
      return d;
    },
    refetchOnWindowFocus: true,
    retry: false,
  });
  const [esEquipo, setEsEquipo] = useState(false);
  useEffect(() => {
    if (error) supabase.rpc('es_equipo').then(({ data: ok }) => setEsEquipo(Boolean(ok)));
  }, [error]);

  const salir = () => supabase.auth.signOut();
  const abiertas = useMemo(() => (data?.tareas ?? []).filter((t) => !t.cerrada_at && !t.cancelada_at), [data]);
  const cerradas = useMemo(() => (data?.tareas ?? []).filter((t) => t.cerrada_at || t.cancelada_at), [data]);
  const porHacer = abiertas.filter((t) => t.es_mia && ['pendiente', 'devuelta'].includes(t.estado_cliente)).length;

  useEffect(() => {
    if (tareaInicial && data) document.getElementById(`tarea-${tareaInicial}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [tareaInicial, data]);

  if (isLoading) return <Tarjeta><p className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Cargando tu espacio…</p></Tarjeta>;
  if (error) return (
    <Tarjeta>
      <h1 className="text-xl font-bold mb-2">{esEquipo ? 'Esta cuenta es del equipo' : 'No encontramos tu espacio'}</h1>
      <p className="text-slate-600 mb-5">{esEquipo ? 'Las tareas de clientes se ven desde el panel.' : mensajeError(error, 'Intenta de nuevo en un rato.')}</p>
      {esEquipo ? <Link to="/admin?tab=clientes-tareas" className={btnAzul}>Ir al panel</Link>
        : <button type="button" className={btnAzul} onClick={salir}>Salir</button>}
    </Tarjeta>
  );

  const nombre = data.contacto.nombre.split(' ')[0];
  return (
    <>
      <header className="bg-[#071b31] text-white">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <BrandLogo />
          <button type="button" onClick={salir} className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-7 pt-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Hola, {nombre} 👋</h1>
          <p className="text-slate-300 mt-1">
            {porHacer === 0 ? '¡Estás al día! No tienes nada pendiente por ahora ✨'
              : porHacer === 1 ? 'Tienes 1 tarea esperando por ti.' : `Tienes ${porHacer} tareas esperando por ti.`}
            {data.cliente?.empresa ? ` · ${data.cliente.empresa}` : ''}
          </p>
        </div>
      </header>

      <nav className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200" aria-label="Secciones">
        <div className="mx-auto max-w-3xl px-2 flex overflow-x-auto">
          {PESTANAS.map((p) => {
            const Icon = p.icon;
            return (
              <button key={p.id} type="button" onClick={() => setPestana(p.id)} aria-current={pestana === p.id ? 'page' : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-3 text-sm font-semibold border-b-2 ${pestana === p.id ? 'border-[#248bde] text-[#248bde]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                <Icon className="w-4 h-4" /> {p.label}
                {p.id === 'tareas' && porHacer > 0 && <span className="rounded-full bg-[#248bde] px-1.5 text-[11px] text-white">{porHacer}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {!data.contacto.aviso_privacidad_at && (
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-200 text-sm text-slate-600 flex gap-3">
            <ShieldCheck className="w-5 h-5 text-[#248bde] shrink-0 mt-0.5" />
            <div>
              Usamos tu nombre, correo y lo que subas aquí <b>solo para coordinar tu proyecto</b> con NexCommit. Puedes ver, descargar o
              borrar tus datos en «Mis datos».{' '}
              <button type="button" className="font-semibold text-[#248bde] hover:underline" onClick={async () => { await supabase.rpc('portal_aviso_visto'); qc.invalidateQueries({ queryKey: ['portal'] }); }}>
                Entendido
              </button>
            </div>
          </div>
        )}

        {pestana === 'tareas' && (abiertas.length ? abiertas.map((t) => (
          <PortalTarea key={t.id} t={t} abiertaInicial={t.id === tareaInicial || (abiertas.length === 1)} />
        )) : (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <div className="text-4xl mb-2">🌤️</div>
            <p className="font-semibold text-slate-800">No tienes tareas abiertas</p>
            <p className="text-sm text-slate-500">Cuando necesitemos algo de ti, te llegará un correo y aparecerá aquí.</p>
          </div>
        ))}
        {pestana === 'historial' && (cerradas.length ? cerradas.map((t) => <PortalTarea key={t.id} t={t} />) : (
          <p className="text-center text-sm text-slate-500 py-10">Aquí verás tus tareas cumplidas.</p>
        ))}
        {pestana === 'documentos' && <PortalDocumentos />}
        {pestana === 'pedir' && <PedirAlgo solicitudes={data.solicitudes} />}
        {pestana === 'datos' && <PortalMisDatos datos={data} />}
      </main>
      <footer className="mx-auto max-w-3xl px-4 pb-10 text-center text-xs text-slate-400">
        NexCommit · <a href="mailto:nexcommit@gmail.com" className="hover:text-slate-600">nexcommit@gmail.com</a> · <Link to="/privacy" className="hover:text-slate-600">Privacidad</Link>
      </footer>
    </>
  );
}

export default function MiEspacio() {
  const { user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  // Read the one-time tokens once, then drop them from the address bar.
  const [inicio] = useState(() => ({ e: params.get('e'), clave: params.get('clave'), t: params.get('t') }));
  const [canjeando, setCanjeando] = useState(Boolean(inicio.e));
  const [aviso, setAviso] = useState('');
  const [verClave, setVerClave] = useState(Boolean(inicio.clave));
  const [emailLogin, setEmailLogin] = useState('');

  useEffect(() => {
    if (inicio.e || inicio.clave) setParams(inicio.t ? { t: inicio.t } : {}, { replace: true });
  }, [inicio, setParams]);

  const canjeado = useRef(false);
  useEffect(() => {
    if (!inicio.e || canjeado.current) return;
    canjeado.current = true;
    (async () => {
      try {
        const { token_hash: tokenHash } = await funcionPortal({ accion: 'entrar', token: inicio.e });
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
        if (error) throw Object.assign(new Error('No pudimos abrir tu sesión con este enlace. Entra con tu correo y contraseña.'), { amigable: true });
      } catch (err) {
        setAviso(mensajeError(err));
      } finally {
        setCanjeando(false);
      }
    })();
  }, [inicio.e]);

  let contenido;
  if (verClave) contenido = <VerClave token={inicio.clave} onListo={(email) => { setEmailLogin(email); setVerClave(false); }} />;
  else if (loading || canjeando) contenido = <Tarjeta><p className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Abriendo tu espacio…</p></Tarjeta>;
  else if (!user) contenido = <Login emailInicial={emailLogin} aviso={aviso} />;
  else contenido = <Portal tareaInicial={inicio.t} />;

  return <Marco>{contenido}</Marco>;
}
