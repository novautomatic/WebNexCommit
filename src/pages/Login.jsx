import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { Lock, Mail } from 'lucide-react';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch {
      setError('Error al iniciar sesión. Verifica tus credenciales.');
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setSending(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
    if (resetError && resetError.status === 429) {
      setError('Demasiados intentos. Espera unos minutos y vuelve a intentarlo.');
      return;
    }
    // Same message whether or not the email exists, so the form can't be used to probe accounts.
    setNotice('Si ese correo tiene acceso, te llegará un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.');
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-white outline-none focus:border-brand-light transition-colors';

  return (
    <>
      <SEO
        title="Acceso Administrativo - NexCommit"
        description="Panel de acceso exclusivo para administradores de NexCommit."
        noIndex={true}
        canonicalUrl="https://nexcommit.com/login"
      />
      <div className="container py-32 flex items-center justify-center min-h-screen">
      <div className="max-w-md w-full p-10 rounded-3xl glass-dark border-white/10">
        <div className="w-16 h-16 bg-brand/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-brand-light" />
        </div>
        <h1 className="text-3xl font-semibold text-white mb-2 text-center">
          {mode === 'login' ? 'Acceso Restringido' : 'Recuperar contraseña'}
        </h1>
        <p className="text-brand-muted mb-8 text-center">
          {mode === 'login'
            ? 'Este panel es exclusivo para administradores de NexCommit.'
            : 'Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.'}
        </p>
        <form onSubmit={mode === 'login' ? handleSubmit : handleForgot} className="space-y-4">
          <div>
            <label className="block text-sm text-brand-muted mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>
          {mode === 'login' && (
            <div>
              <label className="block text-sm text-brand-muted mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            </div>
          )}
          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}
          {notice && (
            <div className="text-brand-light text-sm text-center">{notice}</div>
          )}
          <button
            type="submit"
            disabled={sending}
            className="btn btn-brand w-full py-4 disabled:opacity-60"
          >
            {mode === 'login' ? 'Iniciar Sesión' : sending ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => switchMode(mode === 'login' ? 'forgot' : 'login')}
          className="mt-6 w-full text-sm text-brand-muted hover:text-white transition-colors"
        >
          {mode === 'login' ? '¿Olvidaste tu contraseña?' : 'Volver a iniciar sesión'}
        </button>
      </div>
    </div>
    </>
  );
}
