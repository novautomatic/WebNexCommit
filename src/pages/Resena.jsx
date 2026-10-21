import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Loader2, MessageSquareQuote, Star } from 'lucide-react';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient';
import { RESENA_MAX, RESENA_MIN } from '../data/RESENAS';
import './home.css';
import './creador/creador.css';

// Page of the review request email sent from /admin → Reseñas.
// The link (?s=<request id>&t=<signed token>) lets the client write ONE review;
// `&baja=1` is the «No quiero recibir solicitudes de reseña» link.
// RPCs: resena_ver / resena_guardar / resena_no_recibir (migration 20261021130400).

// Only messages raised on purpose in SQL (RAISE EXCEPTION → P0001) are shown as is.
const mensajeError = (err) =>
  err?.code === 'P0001' && err.message ? err.message : 'No pudimos cargar el formulario. Intenta de nuevo en un rato.';

export default function Resena() {
  const [params] = useSearchParams();
  const solicitud = params.get('s');
  const token = params.get('t');
  const baja = params.get('baja') === '1';
  const [estado, setEstado] = useState(!solicitud || !token ? 'invalido' : baja ? 'baja' : 'cargando');
  const [error, setError] = useState('');
  const [f, setF] = useState(null);
  const [servicio, setServicio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [google, setGoogle] = useState(null);

  useEffect(() => {
    if (!solicitud || !token || baja) return;
    supabase.rpc('resena_ver', { p_solicitud: solicitud, p_token: token }).then(({ data, error: err }) => {
      if (err) {
        setError(mensajeError(err));
        setEstado('invalido');
        return;
      }
      setServicio(data.servicio || '');
      setF({ texto: '', nombre: data.nombre || '', cargo: data.cargo || '', empresa: data.empresa || '', publicar_nombre: false });
      setEstado('form');
    });
  }, [solicitud, token, baja]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const largo = f?.texto.trim().length ?? 0;

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (largo < RESENA_MIN) return setError(`Cuéntanos un poco más: la reseña necesita al menos ${RESENA_MIN} caracteres.`);
    if (f.nombre.trim().length < 2) return setError('Escribe tu nombre.');
    setEnviando(true);
    const { data, error: err } = await supabase.rpc('resena_guardar', {
      p_solicitud: solicitud,
      p_token: token,
      p_texto: f.texto,
      p_nombre: f.nombre,
      p_cargo: f.cargo,
      p_empresa: f.empresa,
      p_publicar_nombre: f.publicar_nombre,
    });
    setEnviando(false);
    if (err) return setError(mensajeError(err));
    setGoogle(data?.google_url || null);
    setEstado('listo');
  };

  const darseDeBaja = async () => {
    setEnviando(true);
    const { error: err } = await supabase.rpc('resena_no_recibir', { p_solicitud: solicitud, p_token: token });
    setEnviando(false);
    if (err) return setError(mensajeError(err));
    setEstado('baja_lista');
  };

  const nombreCorto = f?.nombre.split(' ')[0];

  return (
    <div className="nh">
      <SEO
        title="Deja tu reseña | NexCommit"
        description="Cuéntanos cómo te fue trabajando con NexCommit."
        canonicalUrl="https://www.nexcommit.com/resena"
        noIndex
      />
      <section className="ctw-hero">
        <div className="nh-wrap ctw-grid">
          <div>
            <div className="ctw-badge"><MessageSquareQuote aria-hidden="true" /> Clientes NexCommit</div>
            <h1>¿Cómo te fue con <em>{servicio || 'nosotros'}</em>?</h1>
            <p className="nh-lead">
              Tu opinión ayuda a otras empresas a conocernos y a nosotros a mejorar. Toma menos de 2 minutos.
            </p>
            <ul className="ctw-lista">
              <li><Check aria-hidden="true" /> El equipo la revisa antes de publicarla</li>
              <li><Check aria-hidden="true" /> Tú decides si aparece tu nombre</li>
              <li><Check aria-hidden="true" /> Puedes pedir que la retiremos cuando quieras</li>
            </ul>
          </div>

          <div className="cr">
            {estado === 'cargando' && (
              <p className="cr-info" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Loader2 className="cr-gira" aria-hidden="true" style={{ width: 18 }} /> Cargando…
              </p>
            )}

            {estado === 'invalido' && (
              <div className="cr-form">
                <div className="cr-aviso error" role="alert">
                  {error || 'Este enlace no es válido o ya no está vigente. Escríbenos y te mandamos uno nuevo.'}
                </div>
                <p className="cr-info">Escríbenos a <a href="mailto:nexcommit@gmail.com">nexcommit@gmail.com</a>.</p>
              </div>
            )}

            {estado === 'baja' && (
              <div className="cr-form">
                <div className="cr-paso-tit">
                  <div><h3>¿No quieres recibir más solicitudes de reseña?</h3>
                    <p>Dejaremos de escribirte para pedirte reseñas. Seguirás recibiendo los correos de tus proyectos con nosotros.</p></div>
                </div>
                {error && <div className="cr-aviso error" role="alert">{error}</div>}
                <button type="button" className="nh-btn cr-btn" onClick={darseDeBaja} disabled={enviando}>
                  {enviando ? <Loader2 className="cr-gira" aria-hidden="true" /> : <Check aria-hidden="true" />}
                  {enviando ? 'Guardando…' : 'Sí, no quiero recibirlas'}
                </button>
              </div>
            )}

            {estado === 'baja_lista' && (
              <div className="cr-form">
                <div className="cr-paso-tit">
                  <span className="cr-num"><Check aria-hidden="true" style={{ width: 18 }} /></span>
                  <div><h3>Listo</h3><p>No te volveremos a pedir reseñas.</p></div>
                </div>
                <Link className="nh-btn cr-btn" to="/">Ir a nexcommit.com <ArrowRight aria-hidden="true" /></Link>
              </div>
            )}

            {estado === 'listo' && (
              <div className="cr-form">
                <div className="cr-paso-tit">
                  <span className="cr-num"><Check aria-hidden="true" style={{ width: 18 }} /></span>
                  <div>
                    <h3>¡Gracias{nombreCorto ? `, ${nombreCorto}` : ''}!</h3>
                    <p>Recibimos tu reseña. El equipo la revisará y, una vez aprobada, aparecerá en nexcommit.com.</p>
                  </div>
                </div>
                {google && (
                  <>
                    <p className="cr-info">¿Nos ayudas también dejándola en Google? Es la mejor forma de que otras empresas nos encuentren.</p>
                    <a className="nh-btn cr-btn" href={google} target="_blank" rel="noopener noreferrer">
                      <Star aria-hidden="true" /> Dejar mi reseña en Google
                    </a>
                  </>
                )}
                <Link className={google ? 'cr-info' : 'nh-btn cr-btn'} to="/">Ir a nexcommit.com {!google && <ArrowRight aria-hidden="true" />}</Link>
              </div>
            )}

            {estado === 'form' && (
              <form className="cr-form" onSubmit={enviar} noValidate>
                <div className="cr-paso-tit">
                  <span className="cr-num">1</span>
                  <div><h3>Tu reseña</h3><p>¿Qué resolvimos? ¿Cómo fue trabajar con nosotros? ¿Qué cambió en tu negocio?</p></div>
                </div>
                <label>
                  Tu comentario
                  <textarea value={f.texto} onChange={set('texto')} rows={6} maxLength={RESENA_MAX} required
                    placeholder="Ej.: Necesitábamos una web que nos trajera clientes y…" />
                  <span className="cr-info" style={{ textAlign: 'right' }}>
                    {largo < RESENA_MIN ? `Mínimo ${RESENA_MIN} caracteres (llevas ${largo})` : `${largo} / ${RESENA_MAX}`}
                  </span>
                </label>

                <div className="cr-paso-tit">
                  <span className="cr-num">2</span>
                  <div><h3>Cómo apareces</h3><p>Así firmaremos tu reseña.</p></div>
                </div>
                <div className="cr-grid2">
                  <label>Tu nombre<input value={f.nombre} onChange={set('nombre')} required maxLength={120} autoComplete="name" /></label>
                  <label>Cargo <em>(opcional)</em><input value={f.cargo} onChange={set('cargo')} maxLength={80} autoComplete="organization-title" /></label>
                  <label>Empresa<input value={f.empresa} onChange={set('empresa')} maxLength={120} autoComplete="organization" /></label>
                </div>
                <label className="cr-check">
                  <input type="checkbox" checked={f.publicar_nombre} onChange={set('publicar_nombre')} />
                  <span>
                    Autorizo a NexCommit a publicar mi reseña con mi <b>nombre y cargo</b> en nexcommit.com.{' '}
                    <em>(opcional: si no lo marcas, la publicamos solo con el nombre de la empresa)</em>
                  </span>
                </label>

                <p className="cr-info">
                  Usamos tu reseña solo para mostrarla en nexcommit.com, después de que el equipo la revise, y no la editamos.
                  Se guarda en Supabase. Puedes pedir acceso, corrección o que la retiremos escribiendo a{' '}
                  <a href="mailto:nexcommit@gmail.com">nexcommit@gmail.com</a>. Más detalle en la{' '}
                  <Link to="/privacy">política de privacidad</Link>.
                </p>

                {error && <div className="cr-aviso error" role="alert">{error}</div>}
                <button className="nh-btn cr-btn" type="submit" disabled={enviando}>
                  {enviando ? <Loader2 className="cr-gira" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
                  {enviando ? 'Enviando…' : 'Enviar mi reseña'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
