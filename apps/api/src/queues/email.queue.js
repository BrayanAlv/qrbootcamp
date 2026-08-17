import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { Invitation } from '../models/Invitation.model.js';

export const EMAIL_QUEUE_NAME = 'email-send';

export function pendingQuery(senderId) {
  return { sender: senderId, usedAt: null, 'emailStatus.attendee': { $ne: true } };
}

let queueInstance = null;

/**
 * Instancia única de la cola, creada al primer uso (no al importar el
 * módulo): así los tests que nunca la usan de verdad no intentan conectar a
 * Redis solo por importar `email.service.js`.
 */
export function getEmailQueue() {
  if (!queueInstance) {
    queueInstance = new Queue(EMAIL_QUEUE_NAME, { connection: createRedisConnection() });
  }
  return queueInstance;
}

/**
 * `jobId` = id de la invitación: si ya hay un job en cola o activo para esa
 * invitación, BullMQ no crea uno duplicado, así que reintentar "Enviar
 * pendientes" varias veces no encola el mismo correo dos veces.
 *
 * `attempts`/`backoff` solo entran en juego ante un fallo real de
 * infraestructura: `sendInvitationEmails` nunca lanza por un rechazo de
 * Resend (lo captura y lo guarda en `guest.emailError`), así que un correo
 * inválido no se reintenta sin fin — simplemente queda pendiente en Mongo
 * para el próximo click en "Enviar pendientes".
 */
export function buildJobs(invitationIds, senderId) {
  return invitationIds.map((id) => ({
    name: 'send-invitation',
    data: { invitationId: id.toString(), senderId: senderId.toString() },
    opts: {
      jobId: id.toString(),
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 24 * 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  }));
}

// Costura de test: los tests sustituyen `addBulk` para no requerir Redis real.
export const emailQueueAdapter = {
  async addBulk(jobs) {
    return getEmailQueue().addBulk(jobs);
  },
};

export async function enqueuePendingInvitations(senderId) {
  const pending = await Invitation.find(pendingQuery(senderId), '_id');
  if (pending.length === 0) return { total: 0 };
  await emailQueueAdapter.addBulk(buildJobs(pending.map((doc) => doc._id), senderId));
  return { total: pending.length };
}

export async function countPending(senderId) {
  return Invitation.countDocuments(pendingQuery(senderId));
}

export async function countFailed(senderId) {
  return Invitation.countDocuments({ ...pendingQuery(senderId), 'guest.emailError': { $ne: null } });
}

const emailQueueService = {
  EMAIL_QUEUE_NAME,
  pendingQuery,
  getEmailQueue,
  buildJobs,
  emailQueueAdapter,
  enqueuePendingInvitations,
  countPending,
  countFailed,
};

export default emailQueueService;
