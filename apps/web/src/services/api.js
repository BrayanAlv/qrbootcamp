import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost/api/v1';

// Canal entre pestañas del mismo origen: coordina el refresh del token para que
// dos pestañas abiertas con el mismo usuario no compitan por la única cookie.
const RT_CHANNEL = 'qr:auth-refresh';
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(RT_CHANNEL) : null;

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // envía la cookie del refresh token
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Proveedores inyectados desde el store de auth (evitan dependencia circular).
let getAccessToken = () => null;
let setAccessToken = () => {};
let onAuthNeeded = () => {};
let onRefreshToken = async () => null;
let refreshing = null;
let remoteResolvers = [];

export function configureAuth({ accessTokenGetter, accessTokenSetter, refreshHandler, authFailureHandler }) {
  if (accessTokenGetter) getAccessToken = accessTokenGetter;
  if (accessTokenSetter) setAccessToken = accessTokenSetter;
  if (refreshHandler) onRefreshToken = refreshHandler;
  if (authFailureHandler) onAuthNeeded = authFailureHandler;
}

// Un token válido guardado en otra pestaña se propaga a las demás.
channel?.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg?.type !== 'auth:token' && msg?.type !== 'auth:failed') return;
  if (msg.type === 'auth:token' && msg.accessToken) setAccessToken(msg.accessToken);
  const result = msg.type === 'auth:token' && msg.accessToken ? msg.accessToken : null;
  remoteResolvers.splice(0).forEach((resolve) => resolve(result));
});

// Promise que resuelve si otra pestaña emite un token (o null tras un timeout).
function waitForRemoteToken(timeoutMs = 12000) {
  if (!channel) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timeout = setTimeout(() => finalize(null), timeoutMs);
    const finalize = (value) => {
      clearTimeout(timeout);
      const i = remoteResolvers.indexOf(finalize);
      if (i !== -1) remoteResolvers.splice(i, 1);
      resolve(value);
    };
    remoteResolvers.push(finalize);
  });
}

async function doRefresh() {
  try {
    const newToken = await onRefreshToken();
    if (newToken) {
      setAccessToken(newToken);
      channel?.postMessage({ type: 'auth:token', accessToken: newToken });
    } else {
      channel?.postMessage({ type: 'auth:failed' });
    }
    return newToken;
  } catch (err) {
    channel?.postMessage({ type: 'auth:failed' });
    throw err;
  }
}

// Obtiene un token nuevo: espera a una pestaña que ya esté refrescando o lo hace local.
function obtainNewToken() {
  if (refreshing) return refreshing;
  const remote = waitForRemoteToken();
  refreshing = doRefresh().finally(() => {
    refreshing = null;
  });
  return Promise.race([refreshing, remote]);
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

    if (error?.response?.status !== 401 || original?._authHandled) {
      return Promise.reject(error);
    }
    original._authHandled = true;

    // Reintento del propio /refresh: si otra pestaña rotó la cookie (hay una sola
    // por dominio), el segundo intento ya envía el token nuevo y tiene éxito.
    if (isAuthBootstrap && !original._refreshRetried) {
      original._refreshRetried = true;
      return api(original);
    }
    if (isAuthBootstrap) {
      return Promise.reject(error);
    }

    try {
      const newToken = await obtainNewToken();
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