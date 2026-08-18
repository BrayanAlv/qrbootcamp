import { z } from 'zod';

// Límite del HTML recibido del cliente. El body de Express ya limita a 1 MB,
// pero acotamos más porque generar un PDF muy grande consume memoria y Chromium.
const HTML_MAX_CHARS = 200_000;
const FILENAME_MAX = 120;

const email = z.string().trim().email('correo inválido');

// Envía un HTML arbitrario como PDF por correo. Solo admin (ver routes).
export const pdfEmailSchema = z.object({
  body: z
    .object({
      to: email.min(3).max(320),
      subject: z.string().trim().min(1, 'asunto requerido').max(200),
      html: z.string().min(1, 'html requerido').max(HTML_MAX_CHARS, `html demasiado largo (máx ${HTML_MAX_CHARS} caracteres)`),
      filename: z.string().trim().min(1).max(FILENAME_MAX).default('documento.pdf'),
      text: z.string().max(HTML_MAX_CHARS).optional(),
    })
    .transform(({ filename, ...rest }) => ({ ...rest, filename: filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf` })),
});

// Genera un documento de ejemplo (sin HTML del cliente) y lo envía.
export const pdfSampleSchema = z.object({
  body: z.object({
    to: email.min(3).max(320),
    subject: z.string().trim().min(1).max(200).default('Documento de ejemplo'),
    filename: z.string().trim().min(1).max(FILENAME_MAX).default('documento.pdf'),
    data: z
      .object({
        title: z.string().trim().max(200).optional(),
        subtitle: z.string().max(300).optional(),
        intro: z.string().max(2000).optional(),
        tableTitle: z.string().max(120).optional(),
        rows: z
          .array(z.object({ concept: z.string().max(120), detail: z.string().max(120), amount: z.string().max(60) }))
          .max(50)
          .optional(),
        date: z.string().max(60).optional(),
      })
      .optional(),
  }),
});

export default { pdfEmailSchema, pdfSampleSchema };