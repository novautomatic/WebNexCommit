import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

// List of authorized admin emails
const ADMIN_EMAILS = [
  'stephaniabilbao@gmail.com',
  'jpa.pizarro@gmail.com',
  'fabianignacio.tm@gmail.com',
];

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  console.log('ProtectedRoute - user:', user, 'loading:', loading);

  if (loading) {
    return (
      <div className="container py-32 flex items-center justify-center min-h-screen">
        <div className="text-white text-xl animate-pulse">Verificando permisos...</div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute - No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check if user email is in admin list
  const userEmail = user.email;
  console.log('ProtectedRoute - User email:', userEmail);
  
  if (!ADMIN_EMAILS.includes(userEmail)) {
    console.log('ProtectedRoute - User not authorized, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return children;
}
