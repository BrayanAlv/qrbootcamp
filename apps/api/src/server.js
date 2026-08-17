import { pathToFileURL } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import env from './config/env.js';
import { connectDb } from './config/db.js';
import { startEmailWorker } from './queues/email.worker.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import invitationRoutes from './routes/invitation.routes.js';
import qrRoutes from './routes/qr.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import AppError from './utils/ApiError.js';

export async function createApp() {
  const app = express();

  // Confianza en el proxy (Nginx) para Rate Limit por IP real
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cookieParser());

  app.use(
    cors({
      origin(origin, cb) {
        // Sin header Origin (misma-origen / curl) se permite siempre.
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Rate limit global base
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler(req, res) {
        return res.status(429).json({
          success: false,
          error: { code: 'RATE_LIMITED', message: 'Demasiadas peticiones' },
        });
      },
    }),
  );

  // Rutas versionadas
  const api = express.Router();
  api.use('/auth', authRoutes);
  api.use('/invitations', invitationRoutes);
  api.use('/qr', qrRoutes);
  api.use(healthRoutes);
  app.use('/api/v1', api);

  // 404
  app.use((_req, _res, next) => {
    next(new AppError({ code: 'NOT_FOUND', message: 'Ruta no encontrada', httpStatus: 404 }));
  });

  app.use(errorHandler);

  return app;
}

export async function startServer() {
  await connectDb();
  const app = await createApp();
  const worker = startEmailWorker();

  return new Promise((resolve) => {
    const server = app.listen(env.port, '0.0.0.0', () => {
      // eslint-disable-next-line no-console
      console.log(`[api] API escuchando en puerto ${env.port}`);
      resolve(server);
    });

    const shutdown = async (signal) => {
      // eslint-disable-next-line no-console
      console.log(`[api] ${signal} recibido, cerrando...`);
      await worker.close();
      server.close(() => process.exit(0));
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  });
}

// Arranque solo cuando se ejecuta directamente (no al importarse en tests)
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  startServer().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[api] Error al iniciar:', err);
    process.exit(1);
  });
}