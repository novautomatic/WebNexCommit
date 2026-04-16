import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

const supabase = createClient(
  'https://rhifvtrzetamrfhflfzw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaWZ2dHJ6ZXRhbXJmaGZsZnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDIzOTEsImV4cCI6MjA5MTkxODM5MX0.BDmWZeePQyIqTPquqwNbRmAMYvLu5-DEPL7feIamA-k'
);

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check session on mount
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    } catch (e) {
      console.error('Session check failed', e);
    } finally {
      setLoading(false);
    }
  }

  const login = async (email, password) => {
    console.log('Login function called with email:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log('Login response:', { data, error });
      if (error) {
        console.error('Login error:', error);
        throw error;
      }
      if (data.user) {
        console.log('Setting user:', data.user);
        setUser(data.user);
        // Redirect to admin panel after successful login using React Router
        navigate('/ncadmin');
      }
    } catch (e) {
      console.error('Login failed', e);
      throw e;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      navigate('/login');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
