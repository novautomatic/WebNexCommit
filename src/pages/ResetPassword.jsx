import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Lock } from 'lucide-react';
import SEO from '../components/SEO';
import { useAuth } from '../components/AuthContext';
import { supabase } from '../lib/supabaseClient';

// Landing page for the Supabase password-recovery link. The link signs the
// user in with a temporary session; here they choose the new password.
export default function ResetPassword() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError('No se pudo guardar la contraseña. Pide un enlace nuevo e inténtalo otra vez.');
      return;
    }
    navigate('/admin', { replace: true });
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-white outline-none focus:border-brand-light transition-colors';

  return (
    <>
      <SEO
        title="Nueva contraseña - NexCommit"
        description="Crea una contraseña nueva para el panel de NexCommit."
        noIndex={true}
        canonicalUrl="https://nexcommit.com/reset-password"
      />
      <div className="container py-32 flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full p-10 rounded-3xl glass-dark border-white/10">
          <div className="w-16 h-16 bg-brand/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <KeyRound className="w-8 h-8 text-brand-light" />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2 text-center">Nueva contraseña</h1>

          {loading ? (
            <p className="text-brand-muted text-center animate-pulse">Verificando enlace…</p>
          ) : !user ? (
            <div className="text-center">
              <p className="text-brand-muted mb-6">
                El enlace no es válido o ya expiró. Pide uno nuevo desde la pantalla de acceso.
              </p>
              <Link to="/login" className="btn btn-brand w-full py-4">
                Ir al acceso
              </Link>
            </div>
          ) : (
            <>
              <p className="text-brand-muted mb-8 text-center">
                Cuenta: <span className="text-white">{user.email}</span>
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-brand-muted mb-2">Contraseña nueva</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-brand-muted mb-2">Repite la contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
                {error && <div className="text-red-400 text-sm text-center">{error}</div>}
                <button type="submit" disabled={saving} className="btn btn-brand w-full py-4 disabled:opacity-60">
                  {saving ? 'Guardando…' : 'Guardar y entrar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
