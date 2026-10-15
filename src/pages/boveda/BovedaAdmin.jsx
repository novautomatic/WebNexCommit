import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Eye, EyeOff, KeyRound, Lock, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, Unlock } from 'lucide-react';
import {
  useBovedaConfig,
  useBovedaEntradas,
  useCambiarPasswordBoveda,
  useCrearBoveda,
  useEliminarEntradaBoveda,
  useGuardarEntradaBoveda,
} from '../../hooks/boveda';
import { useEquipo, useMiEquipoId } from '../../hooks/tareas';
import { MIN_PASSWORD, abrirBoveda, cambiarPassword, cifrarDatos, crearBoveda, descifrarDatos, generarClave } from '../../lib/boveda';
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
  const { data: config, isLoading, error } = useBovedaConfig();
  const [llave, setLlave] = useState(null);

  const bloquear = useCallback(() => setLlave(null), []);

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

  return (
    <div className="max-w-5xl">
      {isLoading && <p className="text-sm text-[#9aafc3]">Cargando…</p>}
      <ErrorBox error={error} />
      {!isLoading && !error && !config && <CrearBoveda onListo={setLlave} />}
      {!isLoading && !error && config && !llave && <Desbloquear config={config} onListo={setLlave} />}
      {!isLoading && !error && config && llave && <Boveda config={config} llave={llave} onBloquear={bloquear} />}
    </div>
  );
}

function Encabezado({ children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 className="text-white font-medium flex items-center gap-2"><KeyRound className="w-4 h-4 text-[#67c8f3]" /> Bóveda de claves</h2>
        <p className="text-sm text-[#9aafc3] max-w-2xl">
          Webs, usuarios y claves en común del equipo, cifrados con una contraseña maestra compartida. Quien tenga la contraseña ve y edita todo; Supabase no puede abrirlas.
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
      const { config, llave } = await crearBoveda(pass);
      await crear.mutateAsync(config);
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
          Es la contraseña de toda la bóveda: la usará todo el equipo, así que compártela solo con ellos y por un canal seguro. No se puede recuperar: si se pierde, las claves se pierden.
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

function Desbloquear({ config, onListo }) {
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
        <h3 className="text-white font-medium flex items-center gap-2"><Lock className="w-4 h-4 text-[#67c8f3]" /> Bóveda del equipo bloqueada</h3>
        <p className="text-xs text-[#9aafc3]">Usa la contraseña maestra común del equipo. Si no la tienes, pídesela a quien creó la bóveda.</p>
        <div>
          <label className={labelClass} htmlFor="bv-pass">Contraseña maestra</label>
          <CampoPassword id="bv-pass" value={pass} onChange={setPass} autoFocus />
        </div>
        <ErrorBox error={error} />
        <button type="submit" className={btnPrimary} disabled={trabajando}>
          <Unlock className="w-4 h-4" /> {trabajando ? 'Abriendo…' : 'Desbloquear'}
        </button>
      </form>
    </>
  );
}

function Boveda({ config, llave, onBloquear }) {
  const { data: equipo = [] } = useEquipo();
  const { data: yo } = useMiEquipoId();
  const esDueno = equipo.find((m) => m.id === yo)?.rol === 'dueno';
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
          {esDueno && (
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
      await cambiar.mutateAsync({ equipoId: config.equipo_id, ...campos });
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
