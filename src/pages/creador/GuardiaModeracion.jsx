// Moderación del Creador en pantalla: advertencia (1 y 2 de 2) y, a la tercera
// infracción, una pantalla roja fija que tapa todo (creador, editor y panel de
// la tienda). El backend es el que bloquea de verdad; esto solo lo muestra.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { OctagonAlert, TriangleAlert } from 'lucide-react';
import { bloqueoGuardado, escucharModeracion } from '../../config/creador';
import { WHATSAPP_NUMBER } from '../../config/contact';

const MENSAJE_BLOQUEO = 'Tu cuenta fue bloqueada por intentar publicar contenido prohibido. Ya no puedes editar tu página ni ingresar a tu cuenta.';

function PantallaBloqueo({ mensaje }) {
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Nada detrás de la pantalla roja recibe foco ni clics.
    const otros = [...document.body.children].filter((n) => !n.hasAttribute('data-guardia'));
    otros.forEach((n) => n.setAttribute('inert', ''));
    return () => {
      document.body.style.overflow = previo;
      otros.forEach((n) => n.removeAttribute('inert'));
    };
  }, []);

  return (
    <div
      data-guardia=""
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="guardia-titulo"
      aria-describedby="guardia-texto"
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483647, background: '#b3121b',
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,.08) 0 18px, transparent 18px 36px)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        fontFamily: 'inherit', textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 560 }}>
        <OctagonAlert aria-hidden="true" style={{ width: 88, height: 88, margin: '0 auto 20px', display: 'block' }} />
        <p style={{ letterSpacing: '.18em', textTransform: 'uppercase', fontSize: 13, fontWeight: 700, opacity: 0.85, margin: '0 0 8px' }}>
          Alerta de seguridad
        </p>
        <h1 id="guardia-titulo" style={{ fontSize: 'clamp(28px, 6vw, 42px)', lineHeight: 1.1, fontWeight: 800, margin: '0 0 16px' }}>
          Cuenta bloqueada
        </h1>
        <p id="guardia-texto" style={{ fontSize: 17, lineHeight: 1.55, margin: '0 0 22px' }}>
          {mensaje || MENSAJE_BLOQUEO}
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.85, margin: 0 }}>
          Intentaste publicar contenido obsceno, sexual, violento o discriminatorio tres veces, después de dos advertencias.
          Tu página quedó suspendida. Si crees que es un error, escríbenos por{' '}
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontWeight: 700 }}>
            WhatsApp
          </a>.
        </p>
      </div>
    </div>
  );
}

function Advertencia({ aviso, onCerrar }) {
  const ultima = aviso.n >= aviso.max;
  return (
    <div
      data-guardia=""
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="advertencia-titulo"
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483646, background: 'rgba(7,27,49,.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
        maxWidth: 480, width: '100%', background: '#fff', color: '#16202b', borderRadius: 18, overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,.35)', fontFamily: 'inherit',
      }}
      >
        <div style={{ background: ultima ? '#b3121b' : '#d97706', color: '#fff', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <TriangleAlert aria-hidden="true" style={{ width: 30, height: 30, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.9 }}>
              {ultima ? 'Última advertencia' : 'Advertencia'}
            </div>
            <h2 id="advertencia-titulo" style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
              Advertencia {aviso.n || 1} de {aviso.max || 2}
            </h2>
          </div>
        </div>
        <div style={{ padding: '20px 22px' }}>
          <p style={{ margin: '0 0 18px', lineHeight: 1.55, fontSize: 15 }}>{aviso.mensaje}</p>
          <button
            type="button"
            autoFocus
            onClick={onCerrar}
            style={{
              width: '100%', border: 0, borderRadius: 999, padding: '12px 18px', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              background: ultima ? '#b3121b' : '#071b31', color: '#fff',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GuardiaModeracion() {
  const [bloqueo, setBloqueo] = useState(null); // null | string (mensaje)
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    // Después de hidratar (no en el render): la página se prerenderiza sin window.
    let vivo = true;
    Promise.resolve().then(() => vivo && setBloqueo(bloqueoGuardado()));
    const dejar = escucharModeracion((d) => {
      if (d.tipo === 'bloqueado') setBloqueo(d.mensaje || '');
      else if (d.tipo === 'desbloqueado') setBloqueo(null);
      else if (d.tipo === 'advertencia') setAviso(d);
    });
    return () => {
      vivo = false;
      dejar();
    };
  }, []);

  if (bloqueo !== null) return createPortal(<PantallaBloqueo mensaje={bloqueo} />, document.body);
  if (aviso) return createPortal(<Advertencia aviso={aviso} onCerrar={() => setAviso(null)} />, document.body);
  return null;
}
