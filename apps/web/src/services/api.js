import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // envía la cookie del refresh token
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Proveedores inyectados desde el store de auth (evitan dependencia circular).
let getAccessToken = () => null;
let onAuthNeeded = () => {};
let onRefreshToken = async () => null;
let refreshing = null;

export function configureAuth({ accessTokenGetter, refreshHandler, authFailureHandler }) {
  if (accessTokenGetter) getAccessToken = accessTokenGetter;
  if (refreshHandler) onRefreshToken = refreshHandler;
  if (authFailureHandler) onAuthNeeded = authFailureHandler;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const url = original?.url ?? '';
    const isAuthBootstrap = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (error?.response?.status !== 401 || original?._retried || isAuthBootstrap) {
      return Promise.reject(error);
    }
    original._retried = true;

    try {
      if (!refreshing) {
        refreshing = onRefreshToken().finally(() => {
          refreshing = null;
        });
      }
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      onAuthNeeded();
      return Promise.reject(error);
    } catch {
      onAuthNeeded();
      return Promise.reject(error);
    }
  },
);

export function extractData(response) {
  return response?.data?.data ?? response?.data ?? null;
}

export function extractError(error) {
  const payload = error?.response?.data;
  return {
    code: payload?.error?.code ?? 'INTERNAL_ERROR',
    message: payload?.error?.message ?? error?.message ?? 'Error inesperado',
    details: payload?.error?.details ?? null,
    httpStatus: error?.response?.status ?? 0,
  };
}

export default api;