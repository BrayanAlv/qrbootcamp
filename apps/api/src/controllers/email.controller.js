import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/ApiError.js';
import { sendInvitationEmails, sendAllPendingEmails } from '../services/email.service.js';
import { audit } from '../services/audit.service.js';

export const sendInvitation = asyncHandler(async (req, res) => {
  const result = await sendInvitationEmails(req.params.id);
  return res.status(200).json({ success: true, data: result });
});

// Reenvío forzado: emite un QR nuevo e invalida el anterior.
export const resendInvitation = asyncHandler(async (req, res) => {
  const result = await sendInvitationEmails(req.params.id, { force: true });
  await audit('invitation_resent', {
    userId: req.user?._id,
    ip: req.ip,
    meta: { invitationId: req.params.id, sent: result.sent, skipped: result.skipped ?? false },
  });
  return res.status(200).json({ success: true, data: result });
});

export const sendAll = asyncHandler(async (req, res) => {
  if (!req.auth?.userId) {
    throw new AppError({ code: 'UNAUTHORIZED', message: 'Autenticación requerida', httpStatus: 401 });
  }
  const results = await sendAllPendingEmails(req.auth.userId);
  const ok = results.filter((r) => r.sent > 0).length;
  const skipped = results.filter((r) => r.skipped).length;
  return res.status(200).json({
    success: true,
    data: { procesadas: results.length, enviadas: ok, omitidas: skipped, enviadasTotal: results.reduce((a, r) => a + r.sent, 0) },
  });
});

export default { sendInvitation, resendInvitation, sendAll };