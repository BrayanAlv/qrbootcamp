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
  recordResult(senderId, { sent: result.sent > 0, error: result.errors?.[0], guestEmail: result.email });
  return result;
}

export function startEmailWorker() {
  const worker = new Worker(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: createRedisConnection(),
    concurrency: env.emailQueueConcurrency,
  });
  worker.on('failed', (job, err) => {
    // eslint-disable-next-line no-console
    console.error('[email-worker] job falló tras reintentos:', job?.id, err?.message);
  });
  return worker;
}

export default { processEmailJob, startEmailWorker };
