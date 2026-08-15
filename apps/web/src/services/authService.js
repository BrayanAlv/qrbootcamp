import api, { extractData } from './api.js';

export const authService = {
  async login({ email, password }) {
    const res = await api.post('/auth/login', { email, password });
    return extractData(res);
  },
  async refresh() {
    // La cookie de refresh se envía automáticamente por withCredentials.
    const res = await api.post('/auth/refresh', {});
    return extractData(res);
  },
  async logout() {
    await api.post('/auth/logout');
  },
  async me() {
    const res = await api.get('/auth/me');
    return extractData(res);
  },
};

export default authService;