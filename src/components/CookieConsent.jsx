import React, { useState } from 'react';
import { Link } from 'react-router-dom';

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
}

export default function CookieConsent() {
  const [open, setOpen] = useState(() => !readChoice());

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
      <p className="text-brand-muted leading-relaxed">
        Usamos cookies de Google Analytics y Google Ads para medir las visitas y saber qué anuncios
        funcionan. Solo se activan si las aceptas. Más detalle en nuestra{' '}
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
