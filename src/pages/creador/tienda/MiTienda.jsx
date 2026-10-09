// Panel de la tienda del Creador (nexcommit.com/mi-tienda). Mini panel para el
// cliente de una tienda de prueba: Ventas (pedidos que llegaron por WhatsApp) y
// Productos (hasta 10). Todo lo demás aparece con candado y abre «Desbloquear
// para más», que invita a escribirle a NexCommit y registra el interés.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, Check, ExternalLink, ImagePlus, Loader2, Lock, LogOut, Menu, MessageCircle, Pencil, Plus,
  Rocket, Sparkles, Star, Trash2, X,
} from 'lucide-react';
import SEO from '../../../components/SEO';
import { api, guardarToken, leerToken } from '../../../config/creador';
import { WHATSAPP_NUMBER } from '../../../config/contact';
import SelectorFoto from '../editor/SelectorFoto';
import GuardiaModeracion from '../GuardiaModeracion';
import { GRUPOS, TODAS } from './funciones';
import '../creador.css';
import '../editor/editor.css';
import './tienda.css';

const precio = (n) => (n == null ? 'Sin precio' : `$${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`);
const fecha = (d) => new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const wa = (texto) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;

const ESTADOS = {
  nuevo: { label: 'Nuevo', color: '#67c8f3' },
  confirmado: { label: 'Confirmado', color: '#fbbf24' },
  entregado: { label: 'Entregado', color: '#34d399' },
  cancelado: { label: 'Cancelado', color: '#f87171' },
};

function restante(expira) {
  const ms = new Date(expira).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  return h >= 48 ? `${Math.floor(h / 24)} días` : h >= 1 ? `${h} h` : 'menos de 1 h';
}

// ─── Ingreso ────────────────────────────────────────────────────────────────
function Ingreso({ onListo }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modo, setModo] = useState('ingresar');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setAviso('');
    setCargando(true);
    try {
      if (modo === 'ingresar') {
        const r = await api('/tienda/ingresar', { metodo: 'POST', cuerpo: { email, password } });
        guardarToken(r.token);
        onListo(r.token);
      } else {
        await api('/tienda/recuperar', { metodo: 'POST', cuerpo: { email } });
        setAviso('Si ese correo tiene una tienda, te enviamos una contraseña nueva. Revisa tu bandeja (y spam).');
        setModo('ingresar');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mt-ingreso">
      <form className="mt-ingreso-caja" onSubmit={enviar}>
        <div className="mt-marca">Nex<b>Commit</b> <span>Mi tienda</span></div>
        <h1>{modo === 'ingresar' ? 'Entra a tu panel' : 'Recuperar contraseña'}</h1>
        <p>{modo === 'ingresar' ? 'Usa el correo y la contraseña que te enviamos al crear tu tienda.' : 'Te enviaremos una contraseña nueva a tu correo.'}</p>
        <label>Correo<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></label>
        {modo === 'ingresar' && (
          <label>Contraseña<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        )}
        {error && <div className="mt-error">{error}</div>}
        {aviso && <div className="mt-ok">{aviso}</div>}
        <button type="submit" className="mt-btn" disabled={cargando}>
          {cargando && <Loader2 className="mt-gira" />}{modo === 'ingresar' ? 'Entrar' : 'Enviarme una contraseña nueva'}
        </button>
        <button type="button" className="mt-link" onClick={() => { setModo(modo === 'ingresar' ? 'recuperar' : 'ingresar'); setError(''); }}>
          {modo === 'ingresar' ? '¿Olvidaste tu contraseña?' : 'Volver a ingresar'}
        </button>
        <a className="mt-link" href="/crea-tu-web">¿No tienes tienda? Crea una gratis</a>
      </form>
    </div>
  );
}

// ─── Desbloquear para más ───────────────────────────────────────────────────
function Desbloquear({ funcion, tienda, onCerrar }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);
  const Icono = funcion.icon || Lock;
  return (
    <div className="mt-modal" role="dialog" aria-modal="true" aria-label={`Desbloquear ${funcion.label}`} onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="mt-desb">
        <button type="button" className="mt-x" onClick={onCerrar} aria-label="Cerrar"><X /></button>
        <div className="mt-desb-ic"><Icono aria-hidden="true" /><span><Lock aria-hidden="true" /></span></div>
        <span className="mt-plus">PLUS</span>
        <h2>Desbloquea {funcion.label.toLowerCase()}</h2>
        <p>{funcion.detalle}</p>
        <ul>
          <li><Check aria-hidden="true" /> Tu tienda permanente, sin fecha de vencimiento</li>
          <li><Check aria-hidden="true" /> Todas las funciones del panel, a tu medida</li>
          <li><Check aria-hidden="true" /> Te acompañamos para que vendas más</li>
        </ul>
        <a className="mt-btn mt-btn-wa" target="_blank" rel="noopener noreferrer"
          href={wa(`Hola! Tengo mi tienda ${tienda?.url?.replace('https://www.', '') || ''} y quiero desbloquear «${funcion.label}» para hacer crecer mi sitio web.`)}>
          <MessageCircle aria-hidden="true" /> Desbloquear para más
        </a>
        <button type="button" className="mt-link" onClick={onCerrar}>Ahora no</button>
      </div>
    </div>
  );
}

// ─── Ventas ─────────────────────────────────────────────────────────────────
function Ventas({ datos, token, onCambio, onBloqueada }) {
  const pedidos = datos.pedidos;
  const mes = new Date();
  const delMes = pedidos.filter((p) => {
    const d = new Date(p.created_at);
    return d.getMonth() === mes.getMonth() && d.getFullYear() === mes.getFullYear() && p.estado !== 'cancelado';
  });
  const totalMes = delMes.reduce((a, p) => a + (p.total || 0), 0);
  const nuevos = pedidos.filter((p) => p.estado === 'nuevo').length;
  const [error, setError] = useState('');

  const cambiarEstado = async (p, estado) => {
    setError('');
    try {
      await api(`/tienda/pedidos/${p.id}`, { metodo: 'PATCH', cuerpo: { estado }, token });
      onCambio();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="mt-vista">
      <div className="mt-vista-top">
        <div><h1>Ventas</h1><p>Los pedidos que tus clientes te enviaron por WhatsApp desde tu tienda.</p></div>
      </div>
      <div className="mt-kpis">
        <div className="mt-kpi"><span>Pedidos nuevos</span><b>{nuevos}</b></div>
        <div className="mt-kpi"><span>Ventas del mes</span><b>{precio(totalMes)}</b></div>
        <div className="mt-kpi"><span>Pedidos del mes</span><b>{delMes.length}</b></div>
        <div className="mt-kpi"><span>Ticket promedio</span><b>{delMes.length ? precio(Math.round(totalMes / delMes.length)) : '—'}</b></div>
      </div>

      {/* Adelanto bloqueado: el gráfico existe, pero se desbloquea. */}
      <button type="button" className="mt-teaser" onClick={() => onBloqueada(TODAS.find((f) => f.id === 'dashboard'))}>
        <div className="mt-teaser-graf" aria-hidden="true">{[38, 52, 30, 64, 70, 48, 82, 60, 90, 74, 96, 88].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
        <div className="mt-teaser-capa"><Lock aria-hidden="true" /><b>Gráfico de ventas y estadísticas</b><span>Desbloquear para más</span></div>
      </button>

      {error && <div className="mt-error">{error}</div>}
      {pedidos.length === 0 ? (
        <div className="mt-vacio">
          <b>Aún no tienes pedidos.</b>
          <span>Comparte el link de tu tienda por WhatsApp e Instagram: cada pedido que hagan aparecerá aquí.</span>
          <a href={datos.tienda.url} target="_blank" rel="noopener noreferrer" className="mt-link">Ver mi tienda</a>
        </div>
      ) : (
        <div className="mt-pedidos">
          {pedidos.map((p) => (
            <article key={p.id} className="mt-pedido">
              <div className="mt-pedido-top">
                <b>Pedido #{p.numero}</b>
                <span>{fecha(p.created_at)}</span>
                <select value={p.estado} onChange={(e) => cambiarEstado(p, e.target.value)} style={{ color: ESTADOS[p.estado]?.color }} aria-label="Estado del pedido">
                  {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <ul>
                {(p.items || []).map((i) => (
                  <li key={i.id}><span>{i.cantidad} × {i.nombre}</span><span>{i.subtotal == null ? 'a consultar' : precio(i.subtotal)}</span></li>
                ))}
              </ul>
              <div className="mt-pedido-pie">
                <span>{p.nombre ? `Cliente: ${p.nombre}` : 'Cliente sin nombre'}{p.nota ? ` · «${p.nota}»` : ''}</span>
                <b>{precio(p.total)}</b>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="mt-nota">Los pedidos se guardan 90 días. El pago y la entrega se coordinan por WhatsApp con tu cliente.</p>
    </div>
  );
}

// ─── Productos ──────────────────────────────────────────────────────────────
const VACIO = { nombre: '', precio: '', descripcion: '', destacado: false, activo: true, foto: null };

function FormProducto({ inicial, token, onGuardado, onCerrar }) {
  const [f, setF] = useState(() => ({ ...VACIO, ...inicial, precio: inicial?.precio ?? '' }));
  const [foto, setFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const cuerpo = { ...f, precio: f.precio === '' ? null : f.precio };
      if (inicial?.id) await api(`/tienda/productos/${inicial.id}`, { metodo: 'PUT', cuerpo, token });
      else await api('/tienda/productos', { metodo: 'POST', cuerpo, token });
      onGuardado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const elegirFoto = async (elegida, dataUrl) => {
    let nueva = elegida;
    if (dataUrl) nueva = (await api('/imagen', { metodo: 'POST', cuerpo: { imagen: dataUrl }, token })).foto;
    setF((p) => ({ ...p, foto: nueva }));
    setFoto(false);
  };

  return (
    <div className="mt-modal" role="dialog" aria-modal="true" aria-label="Producto" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="mt-form" onSubmit={guardar}>
        <div className="mt-form-top"><h2>{inicial?.id ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button type="button" className="mt-x" onClick={onCerrar} aria-label="Cerrar"><X /></button></div>
        <button type="button" className="mt-foto" onClick={() => setFoto(true)}>
          {f.foto ? <img src={f.foto.url_chica || f.foto.url} alt="" /> : <span><ImagePlus /> Agregar foto</span>}
        </button>
        <label>Nombre<input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} maxLength={60} required /></label>
        <label>Precio (CLP)
          <input inputMode="numeric" value={f.precio} placeholder="Ej: 12990 · déjalo vacío para «Consultar precio»"
            onChange={(e) => setF({ ...f, precio: e.target.value.replace(/[^\d]/g, '').slice(0, 9) })} />
        </label>
        <label>Descripción<textarea value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} maxLength={400} rows={4} /></label>
        <div className="mt-checks">
          <label><input type="checkbox" checked={f.destacado} onChange={(e) => setF({ ...f, destacado: e.target.checked })} /> Destacado (sale en el carrusel)</label>
          <label><input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Visible en la tienda</label>
        </div>
        {error && <div className="mt-error">{error}</div>}
        <button type="submit" className="mt-btn" disabled={guardando}>{guardando && <Loader2 className="mt-gira" />} Guardar producto</button>
      </form>
      {foto && (
        <SelectorFoto titulo="Foto del producto" token={token} sugerencia={f.nombre} onElegir={elegirFoto} onCerrar={() => setFoto(false)}
          onQuitar={f.foto ? () => { setF((p) => ({ ...p, foto: null })); setFoto(false); } : null} />
      )}
    </div>
  );
}

function Productos({ datos, token, onCambio, onBloqueada }) {
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState('');
  const productos = datos.productos;
  const lleno = productos.length >= datos.productos_max;
  const activa = datos.tienda.activa;

  const accion = async (fn) => {
    setError('');
    try {
      await fn();
      onCambio();
    } catch (e) {
      setError(e.message);
    }
  };
  const mover = (i, d) => accion(() => {
    const ids = productos.map((p) => p.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    return api('/tienda/orden', { metodo: 'PUT', cuerpo: { ids }, token });
  });
  const cambiar = (p, patch) => accion(() => api(`/tienda/productos/${p.id}`, { metodo: 'PUT', cuerpo: { ...p, ...patch }, token }));

  return (
    <div className="mt-vista">
      <div className="mt-vista-top">
        <div><h1>Productos</h1><p>Lo que ven tus clientes en la tienda. {productos.length}/{datos.productos_max} productos.</p></div>
        {activa && (lleno ? (
          <button type="button" className="mt-btn mt-btn-plus" onClick={() => onBloqueada(TODAS.find((f) => f.id === 'mas_productos'))}><Lock /> Agregar más productos</button>
        ) : (
          <button type="button" className="mt-btn" onClick={() => setEditando({})}><Plus /> Agregar producto</button>
        ))}
      </div>
      {productos.some((p) => p.precio == null) && (
        <div className="mt-aviso"><Sparkles aria-hidden="true" /> Algunos productos aún no tienen precio y se muestran como «Consultar precio». Edítalos para ponerles valor.</div>
      )}
      {error && <div className="mt-error">{error}</div>}
      <div className="mt-prods">
        {productos.map((p, i) => (
          <article key={p.id} className={`mt-prod ${p.activo ? '' : 'oculto'}`}>
            <div className="mt-prod-img">{p.foto ? <img src={p.foto.url_chica || p.foto.url} alt="" /> : <span>{p.nombre.slice(0, 2).toUpperCase()}</span>}
              {p.destacado && <em><Star aria-hidden="true" /> Destacado</em>}</div>
            <div className="mt-prod-cuerpo">
              <b>{p.nombre}</b>
              <span className={p.precio == null ? 'sin' : ''}>{precio(p.precio)}</span>
              {!p.activo && <small>Oculto en la tienda</small>}
            </div>
            {activa && (
              <div className="mt-prod-acc">
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir"><ArrowUp /></button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === productos.length - 1} aria-label="Bajar"><ArrowDown /></button>
                <button type="button" onClick={() => cambiar(p, { destacado: !p.destacado })} aria-label="Destacar" className={p.destacado ? 'on' : ''}><Star /></button>
                <button type="button" onClick={() => setEditando(p)} aria-label="Editar"><Pencil /></button>
                <button type="button" className="rojo" aria-label="Eliminar"
                  onClick={() => window.confirm(`¿Eliminar «${p.nombre}»?`) && accion(() => api(`/tienda/productos/${p.id}`, { metodo: 'DELETE', token }))}><Trash2 /></button>
              </div>
            )}
          </article>
        ))}
        {activa && !lleno && (
          <button type="button" className="mt-prod-nuevo" onClick={() => setEditando({})}><Plus /> Agregar producto</button>
        )}
      </div>
      {editando && (
        <FormProducto inicial={editando} token={token} onCerrar={() => setEditando(null)} onGuardado={() => { setEditando(null); onCambio(); }} />
      )}
    </div>
  );
}

// ─── Mi cuenta ──────────────────────────────────────────────────────────────
function Cuenta({ datos, token }) {
  const [f, setF] = useState({ actual: '', nueva: '', repetir: '' });
  const [estado, setEstado] = useState({ cargando: false, error: '', ok: '' });
  const guardar = async (e) => {
    e.preventDefault();
    if (f.nueva !== f.repetir) return setEstado({ error: 'Las contraseñas nuevas no coinciden.' });
    setEstado({ cargando: true });
    try {
      await api('/tienda/password', { metodo: 'POST', cuerpo: { actual: f.actual, nueva: f.nueva }, token });
      setF({ actual: '', nueva: '', repetir: '' });
      setEstado({ ok: 'Listo, tu contraseña quedó cambiada.' });
    } catch (err) {
      setEstado({ error: err.message });
    }
    return undefined;
  };
  return (
    <div className="mt-vista">
      <div className="mt-vista-top"><div><h1>Mi cuenta</h1><p>{datos.lead.nombre} · {datos.lead.email}</p></div></div>
      <form className="mt-form mt-form-plano" onSubmit={guardar}>
        <h2>Cambiar contraseña</h2>
        <label>Contraseña actual<input type="password" value={f.actual} onChange={(e) => setF({ ...f, actual: e.target.value })} required autoComplete="current-password" /></label>
        <label>Nueva contraseña (mín. 8 caracteres)<input type="password" value={f.nueva} onChange={(e) => setF({ ...f, nueva: e.target.value })} minLength={8} required autoComplete="new-password" /></label>
        <label>Repite la nueva<input type="password" value={f.repetir} onChange={(e) => setF({ ...f, repetir: e.target.value })} minLength={8} required autoComplete="new-password" /></label>
        {estado.error && <div className="mt-error">{estado.error}</div>}
        {estado.ok && <div className="mt-ok">{estado.ok}</div>}
        <button type="submit" className="mt-btn" disabled={estado.cargando}>{estado.cargando && <Loader2 className="mt-gira" />} Guardar</button>
      </form>
    </div>
  );
}

// ─── Panel ──────────────────────────────────────────────────────────────────
// La guardia de moderación va por fuera: tapa el panel en cualquiera de sus estados.
export default function MiTienda() {
  return (
    <>
      <GuardiaModeracion />
      <PanelTienda />
    </>
  );
}

function PanelTienda() {
  const [token, setToken] = useState('');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState('ventas');
  const [bloqueada, setBloqueada] = useState(null);
  const [menu, setMenu] = useState(false);

  const cargar = useCallback(async (t) => {
    try {
      setDatos(await api('/tienda/resumen', { token: t }));
      setError('');
    } catch (e) {
      if (e.status === 401) {
        guardarToken('');
        setToken('');
      } else {
        setError(e.message);
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const t = leerToken();
    (async () => {
      if (!t) {
        setCargando(false);
        return;
      }
      setToken(t);
      await cargar(t);
    })();
  }, [cargar]);

  const salir = () => {
    guardarToken('');
    setToken('');
    setDatos(null);
  };

  const abrir = (item) => {
    setMenu(false);
    if (item.enlace) {
      window.location.href = item.enlace;
      return;
    }
    if (item.bloqueada) {
      setBloqueada(item);
      api('/tienda/interes', { metodo: 'POST', cuerpo: { funcion: item.label }, token }).catch(() => {});
      return;
    }
    setVista(item.id);
  };

  const quedan = useMemo(() => (datos ? restante(datos.tienda.expira_at) : null), [datos]);

  if (cargando) return <div className="mt-carga"><Loader2 className="mt-gira" /> Cargando tu tienda…</div>;
  if (!token || (!datos && !error)) {
    return (
      <>
        <SEO title="Mi tienda — NexCommit" noIndex />
        <Ingreso onListo={(t) => { setToken(t); setCargando(true); cargar(t); }} />
      </>
    );
  }
  if (!datos) {
    return (
      <div className="mt-ingreso"><div className="mt-ingreso-caja">
        <h1>No pudimos abrir tu tienda</h1><p>{error}</p>
        <button type="button" className="mt-btn" onClick={salir}>Ingresar con otra cuenta</button>
      </div></div>
    );
  }

  const ir = (id) => abrir(TODAS.find((f) => f.id === id));
  const crecer = wa(`Hola! Tengo mi tienda ${datos.tienda.url.replace('https://www.', '')} y quiero hacerla crecer.`);

  return (
    <div className="mt">
      <SEO title={`${datos.tienda.nombre} · Mi tienda — NexCommit`} noIndex />
      <aside className={`mt-lado ${menu ? 'abierto' : ''}`}>
        <div className="mt-lado-top">
          <div className="mt-marca">Nex<b>Commit</b></div>
          <button type="button" className="mt-x mt-solo-movil" onClick={() => setMenu(false)} aria-label="Cerrar menú"><X /></button>
        </div>
        <div className="mt-tienda">
          <span className="mt-tienda-av" style={{ background: datos.tienda.primario }}>
            {datos.tienda.logo_url ? <img src={datos.tienda.logo_url} alt="" /> : datos.tienda.nombre.slice(0, 2).toUpperCase()}
          </span>
          <div><b>{datos.tienda.nombre}</b><a href={datos.tienda.url} target="_blank" rel="noopener noreferrer">Ver tienda <ExternalLink /></a></div>
        </div>
        <nav className="mt-nav" aria-label="Secciones del panel">
          {GRUPOS.map((g) => (
            <div key={g.titulo}>
              <p>{g.titulo}</p>
              {g.items.map((it) => {
                const Ic = it.icon;
                return (
                  <button key={it.id} type="button" onClick={() => abrir(it)}
                    className={`${vista === it.id && !it.bloqueada ? 'on' : ''} ${it.bloqueada ? 'bloq' : ''}`}>
                    <Ic aria-hidden="true" /><span>{it.label}</span>{it.bloqueada && <em>PLUS</em>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <button type="button" className="mt-salir" onClick={salir}><LogOut aria-hidden="true" /> Cerrar sesión</button>
      </aside>
      {menu && <button type="button" className="mt-velo" aria-label="Cerrar menú" onClick={() => setMenu(false)} />}

      <main className="mt-main">
        <header className="mt-top">
          <button type="button" className="mt-x mt-solo-movil" onClick={() => setMenu(true)} aria-label="Abrir menú"><Menu /></button>
          <div className="mt-top-info">
            {datos.tienda.activa
              ? <span className="mt-chip ok">Tienda publicada{quedan ? ` · vence en ${quedan}` : ''}</span>
              : <span className="mt-chip mal">Tu tienda de prueba venció</span>}
          </div>
          <a className="mt-btn mt-btn-wa mt-crecer" href={crecer} target="_blank" rel="noopener noreferrer"><Rocket aria-hidden="true" /> <span>Hacer crecer mi tienda</span></a>
        </header>
        {!datos.tienda.activa && (
          <div className="mt-aviso mal">Tu tienda de prueba terminó: puedes ver tus ventas, pero ya no recibe pedidos ni cambios. <a href={crecer} target="_blank" rel="noopener noreferrer">Escríbenos para dejarla permanente.</a></div>
        )}
        {!datos.tienda.whatsapp && datos.tienda.activa && (
          <div className="mt-aviso">Tu tienda no tiene WhatsApp configurado, así que tus clientes no pueden enviarte pedidos. Agrégalo en <button type="button" className="mt-link" onClick={() => ir('diseno')}>Diseño de mi página → Contacto</button>.</div>
        )}
        {vista === 'ventas' && <Ventas datos={datos} token={token} onCambio={() => cargar(token)} onBloqueada={(f) => abrir(f)} />}
        {vista === 'productos' && <Productos datos={datos} token={token} onCambio={() => cargar(token)} onBloqueada={(f) => abrir(f)} />}
        {vista === 'cuenta' && <Cuenta datos={datos} token={token} />}
      </main>

      {bloqueada && <Desbloquear funcion={bloqueada} tienda={datos.tienda} onCerrar={() => setBloqueada(null)} />}
    </div>
  );
}
