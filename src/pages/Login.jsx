import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { Lock, Mail } from 'lucide-react';
import SEO from '../components/SEO';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch {
      setError('Error al iniciar sesión. Verifica tus credenciales.');
    }
  };

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
        <h1 className="text-3xl font-semibold text-white mb-2 text-center">Acceso Restringido</h1>
        <p className="text-brand-muted mb-8 text-center">
          Este panel es exclusivo para administradores de NexCommit.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-brand-muted mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-white outline-none focus:border-brand-light transition-colors"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-brand-muted mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-white outline-none focus:border-brand-light transition-colors"
                required
              />
            </div>
          </div>
          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}
          <button
            type="submit"
            className="btn btn-brand w-full py-4"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
    </>
  );
}
