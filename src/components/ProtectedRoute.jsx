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
  // Vendedores y captadores (ventas_personas) van a su app, /ventas.
  const [equipo, setEquipo] = useState({ email: null, ok: false, vendedor: false });

  useEffect(() => {
    if (!user || esAdmin) return undefined;
    let vigente = true;
    Promise.all([supabase.rpc('es_equipo'), supabase.rpc('es_vendedor')]).then(([eq, ve]) => {
      if (vigente) setEquipo({ email: user.email, ok: Boolean(eq.data), vendedor: Boolean(ve.data) });
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

  // Logged in but not on the team: a client from /mi-espacio (or someone else). The
  // portal shows their space, or tells them they have none.
  if (!esAdmin && !equipo.ok && equipo.vendedor) {
    return <Navigate to="/ventas" replace />;
  }
  if (!esAdmin && !equipo.ok) {
    return <Navigate to="/mi-espacio" replace />;
  }

  return children;
}
