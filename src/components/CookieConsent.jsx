import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CLARITY_ID, activarClarity } from '../lib/clarity';

// Cookie consent for GA4 + Google Ads (Consent Mode v2).
// index.html starts every storage type as 'denied'; this banner flips it to
// 'granted' only after the visitor accepts. The choice is kept in localStorage.
const STORAGE_KEY = 'nc_cookie_consent';

function readChoice() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function applyChoice(choice) {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* storage unavailable — the choice lasts only for this visit */
  }
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: choice,
      ad_storage: choice,
      ad_user_data: choice,
      ad_personalization: choice,
    });
  }
  if (choice === 'granted') activarClarity();
}

export default function CookieConsent() {
  // Never in the prerendered HTML (no window there); the browser decides.
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && !readChoice());

  if (!open) return null;

  const choose = (choice) => {
    applyChoice(choice);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed z-[60] inset-x-3 bottom-24 md:inset-x-auto md:left-6 md:bottom-6 md:max-w-md rounded-2xl border p-5 shadow-2xl text-sm"
      style={{
        backgroundColor: 'rgba(5, 20, 34, 0.96)',
        borderColor: 'rgba(119, 165, 210, 0.2)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      <p className="text-white font-medium mb-1">¿Nos ayudas a mejorar la web?</p>
      <p className="text-brand-muted leading-relaxed">
        Con tu permiso usamos cookies de Google Analytics, Google Ads{CLARITY_ID ? ' y Microsoft Clarity' : ''} para
        saber qué páginas sirven y qué anuncios funcionan. No vendemos tus datos y puedes cambiar de opinión
        cuando quieras desde «Cookies», al pie de la página. Más detalle en nuestra{' '}
        <Link to="/privacy" className="text-white underline underline-offset-2">
          Política de Privacidad
        </Link>
        .
      </p>
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={() => choose('granted')} className="btn-brand flex-1 justify-center">
          Aceptar
        </button>
        <button type="button" onClick={() => choose('denied')} className="btn-ghost flex-1 justify-center">
          Rechazar
        </button>
      </div>
    </div>
  );
}

/** Lets the visitor change their mind (used from the footer). */
// eslint-disable-next-line react-refresh/only-export-components
export function resetCookieConsent() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.location.reload();
}
