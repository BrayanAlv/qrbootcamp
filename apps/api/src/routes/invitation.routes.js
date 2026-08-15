import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  importInvitations,
  listInvitations,
  listSent,
  stats,
  removeInvitation,
  accept,
} from '../controllers/invitation.controller.js';
import { sendInvitation, resendInvitation, sendAll } from '../controllers/email.controller.js';
import { protect } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { uploadExcel } from '../middleware/upload.js';
import validate from '../middleware/validate.js';
import { acceptSchema, idParamSchema, listSentSchema } from '../validators/invitation.validators.js';

const router = Router();

const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(req, res) {
    return res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Demasiadas descargas de invitaciones' } });
  },
});

// El reenvío forzado sí manda correo aunque ya se hubiera enviado: se limita aparte.
const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(req, res) {
    return res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Demasiados reenvíos' } });
  },
});

const acceptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(req, res) {
    return res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Demasiados intentos' } });
  },
});

router.use(protect);

// Las rutas literales van ANTES que las de `/:id`, o el parámetro las capturaría.
router.get('/', listInvitations);
router.get('/sent', requireAdmin, validate(listSentSchema), listSent);
router.get('/stats', requireAdmin, stats);
router.post('/import', requireAdmin, importLimiter, uploadExcel.single('file'), importInvitations);
router.post('/send', requireAdmin, sendAll);
router.post('/:id/send', requireAdmin, validate(idParamSchema), sendInvitation);
router.post('/:id/resend', requireAdmin, resendLimiter, validate(idParamSchema), resendInvitation);
router.delete('/:id', requireAdmin, validate(idParamSchema), removeInvitation);
router.post('/:id/accept', acceptLimiter, validate(acceptSchema), accept);

export default router;