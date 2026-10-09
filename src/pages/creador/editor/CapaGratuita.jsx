// Mensaje cuando se acaban las ediciones gratuitas (de IA o manuales): celebra
// lo que hizo el cliente e invita a seguir con NexCommit. Se usa como ventana
// emergente (al momento de agotarse) y como tarjeta fija en el panel.
import React, { useEffect } from 'react';
import { MessageCircle, PartyPopper, X } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../../../config/contact';

// Neutros a propósito: no sabemos el género de quien edita.
const TITULOS = ['¡Cuánta creatividad!', '¡Qué buenas ideas!', '¡Se nota que le pusiste cariño!'];

function titulo(slug) {
  const n = [...String(slug)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return TITULOS[n % TITULOS.length];
}

function texto(tipo, { maxManual, maxIA, quedanManual, quedanIA }) {
  if (tipo === 'ia') {
    const resto = quedanManual > 0
      ? ` Todavía puedes editarla a mano: te ${quedanManual === 1 ? 'queda 1 publicación' : `quedan ${quedanManual} publicaciones`}.`
      : '';
    return `Ya usaste los ${maxIA} pedidos a la IA de la versión gratuita.${resto}`;
  }
  const resto = quedanIA > 0
    ? ` Aún puedes pedirle ${quedanIA === 1 ? '1 cambio' : `${quedanIA} cambios`} a la IA.`
    : '';
  return `Ya usaste las ${maxManual} ediciones de la versión gratuita y tu maqueta quedó publicada tal como la dejaste.${resto}`;
}

export default function CapaGratuita({ tipo, slug, url, datos, modal = false, onCerrar }) {
  useEffect(() => {
    if (!modal) return undefined;
    const esc = (e) => e.key === 'Escape' && onCerrar?.();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [modal, onCerrar]);

  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola! Usé las ediciones gratis de mi maqueta ${url.replace('https://www.', '')} y quiero seguir editándola con ustedes.`,
  )}`;

  const caja = (
    <div className={`ed-capa ${modal ? 'ed-capa-modal' : ''}`}>
      {modal && <button type="button" className="ed-capa-x" onClick={onCerrar} aria-label="Cerrar"><X /></button>}
      <div className="ed-capa-ic"><PartyPopper aria-hidden="true" /></div>
      <h3>{titulo(slug)}</h3>
      <p>{texto(tipo, datos)}</p>
      <p className="ed-capa-fin"><b>Se acabó la capa gratuita.</b> Escríbenos y seguimos construyendo tu página juntos: más cambios, tu propio dominio y todo lo que necesites.</p>
      <a className="ed-capa-btn" href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" /> Seguir editando con NexCommit</a>
      {modal && <button type="button" className="ed-link" onClick={onCerrar}>Ahora no</button>}
    </div>
  );

  if (!modal) return caja;
  return (
    <div className="ed-modal" role="dialog" aria-modal="true" aria-label="Se acabó la capa gratuita" onMouseDown={(e) => e.target === e.currentTarget && onCerrar?.()}>
      {caja}
    </div>
  );
}
