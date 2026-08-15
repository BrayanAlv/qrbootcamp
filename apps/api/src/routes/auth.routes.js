import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  loginHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
} from '../controllers/auth.controller.js';
import { loginSchema, refreshSchema } from '../validators/auth.validators.js';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Rate limiting específico (fuerza bruta a /login)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler(req, res) {
    return res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Demasiados intentos. Intenta más tarde.' },
    });
  },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(req, res) {
    return res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Demasiados intentos' },
    });
  },
});

router.post('/login', loginLimiter, validate(loginSchema), loginHandler);
router.post('/refresh', refreshLimiter, validate(refreshSchema), refreshHandler);
router.post('/logout', logoutHandler);
router.get('/me', protect, meHandler);

export default router;