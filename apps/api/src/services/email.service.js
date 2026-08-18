import env from '../config/env.js';
import AppError from '../utils/ApiError.js';
import { Invitation } from '../models/Invitation.model.js';
import { generateQrForInvitation, toQrBuffer, toQrDataUrl } from './qr.service.js';
import { sendTransactionalEmail } from './resend.service.js';
import { renderInvitationEmail } from './emailTemplate.service.js';
import pdfService from './pdf.service.js';
import emailQueue from '../queues/email.queue.js';
import batchState from '../queues/emailBatchState.js';

// Referencia del adjunto inline del QR; la plantilla lo usa como `cid:qr-invitacion`.
const QR_CID = 'qr-invitacion';
const PDF_FILENAME = 'invitacion-ciudad-maderas-bootcamp-2026.pdf';

export function buildMessage({ to, cc, subject, html, text, qrBuffer, pdfBuffer }) {
  const attachments = [
    {
      filename: 'invitacion-qr.png',
      content: qrBuffer.toString('base64'),
      contentId: QR_CID,
      // Explícito a propósito: sin él Resend puede etiquetar el adjunto como
      // application/octet-stream y Gmail deja de resolver el `cid:`, mostrando
      // el QR como imagen rota.
      contentType: 'image/png',
    },
  ];

  // El PDF es opcional en `buildMessage` (no en `sendInvitationEmails`): así los
  // tests que arman el mensaje a mano no necesitan generar un PDF de verdad.
  if (pdfBuffer) {
    attachments.push({
      filename: PDF_FILENAME,
      content: pdfBuffer.toString('base64'),
      contentType: 'application/pdf',
    });
  }

  return {
    from: `${env.emailFromName} <${env.emailFrom}>`,
    // Solo la dirección, sin el nombre: los nombres vienen de una importación de
    // Excel y pueden traer comas o comillas que romperían la cabecera. Vale igual
    // para el `cc`.
    to: [to.email],
    // La clave se omite si no hay a quién copiar: Resend rechaza un `cc` vacío.
    ...(cc?.length ? { cc } : {}),
    subject,
    html,
    text,
    attachments,
  };
}

// Versión en texto plano: se muestra en clientes que no renderizan HTML y mejora
// la puntuación anti-spam. No lleva enlace: el acceso es el QR adjunto, que lo
// escanea el staff en la entrada.
export function buildText({ fullName }) {
  return [
    `Hola, ${fullName}`,
    '',
    'Tu acceso a Ciudad Maderas Bootcamp 2026 está listo.',
    '',
    'Encontrarás tu código QR como imagen en este correo. Tenlo a la mano antes de tu llegada:',
    'es personal, de un solo uso y no debe ser compartido con nadie más.',
    '',
    'Guárdalo bien. Lo necesitarás para acceder al evento.',
  ].join('\n');
}

const isSent = (inv) => inv.emailStatus?.attendee === true;

/**
 * Envía el correo de invitación: un único mensaje al invitado, con `ccEmail`
 * en copia si lo hay. Idempotente: si ya se envió, no reenvía.
 * Con `force: true` reenvía aunque ya se hubiera enviado (p. ej. si el correo rebotó);
 * esto genera un QR nuevo y el anterior deja de ser válido.
 */
export async function sendInvitationEmails(invitationId, { force = false } = {}) {
  const inv = await Invitation.findById(invitationId);
  if (!inv) {
    throw new AppError({ code: 'NOT_FOUND', message: 'Invitación no encontrada', httpStatus: 404 });
  }

  // Una invitación ya utilizada no se reenvía nunca: emitir un QR nuevo reabriría el acceso.
  if (inv.usedAt) return { sent: 0, skipped: true, message: 'La invitación ya fue utilizada' };

  if (isSent(inv) && !force) return { sent: 0, skipped: true, message: 'Correo ya enviado' };

  // Un único QR/token para toda la invitación (lo comparten invitado y copia).
  // El QR codifica la URL <APP_URL>/i/<token>; el escáner del staff acepta tanto
  // la URL como el token suelto. El correo no lleva enlace, solo el QR.
  const { url, tokenHash } = await generateQrForInvitation(inv._id);
  const qrBuffer = await toQrBuffer(url);

  // Sale un solo correo: el invitado en `to` y `ccEmail` en `cc`. El asunto y el
  // cuerpo son los mismos haya o no copia; el saludo usa el nombre del invitado.
  const context = { fullName: inv.guest.name, qrSrc: `cid:${QR_CID}` };

  // El PDF adjunto reutiliza la misma plantilla del correo (mismo diseño), solo
  // que el QR va como data URI en vez de `cid:`: Puppeteer no es un cliente de
  // correo y sí puede resolver `data:`. Sin try/catch a propósito: si falla
  // (Chromium caído, timeout, imagen que no carga), la excepción sube tal cual
  // y el correo NO se envía — se trata como un fallo de infraestructura para
  // que la cola de BullMQ lo reintente (ver `email.worker.js`), en vez de
  // mandar la invitación sin el PDF.
  const qrDataUri = await toQrDataUrl(url);
  // pdfMode: true quita la imagen de fondo (ver comentario en emailTemplate.service.js
  // sobre por qué Chromium se cuelga al imprimir esa combinación a PDF).
  const pdfHtml = renderInvitationEmail({ fullName: inv.guest.name, qrSrc: qrDataUri, pdfMode: true });
  const pdfBuffer = await pdfService.generatePdfFromHtml(pdfHtml);
  if (pdfBuffer.length > env.pdfMaxAttachmentBytes) {
    throw new AppError({
      code: 'PDF_TOO_LARGE',
      message: `El PDF de la invitación excede el tamaño máximo de ${Math.round(env.pdfMaxAttachmentBytes / 1024 / 1024)} MB`,
      httpStatus: 413,
    });
  }

  let sent = false;
  let sendError = null;

  try {
    // La clave de idempotencia se deriva del token recién emitido: un reintento tras
    // un timeout de red la repite y Resend no duplica el correo, mientras que un
    // reenvío con `force` emite un token nuevo y por tanto sí vuelve a enviar.
    const res = await sendTransactionalEmail(
      buildMessage({
        to: inv.guest,
        cc: inv.ccEmail ? [inv.ccEmail] : undefined,
        subject: 'Tu acceso a Ciudad Maderas Bootcamp 2026',
        html: renderInvitationEmail(context),
        text: buildText(context),
        qrBuffer,
        pdfBuffer,
      }),
      { idempotencyKey: `inv-${inv._id}-${tokenHash.slice(0, 16)}` },
    );
    sent = res.ok;
    if (!res.ok) sendError = res.error ?? 'error desconocido';
  } catch (e) {
    sendError = e?.message ?? String(e);
  }

  // Persistir estado de envío (solo lo que realmente se envió a Resend)
  const update = {};
  if (sent) {
    update['emailStatus.attendee'] = true;
    update['guest.emailSentAt'] = new Date();
    update['guest.emailError'] = null;
  } else if (sendError) {
    update['guest.emailError'] = sendError;
  }
  if (Object.keys(update).length) {
    await Invitation.updateOne({ _id: inv._id }, { $set: update });
  }

  return { sent: sent ? 1 : 0, errors: sendError ? [sendError] : [], email: inv.guest.email };
}

// Tope de seguridad: si por lo que sea `running` quedó atascado en true (un
// bug no previsto, un proceso que murió sin que BullMQ llegara a avisar),
// pasado este tiempo se ignora el batch "en curso" y se permite lanzar uno
// nuevo, en vez de bloquear "Enviar pendientes" para siempre.
const STALE_BATCH_MS = 30 * 60 * 1000;

function isStale(batch) {
  return Boolean(batch?.running) && Date.now() - batch.startedAt.getTime() > STALE_BATCH_MS;
}

/**
 * Lanza (o reutiliza, si ya hay uno corriendo) el envío de lo pendiente del
 * admin: encola cada invitación pendiente como un job de BullMQ y devuelve el
 * estado inicial. El procesamiento real corre en `queues/email.worker.js`,
 * en segundo plano — no espera a que termine.
 */
export async function startPendingEmailsBatch(senderId) {
  const existing = batchState.getBatch(senderId);
  if (existing?.running && !isStale(existing)) return existing;

  const { total } = await emailQueue.enqueuePendingInvitations(senderId);
  return batchState.newBatch(senderId, total);
}

/**
 * Estado del batch del admin: el que está corriendo (o el último terminado)
 * si existe en memoria, o un estado "idle" recalculado desde Mongo si nunca
 * se lanzó uno en este proceso (p. ej. tras un reinicio del servidor).
 */
export async function getBatchStatus(senderId) {
  const existing = batchState.getBatch(senderId);
  if (existing) return existing;

  const [pendientes, fallidos] = await Promise.all([
    emailQueue.countPending(senderId),
    emailQueue.countFailed(senderId),
  ]);
  return { running: false, total: 0, processed: 0, sent: 0, failed: 0, startedAt: null, lastErrors: [], pendientes, fallidos };
}

export default { sendInvitationEmails, startPendingEmailsBatch, getBatchStatus };
