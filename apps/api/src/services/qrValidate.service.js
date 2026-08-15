import { hashToken, findInvitationByHash } from './qr.service.js';
import AppError from '../utils/ApiError.js';
import { extractQrToken } from '../validators/qr.validators.js';

export const QR_FAIL = {
  INVALID_QR: 'INVALID_QR',
  QR_EXPIRED: 'QR_EXPIRED',
  QR_ALREADY_USED: 'QR_ALREADY_USED',
};

/**
 * Valida un token/QR sin marcarlo como usado (la marcación ocurre al aceptar).
 * Códigos: INVALID_QR, QR_EXPIRED, QR_ALREADY_USED o éxito (inválido para uso).
 */
export async function validateQrToken(input) {
  const token = extractQrToken(input);
  if (!token) {
    throw new AppError({ code: QR_FAIL.INVALID_QR, message: 'Código QR inválido', httpStatus: 400 });
  }

  const invitation = await findInvitationByHash(hashToken(token));
  if (!invitation) {
    throw new AppError({ code: QR_FAIL.INVALID_QR, message: 'Invitación no encontrada', httpStatus: 404 });
  }

  if (invitation.usedAt) {
    // details.guest permite al scan mostrar el nombre en el popout de duplicado.
    throw new AppError({
      code: QR_FAIL.QR_ALREADY_USED,
      message: 'Código QR ya utilizado',
      httpStatus: 409,
      details: { guest: invitation.guest },
    });
  }

  if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
    throw new AppError({ code: QR_FAIL.QR_EXPIRED, message: 'Código QR expirado', httpStatus: 410 });
  }

  return {
    invitationId: invitation._id.toString(),
    guest: invitation.guest,
    assistant: invitation.assistant,
    status: invitation.status,
    eventDate: invitation.eventDate ?? null,
  };
}

export default { validateQrToken, QR_FAIL };