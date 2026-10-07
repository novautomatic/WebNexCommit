import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check session on mount
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Opened from a "reset password" email: send them to choose a new one.
        setUser(session?.user ?? null);
        navigate('/reset-password', { replace: true });
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refreshed successfully
        setUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // User signed out or deleted
        setUser(null);
      } else if (event === 'SIGNED_IN') {
        // User signed in
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // Subscribe once; `navigate` changes identity on every route change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session check error:', error);
        setUser(null);
      } else {
        setUser(session?.user ?? null);
      }
    } catch (e) {
      console.error('Session check failed', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
    if (data.user) {
      setUser(data.user);
      // Redirect to blog admin panel after successful login using React Router
      navigate('/admin');
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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
