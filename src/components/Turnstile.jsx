// Captcha de Cloudflare Turnstile (Creador y formulario de contacto). Sin
// VITE_TURNSTILE_SITE_KEY no se dibuja (el back también lo omite sin secreto).
// Solo toca window dentro de useEffect: se puede prerenderizar.
import { useEffect, useRef } from 'react';
import { TURNSTILE_SITE_KEY } from '../config/creador';

let carga;
function cargarTurnstile() {
  if (!carga) {
    carga = new Promise((resolve, reject) => {
      if (window.turnstile) return resolve(window.turnstile);
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => {
        carga = null;
        reject(new Error('captcha'));
      };
      document.head.appendChild(s);
    });
  }
  return carga;
}

/** `version` cambia para pedir un captcha nuevo (después de un error). */
export default function Turnstile({ onToken, version, className = 'cr-captcha' }) {
  const ref = useRef(null);
  const cb = useRef(onToken);
  useEffect(() => {
    cb.current = onToken;
  });

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return undefined;
    let id;
    let vivo = true;
    cargarTurnstile()
      .then((ts) => {
        if (!vivo || !ref.current) return;
        id = ts.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          language: 'es',
          callback: (t) => cb.current(t),
          'expired-callback': () => cb.current(''),
          'error-callback': () => cb.current(''),
        });
      })
      .catch(() => cb.current(''));
    return () => {
      vivo = false;
      if (id !== undefined && window.turnstile) window.turnstile.remove(id);
    };
  }, [version]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className={className} />;
}
