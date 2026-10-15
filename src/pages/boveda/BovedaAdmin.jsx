import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Eye, EyeOff, KeyRound, LifeBuoy, Lock, Mail, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, Unlock } from 'lucide-react';
import { useAuth } from '../../components/AuthContext';
import {
  useBovedaConfig,
  useBovedaEntradas,
  useBovedaEstado,
  useCambiarPasswordBoveda,
  useCerrarSesionBoveda,
  useCrearBoveda,
  useEliminarEntradaBoveda,
  useGuardarEntradaBoveda,
  usePedirCodigoBoveda,
  useRecuperarBoveda,
  useReiniciarBoveda,
  useVerificarCodigoBoveda,
} from '../../hooks/boveda';
import {
  MIN_PASSWORD,
  abrirBoveda,
  cambiarPassword,
  cifrarDatos,
  crearBoveda,
  descifrarDatos,
  envolverConNuevaPassword,
  generarClave,
} from '../../lib/boveda';
import { hostDe } from '../configuracion/utils';
import { ErrorBox, Modal, btnGhost, btnPrimary, card, inputClass, labelClass } from '../tareas/ui';

const BLOQUEO_MS = 5 * 60 * 1000; // lock after 5 minutes without activity
const LIMPIAR_PORTAPAPELES_MS = 30 * 1000;

// Turns "github.com" or "https://github.com/login" into a safe http(s) link, or null.
function enlaceDe(sitio) {
  const v = (sitio || '').trim();
  if (!v || /\s/.test(v)) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`);
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.') ? u.href : null;
  } catch {
    return null;
  }
}

export default function BovedaAdmin() {
  const { user } = useAuth();
  const { data: estado, isLoading, error } = useBovedaEstado();
  const verificada = Boolean(estado?.verificada);
  const { data: config, error: errorConfig } = useBovedaConfig(verificada);
  const cerrarSesion = useCerrarSesionBoveda();
  const [llave, setLlave] = useState(null);
  const [restaurando, setRestaurando] = useState(false);

  const bloquear = useCallback(() => setLlave(null), []);
  // Explicit lock also ends the email-code session, so the next entry asks for a new code.
  const salir = () => {
    setLlave(null);
    cerrarSesion.mutate();
  };

  // The email-code session (30 min) ended on the server: drop the key too.
  if (llave && estado && !estado.verificada) setLlave(null);

  // Auto-lock after inactivity. Leaving the section unmounts this and drops the key too.
  useEffect(() => {
    if (!llave) return undefined;
    let t = setTimeout(bloquear, BLOQUEO_MS);
    const reiniciar = () => {
      clearTimeout(t);
      t = setTimeout(bloquear, BLOQUEO_MS);
    };
    const eventos = ['pointerdown', 'keydown', 'scroll'];
    eventos.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));
    return () => {
      clearTimeout(t);
      eventos.forEach((e) => window.removeEventListener(e, reiniciar));
    };
  }, [llave, bloquear]);

  let contenido;
  if (isLoading) contenido = <p className="text-sm text-[#9aafc3]">Cargando…</p>;
  else if (error) contenido = <ErrorBox error={error} />;
  else if (!estado?.equipo) contenido = <p className="text-sm text-[#9aafc3]">La Bóveda es solo para el equipo de NexCommit.</p>;
  else if (!estado.existe) contenido = <CrearBoveda onListo={setLlave} />;
  else if (!estado.verificada) contenido = <PantallaCodigo email={user?.email} />;
  else if (errorConfig) contenido = <ErrorBox error={errorConfig} />;
  else if (!config) contenido = <p className="text-sm text-[#9aafc3]">Cargando…</p>;
  else if (!llave && restaurando) {
    contenido = (
      <Restaurar
        estado={estado}
        email={user?.email}
        onListo={(k) => {
          setRestaurando(false);
          setLlave(k);
        }}
        onVolver={() => setRestaurando(false)}
      />
    );
  } else if (!llave) contenido = <Desbloquear config={config} estado={estado} onListo={setLlave} onOlvide={() => setRestaurando(true)} />;
  else contenido = <Boveda config={config} estado={estado} llave={llave} onBloquear={salir} />;

  return <div className="max-w-5xl">{contenido}</div>;
}

function Encabezado({ children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 className="text-white font-medium flex items-center gap-2"><KeyRound className="w-4 h-4 text-[#67c8f3]" /> Bóveda de claves</h2>
        <p className="text-sm text-[#9aafc3] max-w-2xl">
          Webs, usuarios y claves en común del equipo, cifrados con una contraseña maestra compartida. Para entrar se pide un código que llega a tu correo y la contraseña maestra.
        </p>
      </div>
      {children}
    </div>
  );
}

// Master password field with a show/hide eye. `new-password` keeps the browser from autofilling
// the panel login password here, which would make a correct master password look wrong.
function CampoPassword({ id, value, onChange, autoFocus }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={ver ? 'text' : 'password'}
        autoComplete="new-password"
        className={`${inputClass} pr-10`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        required
      />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aafc3] hover:text-white"
        aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {ver ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// "Send me a code" state shared by the access and the restore screens (60 s between sends).
function useEnvioCodigo(proposito) {
  const pedir = usePedirCodigoBoveda();
  const [enviado, setEnviado] = useState(false);
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    if (segundos <= 0) return undefined;
    const t = setTimeout(() => setSegundos((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [segundos]);
  const enviar = () =>
    pedir.mutate(
      { p_proposito: proposito },
      {
        onSuccess: () => {
          setEnviado(true);
          setSegundos(60);
        },
      },
    );
  return { enviado, segundos, enviar, enviando: pedir.isPending, error: pedir.error };
}

function BotonEnviarCodigo({ envio }) {
  return (
    <button type="button" className={envio.enviado ? btnGhost : btnPrimary} onClick={envio.enviar} disabled={envio.enviando || envio.segundos > 0}>
      <Mail className="w-4 h-4" />
      {envio.enviando ? 'Enviando…' : envio.enviado ? (envio.segundos > 0 ? `Reenviar en ${envio.segundos} s` : 'Reenviar código') : 'Enviarme el código'}
    </button>
  );
}

const CampoCodigo = ({ value, onChange }) => (
  <input
    id="bv-codigo"
    className={`${inputClass} text-center text-xl tracking-[0.4em] font-mono`}
    value={value}
    onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
    inputMode="numeric"
    autoComplete="one-time-code"
    maxLength={6}
    placeholder="000000"
    required
  />
);

function CrearBoveda({ onListo }) {
  const crear = useCrearBoveda();
  const [pass, setPass] = useState('');
  const [repetir, setRepetir] = useState('');
  const [errorLocal, setErrorLocal] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (pass.length < MIN_PASSWORD) return setErrorLocal(new Error(`Usa al menos ${MIN_PASSWORD} caracteres.`));
    if (pass !== repetir) return setErrorLocal(new Error('Las contraseñas no coinciden.'));
    setErrorLocal(null);
    setTrabajando(true);
    try {
      const { config, llave, respaldo } = await crearBoveda(pass);
      await crear.mutateAsync({ p_sal: config.sal, p_iter: config.iteraciones, p_envuelta: config.clave_envuelta, p_dek: respaldo });
      onListo(llave);
    } catch (err) {
      setErrorLocal(err);
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <>
      <Encabezado />
      <form onSubmit={onSubmit} className={`${card} p-5 max-w-md space-y-4`}>
        <h3 className="text-white font-medium flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#67c8f3]" /> Crea la contraseña maestra del equipo</h3>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Es la contraseña de toda la bóveda: la usará todo el equipo, así que compártela solo con ellos y por un canal seguro. Si se olvida, un dueño puede
          restaurarla con un código que llega a su correo. Para eso se guarda una copia de la llave de la bóveda cifrada en el servidor.
        </div>
        <div>
          <label className={labelClass} htmlFor="bv-pass">Contraseña maestra</label>
          <CampoPassword id="bv-pass" value={pass} onChange={setPass} autoFocus />
        </div>
        <div>
          <label className={labelClass} htmlFor="bv-rep">Repítela</label>
          <CampoPassword id="bv-rep" value={repetir} onChange={setRepetir} />
        </div>
        <ErrorBox error={errorLocal || crear.error} />
        <button type="submit" className={btnPrimary} disabled={trabajando}>{trabajando ? 'Creando…' : 'Crear bóveda'}</button>
      </form>
    </>
  );
}

// Step 1 of 2: the email code (enforced by the database, not just this screen).
function PantallaCodigo({ email }) {
  const envio = useEnvioCodigo('acceso');
  const verificar = useVerificarCodigoBoveda();
  const [codigo, setCodigo] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    verificar.mutate({ p_codigo: codigo });
  };

  return (
    <>
      <Encabezado />
      <form onSubmit={onSubmit} className={`${card} p-5 max-w-md space-y-4`}>
        <h3 className="text-white font-medium flex items-center gap-2"><Mail className="w-4 h-4 text-[#67c8f3]" /> Paso 1: código por correo</h3>
        <p className="text-xs text-[#9aafc3]">Te enviamos un código de 6 dígitos a <b className="text-white">{email}</b>. Dura 10 minutos.</p>
        <BotonEnviarCodigo envio={envio} />
        <ErrorBox error={envio.error} />
        {envio.enviado && (
          <>
            <div>
              <label className={labelClass} htmlFor="bv-codigo">Código</label>
              <CampoCodigo value={codigo} onChange={setCodigo} />
            </div>
            <ErrorBox error={verificar.error} />
            {verificar.error?.restantes !== undefined && <p className="text-xs text-amber-200">Te quedan {verificar.error.restantes} intentos con este código.</p>}
            <button type="submit" className={btnPrimary} disabled={verificar.isPending || codigo.length !== 6}>
              {verificar.isPending ? 'Verificando…' : 'Verificar'}
            </button>
          </>
        )}
      </form>
    </>
  );
}

// Step 2 of 2: the master password.
function Desbloquear({ config, estado, onListo, onOlvide }) {
  const [pass, setPass] = useState('');
  const [error, setError] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setTrabajando(true);
    try {
      onListo(await abrirBoveda(pass, config));
    } catch (err) {
      setError(err);
      setTrabajando(false);
    }
  };

  return (
    <>
      <Encabezado />
      <form onSubmit={onSubmit} className={`${card} p-5 max-w-md space-y-4`}>
        <h3 className="text-white font-medium flex items-center gap-2"><Lock className="w-4 h-4 text-[#67c8f3]" /> Paso 2: contraseña maestra</h3>
        <p className="text-xs text-[#9aafc3]">Usa la contraseña maestra común del equipo. Si no la tienes, pídesela a quien creó la bóveda.</p>
        <div>
          <label className={labelClass} htmlFor="bv-pass">Contraseña maestra</label>
          <CampoPassword id="bv-pass" value={pass} onChange={setPass} autoFocus />
        </div>
        <ErrorBox error={error} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={btnPrimary} disabled={trabajando}>
            <Unlock className="w-4 h-4" /> {trabajando ? 'Abriendo…' : 'Desbloquear'}
          </button>
          {estado.admin ? (
            <button type="button" onClick={onOlvide} className="text-sm text-[#67c8f3] hover:underline">Olvidé mi contraseña maestra</button>
          ) : (
            <span className="text-xs text-[#9aafc3]">¿La olvidaste? Un dueño puede restaurarla.</span>
          )}
        </div>
      </form>
    </>
  );
}

// "I forgot the master password": restore by email code, or (old vaults without backup) start over.
function Restaurar({ estado, email, onListo, onVolver }) {
  return (
    <>
      <Encabezado />
      <div className={`${card} p-5 max-w-md space-y-4`}>
        <h3 className="text-white font-medium flex items-center gap-2"><LifeBuoy className="w-4 h-4 text-[#67c8f3]" /> Restaurar la contraseña maestra</h3>
        {estado.con_respaldo ? <RestaurarConCodigo email={email} onListo={onListo} /> : <ReiniciarSinRespaldo />}
        <button type="button" onClick={onVolver} className="text-sm text-[#9aafc3] hover:text-white">← Volver</button>
      </div>
    </>
  );
}

function RestaurarConCodigo({ email, onListo }) {
  const envio = useEnvioCodigo('recuperacion');
  const recuperar = useRecuperarBoveda();
  const cambiar = useCambiarPasswordBoveda();
  const [codigo, setCodigo] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (nueva.length < MIN_PASSWORD) return setError(new Error(`Usa al menos ${MIN_PASSWORD} caracteres.`));
    if (nueva !== repetir) return setError(new Error('Las contraseñas no coinciden.'));
    setError(null);
    setTrabajando(true);
    try {
      const { dek } = await recuperar.mutateAsync({ p_codigo: codigo });
      const nuevo = await envolverConNuevaPassword(dek, nueva);
      await cambiar.mutateAsync({ p_sal: nuevo.sal, p_iter: nuevo.iteraciones, p_envuelta: nuevo.clave_envuelta });
      onListo(await abrirBoveda(nueva, nuevo));
    } catch (err) {
      setError(err);
      setTrabajando(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-xs text-[#9aafc3]">Te enviamos un código de 6 dígitos a <b className="text-white">{email}</b> para elegir una contraseña maestra nueva. Las claves guardadas no se pierden.</p>
      <BotonEnviarCodigo envio={envio} />
      <ErrorBox error={envio.error} />
      {envio.enviado && (
        <>
          <div>
            <label className={labelClass} htmlFor="bv-codigo">Código</label>
            <CampoCodigo value={codigo} onChange={setCodigo} />
          </div>
          <div>
            <label className={labelClass} htmlFor="bv-nueva">Contraseña maestra nueva</label>
            <CampoPassword id="bv-nueva" value={nueva} onChange={setNueva} />
          </div>
          <div>
            <label className={labelClass} htmlFor="bv-rep2">Repite la nueva</label>
            <CampoPassword id="bv-rep2" value={repetir} onChange={setRepetir} />
          </div>
          <ErrorBox error={error} />
          {error?.restantes !== undefined && <p className="text-xs text-amber-200">Te quedan {error.restantes} intentos con este código.</p>}
          <button type="submit" className={btnPrimary} disabled={trabajando || codigo.length !== 6}>
            {trabajando ? 'Restaurando…' : 'Restaurar y entrar'}
          </button>
        </>
      )}
    </form>
  );
}

function ReiniciarSinRespaldo() {
  const reiniciar = useReiniciarBoveda();
  const [texto, setTexto] = useState('');
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#9aafc3]">
        Esta bóveda se creó antes de que existiera la restauración, así que <b className="text-white">no se puede restaurar</b>: sin la contraseña maestra, sus claves no se pueden abrir.
        Lo único posible es borrarla y empezar de nuevo (tendrás que volver a ingresar las claves).
      </p>
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
        Esto borra la bóveda y todas sus claves para todo el equipo. No se puede deshacer.
      </div>
      <div>
        <label className={labelClass} htmlFor="bv-borrar">Escribe BORRAR para confirmar</label>
        <input id="bv-borrar" className={inputClass} value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" />
      </div>
      <ErrorBox error={reiniciar.error} />
      <button type="button" className={btnPrimary} disabled={texto !== 'BORRAR' || reiniciar.isPending} onClick={() => reiniciar.mutate()}>
        <Trash2 className="w-4 h-4" /> {reiniciar.isPending ? 'Borrando…' : 'Borrar y empezar de nuevo'}
      </button>
    </div>
  );
}

function Boveda({ config, estado, llave, onBloquear }) {
  const { data: filas = [], isLoading, error } = useBovedaEntradas(true);
  const eliminar = useEliminarEntradaBoveda();
  const [items, setItems] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null);
  const [cambiandoPass, setCambiandoPass] = useState(false);
  const [visibles, setVisibles] = useState(() => new Set());
  const [aviso, setAviso] = useState('');
  const ultimoCopiado = useRef(null);

  // Decrypt in the browser every time the ciphertext changes.
  useEffect(() => {
    let vigente = true;
    Promise.all(
      filas.map(async (f) => {
        try {
          return { id: f.id, datos: f.datos, ...(await descifrarDatos(llave, f.datos)) };
        } catch {
          return { id: f.id, datos: f.datos, sitio: '(no se pudo descifrar)', usuario: '', clave: '', error: true };
        }
      }),
    ).then((r) => vigente && setItems(r));
    return () => {
      vigente = false;
    };
  }, [filas, llave]);

  // Wipe the clipboard 30 s after copying, if it still holds what we copied.
  useEffect(
    () => () => {
      if (ultimoCopiado.current) navigator.clipboard?.writeText('').catch(() => {});
    },
    [],
  );

  const copiar = async (texto, que) => {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      ultimoCopiado.current = texto;
      setAviso(`${que} copiado. Se borra del portapapeles en 30 s.`);
      setTimeout(() => {
        if (ultimoCopiado.current === texto) {
          navigator.clipboard.writeText('').catch(() => {});
          ultimoCopiado.current = null;
          setAviso('');
        }
      }, LIMPIAR_PORTAPAPELES_MS);
    } catch {
      setAviso('No se pudo copiar. Revela la clave y cópiala a mano.');
    }
  };

  const alternar = (id) =>
    setVisibles((v) => {
      const n = new Set(v);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const borrar = (it) => {
    if (window.confirm(`¿Eliminar la clave de "${it.sitio}"? No se puede deshacer.`)) eliminar.mutate(it.id);
  };

  const q = busqueda.trim().toLowerCase();
  const lista = items
    .filter((it) => !q || `${it.sitio} ${it.usuario}`.toLowerCase().includes(q))
    .sort((a, b) => a.sitio.localeCompare(b.sitio, 'es'));

  return (
    <>
      <Encabezado>
        <div className="flex flex-wrap gap-2">
          {estado.admin && (
            <button type="button" className={btnGhost} onClick={() => setCambiandoPass(true)}>
              <KeyRound className="w-4 h-4" /> Cambiar contraseña maestra
            </button>
          )}
          <button type="button" className={btnGhost} onClick={onBloquear}>
            <Lock className="w-4 h-4" /> Bloquear
          </button>
          <button type="button" className={btnPrimary} onClick={() => setEditando({})}>
            <Plus className="w-4 h-4" /> Agregar clave
          </button>
        </div>
      </Encabezado>

      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9aafc3]" />
        <input className={`${inputClass} pl-9`} placeholder="Buscar por web o usuario" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar" />
      </div>

      <ErrorBox error={error || eliminar.error} />
      <p className="text-xs text-emerald-300 min-h-4 mb-2" role="status">{aviso}</p>
      {isLoading && <p className="text-sm text-[#9aafc3]">Cargando…</p>}
      {!isLoading && items.length === 0 && (
        <div className={`${card} px-4 py-8 text-center text-sm text-[#9aafc3]`}>
          Aún no hay claves guardadas. Agrega la primera con «Agregar clave».
        </div>
      )}
      {!isLoading && items.length > 0 && lista.length === 0 && (
        <div className={`${card} px-4 py-8 text-center text-sm text-[#9aafc3]`}>Sin resultados para «{busqueda}».</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {lista.map((it) => {
          const link = enlaceDe(it.sitio);
          const visible = visibles.has(it.id);
          return (
            <div key={it.id} className={`${card} p-4 space-y-2`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {link ? (
                    <a href={link} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-white hover:text-[#67c8f3] truncate">{it.sitio}</a>
                  ) : (
                    <span className="block text-sm font-medium text-white truncate">{it.sitio}</span>
                  )}
                  {link && <span className="block text-[11px] text-[#9aafc3] truncate">{hostDe(link)}</span>}
                </div>
                {!it.error && (
                  <div className="flex gap-3 shrink-0">
                    <button type="button" onClick={() => setEditando(it)} className="text-[#9aafc3] hover:text-white" aria-label={`Editar ${it.sitio}`}><Pencil className="w-4 h-4" /></button>
                    <button type="button" onClick={() => borrar(it)} className="text-[#9aafc3] hover:text-red-400" aria-label={`Eliminar ${it.sitio}`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              {!it.error && (
                <>
                  <Campo etiqueta="Usuario" valor={it.usuario || '—'} onCopiar={it.usuario ? () => copiar(it.usuario, 'Usuario') : null} />
                  <Campo
                    etiqueta="Clave"
                    valor={visible ? it.clave : '••••••••••'}
                    mono
                    onCopiar={() => copiar(it.clave, 'Clave')}
                    extra={
                      <button type="button" onClick={() => alternar(it.id)} className="text-[#9aafc3] hover:text-white" aria-label={visible ? 'Ocultar clave' : 'Mostrar clave'}>
                        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  {it.notas && <p className="text-xs text-[#9aafc3] whitespace-pre-wrap break-words">{it.notas}</p>}
                </>
              )}
            </div>
          );
        })}
      </div>

      {editando && <EntradaForm entrada={editando} llave={llave} onClose={() => setEditando(null)} />}
      {cambiandoPass && <CambiarPassword config={config} onClose={() => setCambiandoPass(false)} />}
    </>
  );
}

function Campo({ etiqueta, valor, onCopiar, extra, mono }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-[11px] uppercase tracking-wide text-[#9aafc3]">{etiqueta}</span>
      <span className={`flex-1 min-w-0 text-sm text-white truncate ${mono ? 'font-mono' : ''}`}>{valor}</span>
      {extra}
      {onCopiar && (
        <button type="button" onClick={onCopiar} className="text-[#9aafc3] hover:text-white" aria-label={`Copiar ${etiqueta.toLowerCase()}`}>
          <Copy className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function EntradaForm({ entrada, llave, onClose }) {
  const guardar = useGuardarEntradaBoveda();
  const [errorLocal, setErrorLocal] = useState(null);
  const [verClave, setVerClave] = useState(!entrada.id);
  const [f, setF] = useState({
    sitio: entrada.sitio || '',
    usuario: entrada.usuario || '',
    clave: entrada.clave || '',
    notas: entrada.notas || '',
  });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorLocal(null);
    try {
      const datos = await cifrarDatos(llave, {
        sitio: f.sitio.trim(),
        usuario: f.usuario.trim(),
        clave: f.clave,
        notas: f.notas.trim(),
      });
      guardar.mutate({ id: entrada.id, datos }, { onSuccess: onClose });
    } catch (err) {
      setErrorLocal(err);
    }
  };

  return (
    <Modal titulo={entrada.id ? 'Editar clave' : 'Agregar clave'} onClose={onClose} ancho="max-w-lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="bv-sitio">Web o servicio</label>
          <input id="bv-sitio" className={inputClass} value={f.sitio} onChange={set('sitio')} maxLength={200} required autoFocus placeholder="github.com" />
        </div>
        <div>
          <label className={labelClass} htmlFor="bv-usuario">Usuario o correo</label>
          <input id="bv-usuario" className={inputClass} value={f.usuario} onChange={set('usuario')} maxLength={200} autoComplete="off" />
        </div>
        <div>
          <label className={labelClass} htmlFor="bv-clave">Clave</label>
          <div className="flex gap-2">
            <input
              id="bv-clave"
              type={verClave ? 'text' : 'password'}
              className={`${inputClass} font-mono`}
              value={f.clave}
              onChange={set('clave')}
              maxLength={500}
              autoComplete="new-password"
              required
            />
            <button type="button" className={btnGhost} onClick={() => setVerClave((v) => !v)} aria-label={verClave ? 'Ocultar clave' : 'Mostrar clave'}>
              {verClave ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                setF((x) => ({ ...x, clave: generarClave() }));
                setVerClave(true);
              }}
              title="Generar una clave segura"
              aria-label="Generar una clave segura"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="bv-notas">Notas (opcional)</label>
          <textarea id="bv-notas" className={inputClass} rows={3} value={f.notas} onChange={set('notas')} maxLength={2000} />
        </div>
        <ErrorBox error={errorLocal || guardar.error} />
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={guardar.isPending}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

function CambiarPassword({ config, onClose }) {
  const cambiar = useCambiarPasswordBoveda();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (nueva.length < MIN_PASSWORD) return setError(new Error(`Usa al menos ${MIN_PASSWORD} caracteres.`));
    if (nueva !== repetir) return setError(new Error('Las contraseñas nuevas no coinciden.'));
    setError(null);
    setTrabajando(true);
    try {
      const campos = await cambiarPassword(config, actual, nueva);
      await cambiar.mutateAsync({ p_sal: campos.sal, p_iter: campos.iteraciones, p_envuelta: campos.clave_envuelta });
      onClose();
    } catch (err) {
      setError(err);
      setTrabajando(false);
    }
  };

  return (
    <Modal titulo="Cambiar contraseña maestra" onClose={onClose} ancho="max-w-md">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-xs text-[#9aafc3]">Avisa al equipo la nueva contraseña. Si alguien se va, cambia también las claves guardadas: quien conoció la contraseña pudo haberlas copiado.</p>
        <div>
          <label className={labelClass} htmlFor="bv-actual">Contraseña actual</label>
          <CampoPassword id="bv-actual" value={actual} onChange={setActual} autoFocus />
        </div>
        <div>
          <label className={labelClass} htmlFor="bv-nueva">Contraseña nueva</label>
          <CampoPassword id="bv-nueva" value={nueva} onChange={setNueva} />
        </div>
        <div>
          <label className={labelClass} htmlFor="bv-rep2">Repite la nueva</label>
          <CampoPassword id="bv-rep2" value={repetir} onChange={setRepetir} />
        </div>
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={trabajando}>{trabajando ? 'Cambiando…' : 'Cambiar'}</button>
        </div>
      </form>
    </Modal>
  );
}
