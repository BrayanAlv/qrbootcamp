import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/services/password.service.js';

test('hashPassword genera hash Argon2id y verifyPassword valida', async () => {
  const h = await hashPassword('MiClave#123');
  assert.equal(h.startsWith('$argon2id$'), true);
  assert.equal(await verifyPassword(h, 'MiClave#123'), true);
  assert.equal(await verifyPassword(h, 'incorrecta'), false);
});

test('cada hash es único (sal aleatoria)', async () => {
  const a = await hashPassword('clave');
  const b = await hashPassword('clave');
  assert.notEqual(a, b);
});