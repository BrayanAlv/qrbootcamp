import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/ApiError.js';
import { sendInvitationEmails, startPendingEmailsBatch, getBatchStatus } from '../services/email.service.js';
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

// Lanza (o reengancha) el batch de envío pendiente; no espera a que termine.
export const sendAll = asyncHandler(async (req, res) => {
  if (!req.auth?.userId) {
    throw new AppError({ code: 'UNAUTHORIZED', message: 'Autenticación requerida', httpStatus: 401 });
  }
  const state = await startPendingEmailsBatch(req.auth.userId);
  return res.status(200).json({ success: true, data: state });
});

export const sendStatus = asyncHandler(async (req, res) => {
  if (!req.auth?.userId) {
    throw new AppError({ code: 'UNAUTHORIZED', message: 'Autenticación requerida', httpStatus: 401 });
  }
  const state = await getBatchStatus(req.auth.userId);
  return res.status(200).json({ success: true, data: state });
});

export default { sendInvitation, resendInvitation, sendAll, sendStatus };