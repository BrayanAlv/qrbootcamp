import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/ApiError.js';
import { Invitation } from '../models/Invitation.model.js';
import { importInvitationsFromExcel } from '../services/invitationImport.service.js';
import {
  listReceivedInvitations,
  listSentInvitations,
  getSentStats,
  deleteInvitation,
  acceptInvitation,
} from '../services/invitation.service.js';
import { audit } from '../services/audit.service.js';

// Alta manual: mismas reglas que una fila de Excel (ya validadas/normalizadas
// por `createInvitationSchema` antes de llegar acá).
export const createInvitation = asyncHandler(async (req, res) => {
  const { region, crmId, nombre, sede, asiste, email, emailCc } = req.body;
  const sender = req.auth.userId;

  const exists = await Invitation.findOne({ crmId, sender });
  if (exists) {
    throw new AppError({ code: 'VALIDATION_ERROR', message: 'Ya existe un invitado con ese ID CRM', httpStatus: 409 });
  }

  const inv = await Invitation.create({
    sender,
    crmId,
    region,
    sede,
    asiste,
    guest: { name: nombre, email },
    ccEmail: emailCc || null,
    status: 'pendiente',
    emailStatus: { attendee: false },
  });
  return res.status(201).json({ success: true, data: inv });
});

export const importInvitations = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError({ code: 'VALIDATION_ERROR', message: 'Adjunta un archivo Excel', httpStatus: 400 });
  }
  const result = await importInvitationsFromExcel({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    senderId: req.auth.userId,
  });
  return res.status(200).json({ success: true, data: result });
});

export const listInvitations = asyncHandler(async (req, res) => {
  const list = await listReceivedInvitations(req.user.email);
  return res.status(200).json({ success: true, data: list });
});

export const listSent = asyncHandler(async (req, res) => {
  const { status, q, page, limit } = req.query;
  const result = await listSentInvitations(req.user._id, { status, q, page, limit });
  return res.status(200).json({ success: true, data: result });
});

export const stats = asyncHandler(async (req, res) => {
  const data = await getSentStats(req.user._id);
  return res.status(200).json({ success: true, data });
});

export const removeInvitation = asyncHandler(async (req, res) => {
  const removed = await deleteInvitation({ invitationId: req.params.id, senderId: req.user._id });
  await audit('invitation_deleted', {
    userId: req.user?._id,
    email: req.user?.email,
    ip: req.ip,
    meta: { invitationId: removed.id, guest: removed.guest },
  });
  return res.status(200).json({ success: true, data: { id: removed.id } });
});

export const accept = asyncHandler(async (req, res) => {
  try {
    const inv = await acceptInvitation({ invitationId: req.params.id, token: req.body.token });
    await audit('invitation_accepted', { userId: req.user?._id, email: req.user?.email, ip: req.ip, meta: { invitationId: inv._id } });
    return res.status(200).json({
      success: true,
      data: { invitationId: inv._id, status: inv.status, acceptedAt: inv.acceptedAt },
    });
  } catch (error) {
    if (['QR_ALREADY_USED', 'QR_EXPIRED', 'INVALID_QR', 'INVITATION_NOT_AVAILABLE'].includes(error.code)) {
      await audit('qr_used_attempt', { userId: req.user?._id, ip: req.ip, meta: { invitationId: req.params.id, code: error.code } });
    }
    throw error;
  }
});

export default { createInvitation, importInvitations, listInvitations, listSent, stats, removeInvitation, accept };