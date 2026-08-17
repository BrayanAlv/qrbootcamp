import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRedisConnection } from '../src/config/redis.js';

test('createRedisConnection por defecto limita los reintentos (uso para la cola)', () => {
  const conn = createRedisConnection();
  assert.equal(conn.options.maxRetriesPerRequest, 20);
  assert.equal(conn.options.lazyConnect, true);
  conn.disconnect();
});

test('createRedisConnection con forWorker:true desactiva el límite (requisito de BullMQ Worker)', () => {
  const conn = createRedisConnection({ forWorker: true });
  assert.equal(conn.options.maxRetriesPerRequest, null);
  conn.disconnect();
});
