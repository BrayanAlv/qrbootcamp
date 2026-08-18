import asyncHandler from '../utils/asyncHandler.js';
import { generatePdfFromHtml } from '../services/pdf.service.js';
import { sendEmailWithPdf } from '../services/pdfEmail.service.js';
import { generateSampleDocumentHtml } from '../services/pdfTemplate.service.js';
import { audit } from '../services/audit.service.js';

// POST /pdf/email — valida, genera el PDF desde el HTML recibido y lo envía.
export const generateAndEmailPdf = asyncHandler(async (req, res) => {
  const { to, subject, filename, html, text } = req.body;

  const pdfBuffer = await generatePdfFromHtml(html);

  const result = await sendEmailWithPdf({ to, subject, html, pdfBuffer, filename, text });

  await audit('pdf_email_sent', {
    userId: req.auth?.userId,
    email: to,
    ip: req.ip,
    meta: { filename, subject },
  });

  return res.status(200).json({
    success: true,
    message: 'PDF generado y enviado correctamente',
    data: { id: result.id },
  });
});

// POST /pdf/sample — genera un documento de ejemplo y lo envía (para probar el
// flujo completo sin escribir el HTML a mano).
export const generateSampleAndEmail = asyncHandler(async (req, res) => {
  const { to, subject, filename, data } = req.body;

  const html = generateSampleDocumentHtml(data);
  const pdfBuffer = await generatePdfFromHtml(html);

  const result = await sendEmailWithPdf({ to, subject, html, pdfBuffer, filename });

  await audit('pdf_email_sent', {
    userId: req.auth?.userId,
    email: to,
    ip: req.ip,
    meta: { filename, subject, sample: true },
  });

  return res.status(200).json({
    success: true,
    message: 'PDF generado y enviado correctamente',
    data: { id: result.id },
  });
});

export default { generateAndEmailPdf, generateSampleAndEmail };