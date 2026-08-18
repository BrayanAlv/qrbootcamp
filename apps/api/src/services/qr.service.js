import crypto from 'node:crypto';
import QRCode from 'qrcode';
import sharp from 'sharp';
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

// 'Q' (no 'M'): el logo tapa el centro, así que hace falta corrección de
// errores alta para que el QR se siga pudiendo escanear. 'Q' tolera ~25% de
// daño/oclusión, bien por encima del ~14% que cubre el logo (ver box más
// abajo) — y a diferencia de 'H' (~30%) suele caber en una versión de QR más
// chica para la misma URL, es decir menos módulos y cada uno más grande, lo
// que la cámara enfoca y decodifica más rápido.
// margin=4 (no 2): zona de silencio mínima recomendada por ISO/IEC 18004
// para que la cámara ubique los patrones de esquina sin demora. width sube
// de 400 a 440 para compensar el margen extra y que el módulo de datos no
// se achique.
const QR_OPTIONS = {
  errorCorrectionLevel: 'Q',
  margin: 4,
  width: 440,
};

const LOGO_URL = 'https://s3lata.maderasstudio.com/email/logo-bootcamp-color.png';

// Insignia (logo + placa blanca) cacheada a nivel de proceso: se prepara una
// sola vez y se reutiliza en todos los QR que se generen después (un envío
// por lotes puede generar cientos). No se cachea el fallo: un problema
// puntual de red no debe desactivar el logo para el resto del proceso.
let logoBadgePromise = null;

async function getLogoBadge() {
  if (!logoBadgePromise) {
    logoBadgePromise = buildLogoBadge().catch((err) => {
      logoBadgePromise = null;
      // eslint-disable-next-line no-console
      console.warn('No se pudo preparar el logo del QR, se genera sin marca:', err.message);
      return null;
    });
  }
  return logoBadgePromise;
}

// LOGO_URL puede traer margen transparente, así que se recorta y se ajusta
// dentro de una caja cuadrada (limitando también por altura) antes de
// ponerlo sobre una placa blanca.
async function buildLogoBadge() {
  const res = await fetch(LOGO_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar el logo`);
  const logoBytes = Buffer.from(await res.arrayBuffer());

  const trimmed = await sharp(logoBytes).trim().toBuffer();

  // 0.38 (~14% del área del QR): más grande que antes pero sigue por debajo
  // del ~30% que tolera la corrección de errores 'H', así que el QR sigue
  // siendo escaneable.
  const box = Math.round(QR_OPTIONS.width * 0.38);
  const resizedLogo = await sharp(trimmed)
    .resize({ width: box, height: box, fit: 'inside' })
    .toBuffer();
  const { width: logoW, height: logoH } = await sharp(resizedLogo).metadata();

  const padding = Math.round(box * 0.1);
  const plateW = logoW + padding * 2;
  const plateH = logoH + padding * 2;
  const radius = Math.round(Math.min(plateW, plateH) * 0.16);
  const plateSvg = Buffer.from(
    `<svg width="${plateW}" height="${plateH}"><rect width="${plateW}" height="${plateH}" rx="${radius}" ry="${radius}" fill="white"/></svg>`,
  );

  return sharp(plateSvg).composite([{ input: resizedLogo, gravity: 'center' }]).png().toBuffer();
}

// Compone la insignia sobre el QR ya generado. Si la insignia no está
// disponible (fallo de red al descargar el logo), devuelve el QR sin marca
// en vez de romper la generación.
async function composeLogoOnQr(qrBuffer) {
  const badge = await getLogoBadge();
  if (!badge) return qrBuffer;
  return sharp(qrBuffer).composite([{ input: badge, gravity: 'center' }]).png().toBuffer();
}

// Genera el PNG (data URL base64) del QR, para previsualizarlo en el navegador.
export async function toQrDataUrl(url) {
  const buffer = await composeLogoOnQr(await QRCode.toBuffer(url, QR_OPTIONS));
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

// Genera el PNG del QR como Buffer, para adjuntarlo inline (cid:) en el correo.
// Gmail y Outlook descartan las URI `data:` en correo, así que la imagen debe
// viajar como adjunto y no incrustada en el HTML.
export async function toQrBuffer(url) {
  return composeLogoOnQr(await QRCode.toBuffer(url, QR_OPTIONS));
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