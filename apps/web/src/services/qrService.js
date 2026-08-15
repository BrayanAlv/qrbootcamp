import api from './api.js';

export const qrService = {
  // body: { qr: "<token> o <url completa>" }
  async validate(qr) {
    const res = await api.post('/qr/validate', { qr });
    return res.data;
  },
};

export default qrService;