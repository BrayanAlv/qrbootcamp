import crypto from 'node:crypto';
import QRCode from 'qrcode';
import env from '../config/env.js';
import { Invitation } from '../models/Invitation.model.js';

// El QR contiene una URL: <APP_URL>/i/<token>. El token es impredecible (32 bytes).
export function generateQrToken() {
  return crypto.randomBytes(32).toString('base64url');
}

// Solo se guarda el SHA-256 del token (si la BD se expone, el token original no es recuperable).
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Genera y persiste el par (tokenHash, expiresAt) para una invitación.
// El QR no caduca por defecto (`expiresAt: null`): lo que lo invalida es el uso
// único (`usedAt`). `ttlMs` permite acotarlo puntualmente si hiciera falta.
// El $set sobrescribe siempre, así que reemitir un QR antiguo también le quita
// cualquier caducidad que tuviera.
export async function generateQrForInvitation(invitationId, { ttlMs } = {}) {
  const token = generateQrToken();
  const tokenHash = hashToken(token);
  const expiresAt = ttlMs ? new Date(Date.now() + ttlMs) : null;

  await Invitation.updateOne({ _id: invitationId }, { $set: { qrTokenHash: tokenHash, expiresAt } });

  return { token, tokenHash, url: `${env.appUrl}/i/${token}`, expiresAt };
}

// Devuelve la invitación que corresponde a un token (buscando por su hash).
export async function findInvitationByQrToken(token) {
  if (!token) return null;
  return Invitation.findOne({ qrTokenHash: hashToken(token) });
}

// Busca por el hash directamente (útil cuando no se tiene el token original).
export async function findInvitationByHash(tokenHash) {
  if (!tokenHash) return null;
  return Invitation.findOne({ qrTokenHash: tokenHash });
}

const QR_OPTIONS = {
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 300,
};

// Genera el PNG (data URL base64) del QR, para previsualizarlo en el navegador.
export async function toQrDataUrl(url) {
  return QRCode.toDataURL(url, QR_OPTIONS);
}

// Genera el PNG del QR como Buffer, para adjuntarlo inline (cid:) en el correo.
// Gmail y Outlook descartan las URI `data:` en correo, así que la imagen debe
// viajar como adjunto y no incrustada en el HTML.
export async function toQrBuffer(url) {
  return QRCode.toBuffer(url, QR_OPTIONS);
}

export default {
  generateQrToken,
  hashToken,
  generateQrForInvitation,
  findInvitationByQrToken,
  findInvitationByHash,
  toQrDataUrl,
  toQrBuffer,
};