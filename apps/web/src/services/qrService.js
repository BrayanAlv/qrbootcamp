import api from './api.js';

export const qrService = {
  // body: { qr: "<token> o <url completa>" } — solo consulta (sin marcar uso).
  async validate(qr) {
    const res = await api.post('/qr/validate', { qr });
    return res.data;
  },
  // Escaneo unificado (autenticado): valida + marca primer uso de forma atómica
  // + registra el intento. Devuelve el body: { success, data: { invitationId, guest, ... } }.
  // Los errores usan los mismos códigos que /validate (INVALID_QR, QR_EXPIRED, QR_ALREADY_USED).
  async scan(qr) {
    const res = await api.post('/qr/scan', { qr });
    return res.data;
  },
};

export default qrService;