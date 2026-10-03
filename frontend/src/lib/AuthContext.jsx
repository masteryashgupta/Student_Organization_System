import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } catch (err) {
          setUser(null);
          localStorage.removeItem('access_token');
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { access, refresh, user: userData } = res.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    return res.data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  };

  const isAuthenticated = !!user;
  const isOfficer = user?.role === 'admin' || user?.role === 'leader' || Boolean(user?.is_staff || user?.is_superuser);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isOfficer,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
