import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session on mount
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const res = await fetch('https://ut8vwhk6.functions.insforge.app/check-admin');
      const data = await res.json();
      if (data.isAdmin) {
        setUser(data.user);
      }
    } catch (e) {
      console.error('Session check failed', e);
    } finally {
      setLoading(false);
    }
  }

  const login = async () => {
    // Redirect to Insforge login page
    window.location.href = 'https://insforge.dev/login';
  };

  const logout = async () => {
    setUser(null);
    // Call Insforge logout if applicable
    window.location.href = 'https://insforge.dev/logout';
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
