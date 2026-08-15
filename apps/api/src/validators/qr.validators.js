import { z } from 'zod';

// El QR contiene una URL (<APP_URL>/i/<token>) o directamente el token.
// Normalizamos: si llega una URL, extraemos la última parte de la ruta.
export function extractQrToken(input) {
  if (!input) return null;
  const raw = String(input).trim();
  // Quita query/hash si los hubiera
  const withoutQuery = raw.split(/[?#]/)[0];
  // Si parece una URL, toma la última parte
  const parts = withoutQuery.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  return last && last.length >= 20 ? last : null;
}

export const validateQrSchema = z.object({
  body: z.object({
    qr: z.string().min(1, 'qr requerido'),
  }),
});

export default { extractQrToken, validateQrSchema };