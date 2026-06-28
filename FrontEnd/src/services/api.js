import axios from 'axios';
import supabase from './supabaseClient';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Adjunta el access token de Supabase automáticamente en cada petición saliente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// Interceptor de respuesta: si un endpoint PROTEGIDO devuelve 401 (token vencido/inválido),
// intenta refrescar la sesión de Supabase una vez antes de cerrar sesión.
// NO aplica al endpoint de login — ese 401 lo maneja el componente.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint   = originalRequest?.url?.includes('/auth/');

    if (error.response?.status === 401 && !isAuthEndpoint && !originalRequest._retried) {
      originalRequest._retried = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        const { data, error: refreshError } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
        if (!refreshError && data.session) {
          localStorage.setItem('token', data.session.access_token);
          localStorage.setItem('refreshToken', data.session.refresh_token);
          originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
          return api(originalRequest);
        }
      }

      clearSession();
    }

    return Promise.reject(error);
  }
);

export default api;
