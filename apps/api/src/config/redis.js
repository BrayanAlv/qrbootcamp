import IORedis from 'ioredis';
import env from './env.js';

/**
 * Crea una conexión de Redis dedicada. BullMQ exige que cada `Worker` tenga
 * su propia conexión (usa comandos bloqueantes); aquí cada llamada crea una
 * nueva por simplicidad, tanto para la cola como para el worker.
 * `lazyConnect: true` evita que importar este módulo (p. ej. al cargar
 * `email.service.js` en los tests) abra una conexión real: solo conecta
 * cuando se emite el primer comando.
 */
export function createRedisConnection() {
  return new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
}

export default { createRedisConnection };
