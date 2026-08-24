import asyncHandler from '../utils/asyncHandler.js';
import { validateQrToken } from '../services/qrValidate.service.js';
import { runQrScan } from '../services/scanAudit.service.js';
import { audit } from '../services/audit.service.js';

export const validateQr = asyncHandler(async (req, res) => {
  try {
    const result = await validateQrToken(req.body.qr);
    await audit('qr_valid', { ip: req.ip, userId: req.user?._id ?? null, meta: { invitationId: result.invitationId } });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    await audit('qr_validation_failed', { ip: req.ip, meta: { code: error.code, message: error.message } });
    throw error;
  }
});

// Escaneo unificado (autenticado): valida, marca el primer uso de forma atómica
// y registra el intento en la bitácora. La identidad del operador sale de
// req.user (JWT), nunca del cuerpo de la petición.
export const scanQr = asyncHandler(async (req, res) => {
  const scanner = { user: req.user._id, name: req.user.name, email: req.user.email };
  const result = await runQrScan({ token: req.body.qr, scanner });
  await audit('qr_scanned_valid', {
    userId: req.user._id,
    email: req.user.email,
    ip: req.ip,
    meta: { invitationId: result.invitationId, attemptNumber: result.attemptNumber },
  });
  return res.status(200).json({ success: true, data: result });
});

export default { validateQr, scanQr };