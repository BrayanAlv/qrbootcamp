import env from '../config/env.js';
import AppError from '../utils/ApiError.js';
import { sendTransactionalEmail } from './resend.service.js';

/**
 * Adjunta y envía un PDF vía Resend reutilizando el servicio transaccional
 * existente (rate-limit, reintentos y timeout ya están ahí).
 *
 * El SDK de Resend acepta `content` como Buffer directamente, así que no se
 * convierte a Base64.
 *
 * @param {object} params
 * @param {string}   params.to        Destinatario.
 * @param {string}   params.subject   Asunto del correo.
 * @param {string}   params.html      Cuerpo HTML.
 * @param {Buffer}   params.pdfBuffer El PDF generado como Buffer.
 * @param {string}   params.filename  Nombre del archivo adjunto (.pdf).
 * @param {string}   [params.text]    Versión en texto plano (opcional).
 * @returns {Promise<{ ok: boolean, id: string|null, error: string|null }>}
 */
export async function sendEmailWithPdf({ to, subject, html, pdfBuffer, filename, text }) {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    throw new AppError({ code: 'PDF_INVALID', message: 'El PDF es inválido o está vacío', httpStatus: 500 });
  }
  if (pdfBuffer.length > env.pdfMaxAttachmentBytes) {
    throw new AppError({
      code: 'PDF_TOO_LARGE',
      message: `El PDF excede el tamaño máximo de ${Math.round(env.pdfMaxAttachmentBytes / 1024 / 1024)} MB`,
      httpStatus: 413,
    });
  }

  const payload = {
    from: `${env.emailFromName} <${env.emailFrom}>`,
    to: [to],
    subject,
    ...(text ? { text } : {}),
    html,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  const result = await sendTransactionalEmail(payload);

  if (!result.ok) {
    // No se expone la API key; solo un mensaje genérico con el error del proveedor.
    throw new AppError({
      code: 'EMAIL_SEND_FAILED',
      message: `No se pudo enviar el correo: ${result.error ?? 'error desconocido'}`,
      httpStatus: 502,
    });
  }

  return result;
}

export default { sendEmailWithPdf };