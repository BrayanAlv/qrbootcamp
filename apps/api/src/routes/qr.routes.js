import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateQr, scanQr } from '../controllers/qr.controller.js';
import { validateQrSchema } from '../validators/qr.validators.js';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { requireUser } from '../middleware/requireUser.js';

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

// POST /api/v1/qr/scan  (body: { qr: token-o-url }) — autenticado.
// Unifica validación + aceptación atómica + registro de auditoría del intento.
const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(req, res) {
    return res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Demasiados intentos de escaneo' },
    });
  },
});

router.post('/scan', scanLimiter, protect, requireUser, validate(validateQrSchema), scanQr);

export default router;