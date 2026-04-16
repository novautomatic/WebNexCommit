import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container py-32 flex items-center justify-center min-h-screen">
        <div className="text-white text-xl animate-pulse">Verificando permisos...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
