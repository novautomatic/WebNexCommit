import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Loader2, ShieldCheck } from 'lucide-react';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient';
import { formatearFecha } from '../hooks/tareas';
import './home.css';
import './creador/creador.css';

// Landing of the "primer correo" sent to clients from /admin → Tareas → Clientes.
// The link (?c=<client id>&t=<signed token>) loads the client's data so they can
// review it, accept the policies (required) and opt in to promotions (optional).
// Same link works later to change preferences or unsubscribe.
// RPCs: consentimiento_ver / consentimiento_guardar (migration 20261015121000).

const mensajeError = (err) => err?.message || 'No pudimos cargar tus datos. Intenta de nuevo en un rato.';

export default function ConfirmarDatos() {
  const [params] = useSearchParams();
  const cliente = params.get('c');
  const token = params.get('t');
  const [estado, setEstado] = useState(cliente && token ? 'cargando' : 'invalido');
  const [error, setError] = useState('');
  const [inicial, setInicial] = useState(null);
  const [f, setF] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(null);

  useEffect(() => {
    if (!cliente || !token) return;
    supabase.rpc('consentimiento_ver', { p_cliente: cliente, p_token: token }).then(({ data, error: err }) => {
      if (err) {
        setError(mensajeError(err));
        setEstado('invalido');
        return;
      }
      setInicial(data);
      setF({
        nombre: data.nombre || '',
        empresa: data.empresa || '',
        email: data.email || '',
        telefono: data.telefono || '',
        acepta_politicas: data.acepta_politicas,
        acepta_marketing: data.acepta_marketing,
      });
      setEstado('form');
    });
  }, [cliente, token]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.acepta_politicas) return setError('Para continuar acepta los términos y la política de privacidad.');
    setEnviando(true);
    const { data, error: err } = await supabase.rpc('consentimiento_guardar', {
      p_cliente: cliente,
      p_token: token,
      p_datos: { nombre: f.nombre, empresa: f.empresa, email: f.email, telefono: f.telefono },
      p_acepta_politicas: f.acepta_politicas,
      p_acepta_marketing: f.acepta_marketing,
    });
    setEnviando(false);
    if (err) return setError(mensajeError(err));
    setListo({ nombre: f.nombre.split(' ')[0], marketing: data?.acepta_marketing });
  };

  return (
    <div className="nh">
      <SEO
        title="Confirma tus datos | NexCommit"
        description="Revisa tus datos y elige cómo quieres que NexCommit se comunique contigo."
        canonicalUrl="https://www.nexcommit.com/confirmar-datos"
        noIndex
      />
      <section className="ctw-hero">
        <div className="nh-wrap ctw-grid">
          <div>
            <div className="ctw-badge"><ShieldCheck aria-hidden="true" /> Clientes NexCommit</div>
            <h1>Confirma tus datos y elige <em>cómo hablamos contigo</em>.</h1>
            <p className="nh-lead">
              Revisa la información que tenemos de ti, corrígela si hace falta y cuéntanos si quieres recibir nuestras
              novedades. Toma menos de un minuto.
            </p>
            <ul className="ctw-lista">
              <li><Check aria-hidden="true" /> Tus datos solo los usa el equipo NexCommit</li>
              <li><Check aria-hidden="true" /> Las promociones son opcionales</li>
              <li><Check aria-hidden="true" /> Puedes cambiar tu decisión desde este mismo enlace cuando quieras</li>
            </ul>
          </div>

          <div className="cr">
            {estado === 'cargando' && (
              <p className="cr-info" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Loader2 className="cr-gira" aria-hidden="true" style={{ width: 18 }} /> Cargando tus datos…
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

            {estado === 'form' && listo && (
              <div className="cr-form">
                <div className="cr-paso-tit">
                  <span className="cr-num"><Check aria-hidden="true" style={{ width: 18 }} /></span>
                  <div>
                    <h3>¡Listo{listo.nombre ? `, ${listo.nombre}` : ''}!</h3>
                    <p>
                      {listo.marketing
                        ? 'Guardamos tus datos y te enviaremos nuestras novedades y promociones. Puedes darte de baja desde este enlace o desde cualquiera de nuestros correos.'
                        : 'Guardamos tus datos. No te enviaremos promociones; solo te escribiremos por temas de tus proyectos con nosotros.'}
                    </p>
                  </div>
                </div>
                <Link className="nh-btn cr-btn" to="/">Ir a nexcommit.com <ArrowRight aria-hidden="true" /></Link>
              </div>
            )}

            {estado === 'form' && !listo && (
              <form className="cr-form" onSubmit={enviar} noValidate>
                <div className="cr-paso-tit">
                  <span className="cr-num">1</span>
                  <div><h3>Tus datos</h3><p>Revísalos y corrige lo que no esté bien.</p></div>
                </div>
                <div className="cr-grid2">
                  <label>Tu nombre<input value={f.nombre} onChange={set('nombre')} required maxLength={120} autoComplete="name" /></label>
                  <label>Empresa<input value={f.empresa} onChange={set('empresa')} maxLength={120} autoComplete="organization" /></label>
                  <label>Correo<input type="email" value={f.email} onChange={set('email')} required maxLength={120} autoComplete="email" /></label>
                  <label>Teléfono<input type="tel" value={f.telefono} onChange={set('telefono')} maxLength={30} autoComplete="tel" /></label>
                </div>

                <p className="cr-info">
                  Usamos estos datos para coordinar tus proyectos y el soporte con NexCommit. Se guardan en Supabase y los
                  correos se envían con Google (Gmail). No los compartimos con terceros para fines comerciales. Puedes pedir
                  acceso, corrección, eliminación, oposición, portabilidad o bloqueo escribiendo a{' '}
                  <a href="mailto:nexcommit@gmail.com">nexcommit@gmail.com</a>. Más detalle en la{' '}
                  <Link to="/privacy">política de privacidad</Link>.
                </p>

                <label className="cr-check">
                  <input type="checkbox" checked={f.acepta_politicas} onChange={set('acepta_politicas')} disabled={inicial.acepta_politicas} />
                  <span>
                    Acepto los <Link to="/terms">términos</Link> y la <Link to="/privacy">política de privacidad</Link>.{' '}
                    <em>{inicial.acepta_politicas ? `(aceptado el ${formatearFecha(inicial.acepta_politicas_at)})` : '(obligatorio)'}</em>
                  </span>
                </label>
                <label className="cr-check">
                  <input type="checkbox" checked={f.acepta_marketing} onChange={set('acepta_marketing')} />
                  <span>Quiero recibir novedades y promociones de los servicios de NexCommit por correo. <em>(opcional, puedes darte de baja cuando quieras)</em></span>
                </label>

                {error && <div className="cr-aviso error" role="alert">{error}</div>}
                <button className="nh-btn cr-btn" type="submit" disabled={enviando}>
                  {enviando ? <Loader2 className="cr-gira" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
                  {enviando ? 'Guardando…' : inicial.acepta_politicas ? 'Guardar mis preferencias' : 'Confirmar y continuar'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
