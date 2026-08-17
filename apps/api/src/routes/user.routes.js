import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createUser, listUsers, updateUser } from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import validate from '../middleware/validate.js';
import { createUserSchema, updateUserSchema } from '../validators/user.validators.js';

const router = Router();

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(req, res) {
    return res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Demasiadas altas de usuario' } });
  },
});

router.use(protect, requireAdmin);

router.get('/', listUsers);
router.post('/', createLimiter, validate(createUserSchema), createUser);
router.patch('/:id', validate(updateUserSchema), updateUser);

export default router;