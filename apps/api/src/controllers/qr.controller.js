import asyncHandler from '../utils/asyncHandler.js';
import { validateQrToken } from '../services/qrValidate.service.js';
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

export default { validateQr };