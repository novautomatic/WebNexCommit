import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { supabase } from '../lib/supabaseClient';

// List of authorized admin emails
const ADMIN_EMAILS = [
  'stephaniabilbao@gmail.com',
  'jpa.pizarro@gmail.com',
  'fabianignacio.tm@gmail.com',
];

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const esAdmin = Boolean(user && ADMIN_EMAILS.includes(user.email));
  // Anyone registered in the `equipo` table (tasks system) can also enter.
  const [equipo, setEquipo] = useState({ email: null, ok: false });

  useEffect(() => {
    if (!user || esAdmin) return undefined;
    let vigente = true;
    supabase.rpc('es_equipo').then(({ data }) => {
      if (vigente) setEquipo({ email: user.email, ok: Boolean(data) });
    });
    return () => {
      vigente = false;
    };
  }, [user, esAdmin]);

  const verificandoEquipo = Boolean(user && !esAdmin && equipo.email !== user.email);

  if (loading || verificandoEquipo) {
    return (
      <div className="container py-32 flex items-center justify-center min-h-screen">
        <div className="text-white text-xl animate-pulse">Verificando permisos...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!esAdmin && !equipo.ok) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
