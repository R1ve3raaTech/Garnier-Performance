import { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const loadFromStorage = () => {
  try {
    const token        = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const user          = JSON.parse(localStorage.getItem('user') ?? 'null');
    return token && user ? { token, refreshToken, user } : { token: null, refreshToken: null, user: null };
  } catch {
    return { token: null, refreshToken: null, user: null };
  }
};

export const AuthProvider = ({ children }) => {
  const initial = loadFromStorage();
  const [token, setToken] = useState(initial.token);
  const [user,  setUser]  = useState(initial.user);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    const { token: newToken, refreshToken, user: userData } = data.data;

    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setToken(newToken);
    setUser(userData);

    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
