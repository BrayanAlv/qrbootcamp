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
  listRegistry,
} from '../services/invitation.service.js';
import {
  recordScanAttempt,
  statusFromQrCode,
  getScanHistory,
  SCAN_STATUS,
} from '../services/scanAudit.service.js';
import { buildRegistryWorkbook } from '../services/export.service.js';
import { audit } from '../services/audit.service.js';
import { hashToken } from '../services/qr.service.js';
import { extractQrToken } from '../validators/qr.validators.js';

// `crmId` numérico (solo dígitos) no puede repetirse; los de texto sí.
const IS_NUMERIC = /^\d+$/;

// Alta manual: mismas reglas que una fila de Excel (ya validadas/normalizadas
// por `createInvitationSchema` antes de llegar acá).
export const createInvitation = asyncHandler(async (req, res) => {
  const { region, crmId, nombre, sede, asiste, email, emailCc } = req.body;
  const sender = req.auth.userId;

  const exists =
    IS_NUMERIC.test(crmId) ? await Invitation.findOne({ crmId, sender }) : null;
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

// Padrón global de personas y sus estatus (roles de escaneo/lectura).
export const registry = asyncHandler(async (req, res) => {
  const { status, q, page, limit } = req.query;
  const result = await listRegistry({ status, q, page, limit });
  return res.status(200).json({ success: true, data: result });
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
  const scanner = { user: req.user._id, name: req.user.name, email: req.user.email };
  const tokenHash = hashToken(extractQrToken(req.body.token));

  try {
    const inv = await acceptInvitation({ invitationId: req.params.id, token: req.body.token });
    // Registra el intento válido. La aceptación atómica ya marcó `usedAt`:
    // aquí solo queda reflejarlo en la bitácora.
    const rec = await recordScanAttempt({
      invitationRef: inv,
      qrTokenHash: tokenHash,
      scanner,
      status: SCAN_STATUS.VALID,
      isFirstValid: true,
      scannedAt: inv.usedAt ?? new Date(),
    }).catch(() => null);
    await audit('invitation_accepted', { userId: req.user?._id, email: req.user?.email, ip: req.ip, meta: { invitationId: inv._id } });
    return res.status(200).json({
      success: true,
      data: { invitationId: inv._id, status: inv.status, acceptedAt: inv.acceptedAt, attemptNumber: rec?.attemptNumber ?? null },
    });
  } catch (error) {
    if (['QR_ALREADY_USED', 'QR_EXPIRED', 'INVALID_QR', 'INVITATION_NOT_AVAILABLE'].includes(error.code)) {
      await audit('qr_used_attempt', { userId: req.user?._id, ip: req.ip, meta: { invitationId: req.params.id, code: error.code } });
      // Registra el intento rechazado con su estado correspondiente.
      const ref = await Invitation.findOne({ _id: req.params.id, qrTokenHash: tokenHash }).lean();
      await recordScanAttempt({
        invitationRef: ref,
        qrTokenHash: tokenHash,
        scanner,
        status: statusFromQrCode(error.code),
        scannedAt: new Date(),
      }).catch(() => {});
    }
    throw error;
  }
});

// Historial de intentos de una invitación (vista/drawer del listado).
export const scanHistory = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const result = await getScanHistory({ invitationId: req.params.id, page, limit });
  return res.status(200).json({ success: true, data: result });
});

// Exportación Excel del padrón completo (Solo admin). Dos hojas: Resumen + Historial.
export const exportRegistry = asyncHandler(async (_req, res, next) => {
  try {
    const buffer = await buildRegistryWorkbook();
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="auditoria-escaneos-${stamp}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
});

export default { createInvitation, importInvitations, listInvitations, listSent, stats, registry, removeInvitation, accept, scanHistory, exportRegistry };