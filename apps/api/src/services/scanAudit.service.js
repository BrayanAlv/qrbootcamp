import { Invitation } from '../models/Invitation.model.js';
import { QrScanAttempt, SCAN_STATUS } from '../models/QrScanAttempt.model.js';
import { hashToken } from './qr.service.js';
import { extractQrToken } from '../validators/qr.validators.js';
import AppError from '../utils/ApiError.js';

export { SCAN_STATUS };

const now = () => new Date();

/**
 * Número de intento consecutivo y a prueba de concurrencia.
 * - Con invitación: $inc atómico sobre Invitation.scan.attempts. Dos escaneos
 *   simultáneos reciben números distintos sin transacciones.
 * - Sin invitación (QR desconocido): no puede haber escaneo válido, así que el
 *   conteo es best-effort por hash (no requiere atomicidad).
 */
export async function nextAttemptNumber(invitationId, qrTokenHash) {
  if (invitationId) {
    const doc = await Invitation.findOneAndUpdate(
      { _id: invitationId },
      { $inc: { 'scan.attempts': 1 } },
      { new: true, projection: { 'scan.attempts': 1 } },
    );
    return doc?.scan?.attempts ?? 1;
  }
  if (qrTokenHash) {
    return (await QrScanAttempt.countDocuments({ qrTokenHash })) + 1;
  }
  return 1;
}

/**
 * Registra un intento de escaneo en la bitácora permanente, actualiza el
 * snapshot de "último intento" de la invitación y devuelve el documento
 * de la bitácora (con su attemptNumber).
 */
export async function recordScanAttempt({
  invitationRef,
  qrTokenHash,
  scanner,
  status,
  isFirstValid = false,
  scannedAt = now(),
}) {
  const invitationId = invitationRef?._id ?? invitationRef ?? null;
  const attemptNumber = await nextAttemptNumber(invitationId, qrTokenHash);

  const doc = await QrScanAttempt.create({
    invitation: invitationId,
    qrTokenHash,
    crmId: invitationRef?.crmId ?? null,
    invitationGuest: {
      name: invitationRef?.guest?.name ?? null,
      email: invitationRef?.guest?.email ?? null,
    },
    scanner: {
      user: scanner?.user ?? null,
      name: scanner?.name ?? null,
      email: scanner?.email ?? null,
    },
    status,
    attemptNumber,
    isFirstValid: isFirstValid === true,
    scannedAt,
  });

  if (invitationId) {
    const lastBy = {
      user: scanner?.user ?? null,
      name: scanner?.name ?? null,
      email: scanner?.email ?? null,
    };
    await Invitation.updateOne(
      { _id: invitationId },
      {
        $set: {
          'scan.lastAt': scannedAt,
          'scan.lastStatus': status,
          'scan.lastBy': lastBy,
        },
      },
    );
  }

  return doc;
}

/**
 * Traduce un código de error existente (QR_*) al estado de la bitácora.
 * Mantiene consistencia entre el flujo nuevo y el legado.
 */
export function statusFromQrCode(code) {
  switch (code) {
    case 'QR_ALREADY_USED':
      return SCAN_STATUS.ALREADY_USED;
    case 'QR_EXPIRED':
      return SCAN_STATUS.EXPIRED;
    case 'INVALID_QR':
      return SCAN_STATUS.INVALID;
    default:
      return SCAN_STATUS.ERROR;
  }
}

/**
 * Flujo unificado de escaneo (un solo endpoint autenticado).
 * Registra el intento pase lo que pase y devuelve/arroja los mismos códigos
 * que el sistema actual para no romper el frontend.
 *
 * Concurrencia: dos escaneos del mismo QR compiten por un único findOneAndUpdate
 * atómico (`usedAt: null`). Solo uno gana; el resto recibe QR_ALREADY_USED.
 */
export async function runQrScan({ token, scanner }) {
  const normalized = extractQrToken(token);
  if (!normalized) {
    await recordScanAttempt({ qrTokenHash: null, scanner, status: SCAN_STATUS.INVALID, scannedAt: now() });
    throw new AppError({ code: 'INVALID_QR', message: 'Código QR inválido', httpStatus: 400 });
  }

  const tokenHash = hashToken(normalized);
  const invitation = await Invitation.findOne({ qrTokenHash: tokenHash });

  if (!invitation) {
    await recordScanAttempt({ qrTokenHash: tokenHash, scanner, status: SCAN_STATUS.INVALID, scannedAt: now() });
    throw new AppError({ code: 'INVALID_QR', message: 'Invitación no encontrada', httpStatus: 404 });
  }

  const scannedAt = now();

  // Intento atómico de primer uso. Sólo el ganador recibe usedAt.
  const accepted = await Invitation.findOneAndUpdate(
    {
      _id: invitation._id,
      qrTokenHash: tokenHash,
      usedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: scannedAt } }],
    },
    {
      $set: {
        usedAt: scannedAt,
        acceptedAt: scannedAt,
        status: 'aceptada',
        'scan.firstAt': scannedAt,
        'scan.firstBy': {
          user: scanner?.user ?? null,
          name: scanner?.name ?? null,
          email: scanner?.email ?? null,
        },
      },
    },
    { new: true },
  );

  if (accepted) {
    const rec = await recordScanAttempt({
      invitationRef: accepted,
      qrTokenHash: tokenHash,
      scanner,
      status: SCAN_STATUS.VALID,
      isFirstValid: true,
      scannedAt,
    });
    return {
      invitationId: accepted._id.toString(),
      guest: accepted.guest,
      ccEmail: accepted.ccEmail,
      status: accepted.status,
      attemptNumber: rec.attemptNumber,
      isFirstValid: true,
      scannedAt,
    };
  }

  // Perdedor o QR ya usado/expirado: averiguar el motivo exacto.
  const current = await Invitation.findOne({ _id: invitation._id, qrTokenHash: tokenHash });

  if (current?.expiresAt && current.expiresAt.getTime() < scannedAt.getTime()) {
    await recordScanAttempt({ invitationRef: current, qrTokenHash: tokenHash, scanner, status: SCAN_STATUS.EXPIRED, scannedAt });
    throw new AppError({
      code: 'QR_EXPIRED',
      message: 'Código QR expirado',
      httpStatus: 410,
      details: { guest: current.guest },
    });
  }

  if (current?.usedAt) {
    await recordScanAttempt({ invitationRef: current, qrTokenHash: tokenHash, scanner, status: SCAN_STATUS.ALREADY_USED, scannedAt });
    throw new AppError({
      code: 'QR_ALREADY_USED',
      message: 'Código QR ya utilizado',
      httpStatus: 409,
      details: { guest: current.guest },
    });
  }

  await recordScanAttempt({ invitationRef: current, qrTokenHash: tokenHash, scanner, status: SCAN_STATUS.ERROR, scannedAt });
  throw new AppError({
    code: 'INVITATION_NOT_AVAILABLE',
    message: 'Invitación no disponible',
    httpStatus: 409,
  });
}

/**
 * Historial completo de intentos de una invitación (paginado).
 */
export async function getScanHistory({ invitationId, page = 1, limit = 100 }) {
  const [items, total] = await Promise.all([
    QrScanAttempt.find({ invitation: invitationId })
      .sort({ scannedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    QrScanAttempt.countDocuments({ invitation: invitationId }),
  ]);
  return { items, total, page, limit };
}

export default {
  SCAN_STATUS,
  nextAttemptNumber,
  recordScanAttempt,
  statusFromQrCode,
  runQrScan,
  getScanHistory,
};