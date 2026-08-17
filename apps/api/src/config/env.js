import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1).default('mongodb://mongodb:27017/qr_invitations'),

  FRONTEND_URL: z.string().url().default('http://localhost'),
  CORS_ORIGINS: z.string().default(''),
  APP_URL: z.string().url().default('http://localhost'),

  RESEND_API_KEY: z.string().default(''),
  EMAIL_FROM: z.string().email().default('no-reply@example.com'),
  EMAIL_FROM_NAME: z.string().default('QR Invitations'),
  // Resend limita a 10 req/s por equipo; 8 deja holgura para otros consumos de la misma key.
  EMAIL_RATE_PER_SEC: z.coerce.number().int().positive().max(10).default(8),

  REDIS_URL: z.string().min(1).default('redis://redis:6379'),
  // Jobs en paralelo que procesa el worker de envío de correos.
  EMAIL_QUEUE_CONCURRENCY: z.coerce.number().int().positive().max(20).default(5),

  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('qr-invitations'),
  JWT_AUDIENCE: z.string().default('qr-invitations-web'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`[env] Configuración de entorno inválida:\n${details}`);
  process.exit(1);
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  mongoUri: parsed.data.MONGODB_URI,
  frontendUrl: parsed.data.FRONTEND_URL,
  appUrl: parsed.data.APP_URL.replace(/\/$/, ''),
  resendApiKey: parsed.data.RESEND_API_KEY,
  emailFrom: parsed.data.EMAIL_FROM,
  emailFromName: parsed.data.EMAIL_FROM_NAME,
  emailRatePerSec: parsed.data.EMAIL_RATE_PER_SEC,
  redisUrl: parsed.data.REDIS_URL,
  emailQueueConcurrency: parsed.data.EMAIL_QUEUE_CONCURRENCY,
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  accessTokenExpiresIn: parsed.data.ACCESS_TOKEN_EXPIRES_IN,
  refreshTokenExpiresIn: parsed.data.REFRESH_TOKEN_EXPIRES_IN,
  jwtIssuer: parsed.data.JWT_ISSUER,
  jwtAudience: parsed.data.JWT_AUDIENCE,
  isProduction: parsed.data.NODE_ENV === 'production',
};

export default env;