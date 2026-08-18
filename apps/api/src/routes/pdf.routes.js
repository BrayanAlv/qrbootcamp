import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { generateAndEmailPdf, generateSampleAndEmail } from '../controllers/pdf.controller.js';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { pdfEmailSchema, pdfSampleSchema } from '../validators/pdf.validators.js';

const router = Router();

// Enviar HTML arbitrario convertido a PDF es potente y caro (Chromium): límite
// estricto además de la autenticación admin.
const pdfRenderingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(req, res) {
    return res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Demasiadas generaciones de PDF' },
    });
  },
});

// Las rutas de generación de PDF solo para administradores.
router.use(protect, requireAdmin, pdfRenderingLimiter);

router.post('/email', validate(pdfEmailSchema), generateAndEmailPdf);
router.post('/sample', validate(pdfSampleSchema), generateSampleAndEmail);

export default router;