import { Worker } from 'bullmq';
import env from '../config/env.js';
import { createRedisConnection } from '../config/redis.js';
import { EMAIL_QUEUE_NAME } from './email.queue.js';
import emailService from '../services/email.service.js';
import { recordResult } from './emailBatchState.js';

/**
 * Procesa un job de envío. `sendInvitationEmails` ya es idempotente (no
 * reenvía si `emailStatus.attendee` es true) y nunca lanza por un rechazo de
 * Resend, así que el job siempre "completa" a nivel de BullMQ; un correo que
 * falla queda registrado en Mongo (`guest.emailError`) para el próximo
 * "Enviar pendientes", en vez de reintentarse sin fin. Solo un fallo real de
 * infraestructura (Mongo caído, un bug) llega como excepción y dispara los
 * reintentos con backoff configurados en `buildJobs` (`email.queue.js`).
 */
export async function processEmailJob(job) {
  const { invitationId, senderId } = job.data;
  const result = await emailService.sendInvitationEmails(invitationId);
  recordResult(senderId, { sent: result.sent > 0, skipped: result.skipped, error: result.errors?.[0], guestEmail: result.email });
  return result;
}

/**
 * BullMQ emite `failed` en cada intento fallido, no solo en el último — hay
 * que filtrar por `attemptsMade` para no marcar la invitación como fallida
 * antes de agotar los reintentos. Solo llega aquí una excepción real (fallo
 * de infraestructura): un rechazo de Resend no lanza, así que nunca pasa
 * por este camino (ver `processEmailJob`/`sendInvitationEmails`). Sin este
 * registro, un job que agota reintentos nunca llama a `recordResult`, y
 * `state.processed` no alcanza `state.total`: la barra de progreso queda
 * "en curso" para siempre.
 */
export function handleJobFailed(job, err) {
  if (!job) return;
  const attempts = job.opts?.attempts ?? 1;
  if (job.attemptsMade < attempts) return;
  recordResult(job.data.senderId, { sent: false, error: err?.message ?? 'error desconocido' });
}

export function startEmailWorker() {
  const worker = new Worker(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: createRedisConnection({ forWorker: true }),
    concurrency: env.emailQueueConcurrency,
  });
  worker.on('failed', (job, err) => {
    handleJobFailed(job, err);
    // eslint-disable-next-line no-console
    console.error('[email-worker] job falló tras reintentos:', job?.id, err?.message);
  });
  return worker;
}

export default { processEmailJob, startEmailWorker, handleJobFailed };
