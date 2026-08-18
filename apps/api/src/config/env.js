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

  // ===== Generación de PDFs (Puppeteer-core + Chromium del sistema) =====
  // Ruta al binario de Chromium (instalado en la imagen con `apk add chromium`).
  PUPPETEER_EXECUTABLE_PATH: z.string().min(1).default('/usr/bin/chromium-browser'),
  // Hosts (separados por coma) a los que se permite cargar subrecursos
  // (imágenes, CSS, fuentes). Bloquea SSRF a URLs internas. Solo se permite https.
  PDF_ALLOWED_RESOURCE_HOSTS: z.string().default('s3lata.maderasstudio.com,fonts.googleapis.com,fonts.gstatic.com'),
  // Timeout global de navegación/generación del PDF.
  PDF_GENERATION_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  // Si true, aborta la generación cuando una imagen externa no carga; si false, avisa y continúa.
  PDF_FAIL_ON_MISSING_IMAGE: z.coerce.boolean().default(false),
  // Tope de tamaño del adjunto PDF (Resend limita ~40 MB por email).
  PDF_MAX_ATTACHMENT_MB: z.coerce.number().int().positive().max(39).default(25),
  // Último recurso para entornos sin SYS_ADMIN/capabilities (contenedor dev como root).
  PDF_CHROMIUM_NO_SANDBOX: z.coerce.boolean().default(false),
  // Ancho de ventana (CSS px) usado para renderizar el HTML antes de volcar a PDF.
  PDF_VIEWPORT_WIDTH: z.coerce.number().int().positive().default(1240),
  // Escala de la ventana; 2 da imágenes nítidas en el PDF.
  PDF_VIEWPORT_DEVICE_SCALE_FACTOR: z.coerce.number().int().positive().default(2),

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
  puppeteerExecutablePath: parsed.data.PUPPETEER_EXECUTABLE_PATH,
  pdfAllowedResourceHosts: parsed.data.PDF_ALLOWED_RESOURCE_HOSTS.split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  pdfGenerationTimeoutMs: parsed.data.PDF_GENERATION_TIMEOUT_MS,
  pdfFailOnMissingImage: parsed.data.PDF_FAIL_ON_MISSING_IMAGE,
  pdfMaxAttachmentBytes: parsed.data.PDF_MAX_ATTACHMENT_MB * 1024 * 1024,
  pdfChromiumNoSandbox: parsed.data.PDF_CHROMIUM_NO_SANDBOX,
  pdfViewportWidth: parsed.data.PDF_VIEWPORT_WIDTH,
  pdfViewportDeviceScaleFactor: parsed.data.PDF_VIEWPORT_DEVICE_SCALE_FACTOR,
  isProduction: parsed.data.NODE_ENV === 'production',
};

export default env;