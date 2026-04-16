import React from 'react';
import { useAuth } from '../components/AuthContext';
import { Lock } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="container py-32 flex items-center justify-center min-h-screen">
      <div className="max-w-md w-full p-10 rounded-3xl glass-dark border-white/10 text-center">
        <div className="w-16 h-16 bg-brand/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-brand-light" />
        </div>
        <h1 className="text-3xl font-semibold text-white mb-4">Acceso Restringido</h1>
        <p className="text-brand-muted mb-8">
          Este panel es exclusivo para administradores de NexCommit.
        </p>
        <button
          onClick={login}
          className="btn btn-brand w-full py-4"
        >
          Iniciar Sesión con GitHub
        </button>
      </div>
    </div>
  );
}
