import api, { extractData } from './api.js';

export const usersService = {
  async list() {
    const res = await api.get('/users');
    return extractData(res) ?? [];
  },
  async create(payload) {
    const res = await api.post('/users', payload);
    return extractData(res);
  },
  async update(id, patch) {
    const res = await api.patch(`/users/${id}`, patch);
    return extractData(res);
  },
};

export default usersService;