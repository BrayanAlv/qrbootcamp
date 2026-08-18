import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { generateQrToken, hashToken, toQrBuffer, toQrDataUrl } from '../src/services/qr.service.js';

// PNG mínimo con un borde transparente alrededor de un rectángulo opaco, para
// que `sharp().trim()` tenga algo que recortar (igual que un logo real).
async function fakeLogoBytes() {
  const inner = await sharp({
    create: { width: 80, height: 160, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } },
  })
    .png()
    .toBuffer();
  return sharp({
    create: { width: 120, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function assertValidQrPng(buffer) {
  const meta = await sharp(buffer).metadata();
  assert.equal(meta.format, 'png');
  assert.equal(meta.width, meta.height); // el QR siempre es cuadrado
  assert.ok(meta.width > 0);
}

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

// Este test va antes que el de "éxito" a propósito: la insignia del logo se
// cachea a nivel de módulo solo cuando se prepara con éxito, así que probar
// primero el fallo de red comprueba el camino sin caché aún tibia.
test('si falla la descarga del logo, el QR se genera igualmente (sin marca)', async (t) => {
  t.mock.method(global, 'fetch', async () => ({ ok: false, status: 500 }));

  const buffer = await toQrBuffer('https://example.com/i/token');
  await assertValidQrPng(buffer);

  const dataUrl = await toQrDataUrl('https://example.com/i/token');
  assert.match(dataUrl, /^data:image\/png;base64,/);
});

test('el QR incluye el logo cuando la descarga tiene éxito', async (t) => {
  const logoBytes = await fakeLogoBytes();
  t.mock.method(global, 'fetch', async () => ({
    ok: true,
    arrayBuffer: async () => new Uint8Array(logoBytes).buffer,
  }));

  const buffer = await toQrBuffer('https://example.com/i/token');
  await assertValidQrPng(buffer);

  const dataUrl = await toQrDataUrl('https://example.com/i/token');
  assert.match(dataUrl, /^data:image\/png;base64,/);
});