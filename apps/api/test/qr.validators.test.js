import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractQrToken } from '../src/validators/qr.validators.js';
import { hashToken } from '../src/services/qr.service.js';
import { guestRowSchema } from '../src/validators/invitation.validators.js';

test('extractQrToken admite token puro', () => {
  assert.equal(extractQrToken('KZKQvj1BC_UbaVzw-jDAcSKE3K8dxsWSm2eBa007wBg'), 'KZKQvj1BC_UbaVzw-jDAcSKE3K8dxsWSm2eBa007wBg');
});

test('extractQrToken extrae de una URL completa con query', () => {
  const url = 'http://localhost/i/KZKQvj1BC_UbaVzw-jDAcSKE3K8dxsWSm2eBa007wBg?utm=e';
  assert.equal(extractQrToken(url), 'KZKQvj1BC_UbaVzw-jDAcSKE3K8dxsWSm2eBa007wBg');
});

test('accept: el hash de la URL normalizada coincide con el del token suelto', () => {
  const token = 'KZKQvj1BC_UbaVzw-jDAcSKE3K8dxsWSm2eBa007wBg';
  const url = `https://bootcamp.maderasstudio.com/i/${token}`;
  assert.equal(hashToken(extractQrToken(url)), hashToken(token));
});

test('extractQrToken rechaza strings cortos o vacíos', () => {
  assert.equal(extractQrToken(''), null);
  assert.equal(extractQrToken(null), null);
  assert.equal(extractQrToken('corto'), null);
});

test('guestRowSchema valida fila válida e inválida', () => {
  const ok = guestRowSchema.safeParse({
    region: 'CDMX',
    crmId: '12345',
    nombre: 'Ana',
    sede: 'Presencial',
    asiste: 'Sí',
    email: 'ana@x.com',
    emailCc: '',
  });
  assert.equal(ok.success, true);
  const bad = guestRowSchema.safeParse({
    region: 'CDMX',
    crmId: '',
    nombre: '',
    sede: '',
    asiste: '',
    email: 'mal',
    emailCc: '',
  });
  assert.equal(bad.success, false);
});

test('guestRowSchema acepta CORREO 1 inválido si CORREO 2 es válido, y lo usa como principal', () => {
  const parsed = guestRowSchema.safeParse({
    region: '',
    crmId: '999',
    nombre: 'Ana',
    sede: '',
    asiste: '',
    email: 'no-es-un-correo',
    emailCc: 'ana.cc@example.com',
  });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.email, 'ana.cc@example.com');
  assert.equal(parsed.data.emailCc, '');
});

test('guestRowSchema falla solo si NINGUNO de los dos correos es válido', () => {
  const parsed = guestRowSchema.safeParse({
    region: '',
    crmId: '999',
    nombre: 'Ana',
    sede: '',
    asiste: '',
    email: 'mal',
    emailCc: 'tambien-mal',
  });
  assert.equal(parsed.success, false);
  assert.equal(parsed.error.issues[0].message.includes('al menos un correo válido'), true);
});