import IORedis from 'ioredis';
import env from './env.js';

/**
 * Crea una conexión de Redis dedicada. BullMQ exige que cada `Worker` tenga
 * su propia conexión (usa comandos bloqueantes); aquí cada llamada crea una
 * nueva por simplicidad, tanto para la cola como para el worker.
 * `lazyConnect: true` evita que importar este módulo (p. ej. al cargar
 * `email.service.js` en los tests) abra una conexión real: solo conecta
 * cuando se emite el primer comando.
 *
 * `maxRetriesPerRequest: null` es un requisito de BullMQ para la conexión
 * del `Worker` (usa comandos bloqueantes) — aplicado también a la conexión
 * de la cola, un corte de Redis dejaría `addBulk` colgado para siempre (con
 * `enableOfflineQueue` activo por defecto, ioredis encola el comando sin
 * límite en vez de rechazarlo), y `POST /invitations/send` no respondería
 * nunca. Por eso aquí es opcional: solo el worker lo necesita.
 */
export function createRedisConnection({ forWorker = false } = {}) {
  return new IORedis(env.redisUrl, {
    maxRetriesPerRequest: forWorker ? null : 20,
    lazyConnect: true,
  });
}

export default { createRedisConnection };
