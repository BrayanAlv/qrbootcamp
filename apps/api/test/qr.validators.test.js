import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractQrToken } from '../src/validators/qr.validators.js';
import { guestRowSchema } from '../src/validators/invitation.validators.js';

test('extractQrToken admite token puro', () => {
  assert.equal(extractQrToken('KZKQvj1BC_UbaVzw-jDAcSKE3K8dxsWSm2eBa007wBg'), 'KZKQvj1BC_UbaVzw-jDAcSKE3K8dxsWSm2eBa007wBg');
});

test('extractQrToken extrae de una URL completa con query', () => {
  const url = 'http://localhost/i/KZKQvj1BC_UbaVzw-jDAcSKE3K8dxsWSm2eBa007wBg?utm=e';
  assert.equal(extractQrToken(url), 'KZKQvj1BC_UbaVzw-jDAcSKE3K8dxsWSm2eBa007wBg');
});

test('extractQrToken rechaza strings cortos o vacíos', () => {
  assert.equal(extractQrToken(''), null);
  assert.equal(extractQrToken(null), null);
  assert.equal(extractQrToken('corto'), null);
});

test('guestRowSchema valida fila válida e inválida', () => {
  const ok = guestRowSchema.safeParse({ nombre: 'Ana', email: 'ana@x.com', nombre_asistente: '', email_asistente: '' });
  assert.equal(ok.success, true);
  const bad = guestRowSchema.safeParse({ nombre: '', email: 'mal', nombre_asistente: '', email_asistente: '' });
  assert.equal(bad.success, false);
});