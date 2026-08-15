import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQrToken, hashToken } from '../src/services/qr.service.js';

test('el token QR tiene longitud suficiente (32 bytes -> base64url)', () => {
  const t = generateQrToken();
  assert.equal(t.length >= 40, true);
  assert.equal(/^[A-Za-z0-9_-]+$/.test(t), true);
});

test('los tokens son impredecibles (no se repiten)', () => {
  const set = new Set(Array.from({ length: 200 }, () => generateQrToken()));
  assert.equal(set.size, 200);
});

test('el hash es determinista y no contiene el token original', () => {
  const t = generateQrToken();
  const h1 = hashToken(t);
  const h2 = hashToken(t);
  assert.equal(h1, h2); // mismo token -> mismo hash
  assert.equal(hashToken('a'), hashToken('a'));
  assert.notEqual(hashToken('aaa'), hashToken('aab'));
  assert.equal(h1.length, 64); // sha256 hex
});