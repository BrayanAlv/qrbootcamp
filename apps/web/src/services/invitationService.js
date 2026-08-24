import api, { extractData } from './api.js';

export const invitationService = {
  async list() {
    const res = await api.get('/invitations');
    return extractData(res) ?? [];
  },
  // params: { status, q, page, limit } → { items, total, page, limit }
  async listSent(params = {}) {
    const query = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null),
    );
    const res = await api.get('/invitations/sent', { params: query });
    return extractData(res) ?? { items: [], total: 0, page: 1, limit: 25 };
  },
  async stats() {
    const res = await api.get('/invitations/stats');
    return extractData(res) ?? { total: 0, sinEnviar: 0, porEstado: {} };
  },
  // Padrón global de personas y su estatus (roles de escaneo/lectura).
  // params: { status, q, page, limit } → { items, total, page, limit }
  async listRegistry(params = {}) {
    const query = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null),
    );
    const res = await api.get('/invitations/registry', { params: query });
    return extractData(res) ?? { items: [], total: 0, page: 1, limit: 25 };
  },
  async importExcel(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post('/invitations/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return extractData(res);
  },
  async create(payload) {
    const res = await api.post('/invitations', payload);
    return extractData(res);
  },
  async sendAll() {
    const res = await api.post('/invitations/send');
    return extractData(res);
  },
  async sendStatus() {
    const res = await api.get('/invitations/send/status');
    return extractData(res);
  },
  async sendOne(id) {
    const res = await api.post(`/invitations/${id}/send`);
    return extractData(res);
  },
  // Reenvío forzado: genera un QR nuevo e invalida el anterior.
  async resendOne(id) {
    const res = await api.post(`/invitations/${id}/resend`);
    return extractData(res);
  },
  async remove(id) {
    const res = await api.delete(`/invitations/${id}`);
    return extractData(res);
  },
  async accept(id, token) {
    const res = await api.post(`/invitations/${id}/accept`, { token });
    return extractData(res);
  },
  // Historial de intentos de escaneo de una invitación.
  // params: { page, limit } → { items, total, page, limit }
  async scanHistory(id, params = {}) {
    const query = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null),
    );
    const res = await api.get(`/invitations/${id}/scan-history`, { params: query });
    return extractData(res) ?? { items: [], total: 0, page: 1, limit: 100 };
  },
  // Exportación Excel (admin). Descarga el blob con las cabeceras de auth del
  // interceptor de axios (Bearer) y dispara la descarga del archivo .xlsx.
  async exportExcel({ filename = 'auditoria-escaneos.xlsx' } = {}) {
    const res = await api.get('/invitations/registry/export.xlsx', { responseType: 'blob' });
    const disposition = res.headers?.['content-disposition'] ?? '';
    const match = /filename="([^"]+)"/.exec(disposition);
    const name = match?.[1] ?? filename;
    saveBlob(res.data, name);
    return name;
  },
};

// Dispara la descarga de un Blob como archivo.
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default invitationService;