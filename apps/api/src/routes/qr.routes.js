import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateQr } from '../controllers/qr.controller.js';
import { validateQrSchema } from '../validators/qr.validators.js';
import validate from '../middleware/validate.js';

const router = Router();

// Protección contra fuerza bruta en la validación de QR.
const qrLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(req, res) {
    return res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Demasiados intentos de validación' },
    });
  },
});

// POST /api/v1/qr/validate  (body: { qr: token-o-url })
router.post('/validate', qrLimiter, validate(validateQrSchema), validateQr);

export default router;