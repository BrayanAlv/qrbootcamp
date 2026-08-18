import { test } from 'node:test';
import assert from 'node:assert/strict';

// Debe fijarse antes de importar los módulos: `env.js` lee process.env al cargarse.
process.env.EMAIL_FROM = 'no-reply@dominio.com';
process.env.EMAIL_FROM_NAME = 'QR Invitations';
process.env.EMAIL_RATE_PER_SEC = '10'; // 100 ms entre envíos
process.env.RESEND_API_KEY = 're_test_key';

const { buildMessage, buildText } = await import('../src/services/email.service.js');
const { getResendClient, sendTransactionalEmail } = await import('../src/services/resend.service.js');

const qrBuffer = Buffer.from('fake-png-bytes');

test('buildMessage produce el formato de la API de Resend', () => {
  const msg = buildMessage({
    to: { name: 'Ana Pérez, Jr.', email: 'ana@ejemplo.com' },
    subject: 'Tienes una invitación',
    html: '<p>hola</p>',
    text: 'hola',
    qrBuffer,
  });

  assert.equal(msg.from, 'QR Invitations <no-reply@dominio.com>');
  // Solo la dirección: un nombre con coma rompería la cabecera "Nombre <correo>".
  assert.deepEqual(msg.to, ['ana@ejemplo.com']);
  assert.equal(msg.subject, 'Tienes una invitación');
  assert.equal(msg.html, '<p>hola</p>');
  assert.equal(msg.text, 'hola');
  // Sin asistente no se manda la clave: Resend rechaza un `cc` vacío.
  assert.equal('cc' in msg, false);
});

test('buildMessage pone al asistente en copia, solo con su dirección', () => {
  const msg = buildMessage({
    to: { name: 'Ana Pérez', email: 'ana@ejemplo.com' },
    cc: ['asistente@ejemplo.com'],
    subject: 'Tu acceso',
    html: '',
    text: '',
    qrBuffer,
  });

  assert.deepEqual(msg.to, ['ana@ejemplo.com']);
  assert.deepEqual(msg.cc, ['asistente@ejemplo.com']);
});

test('buildMessage adjunta el QR inline con contentId y contenido en base64', () => {
  const msg = buildMessage({ to: { email: 'ana@ejemplo.com' }, subject: 's', html: '', text: '', qrBuffer });

  assert.equal(msg.attachments.length, 1);
  const [qr] = msg.attachments;
  assert.equal(qr.filename, 'invitacion-qr.png');
  assert.equal(qr.contentId, 'qr-invitacion');
  assert.equal(qr.content, qrBuffer.toString('base64'));
  // Sin contentType explícito Resend puede mandarlo como application/octet-stream
  // y Gmail deja de resolver el `cid:`: el QR llega como imagen rota.
  assert.equal(qr.contentType, 'image/png');
});

test('buildText saluda por el nombre y remite al QR adjunto, sin enlaces', () => {
  const text = buildText({ fullName: 'Ana' });

  assert.match(text, /Hola, Ana/);
  assert.match(text, /código QR/);
  assert.match(text, /un solo uso/);
  // El acceso es el QR que escanea el staff: no hay página pública a la que enlazar.
  assert.doesNotMatch(text, /https?:\/\//);
});

test('un envío correcto se normaliza a { ok: true, id }', async (t) => {
  const client = getResendClient();
  t.mock.method(client.emails, 'send', async () => ({ data: { id: 'email-123' }, error: null }));

  const res = await sendTransactionalEmail({ to: ['ana@ejemplo.com'], subject: 's' });

  assert.deepEqual(res, { ok: true, id: 'email-123', error: null });
});

test('un error de la API se normaliza a { ok: false } sin lanzar', async (t) => {
  const client = getResendClient();
  t.mock.method(console, 'error', () => {});
  const send = t.mock.method(client.emails, 'send', async () => ({
    data: null,
    error: { name: 'validation_error', message: 'Invalid `to` field', statusCode: 422 },
  }));

  const res = await sendTransactionalEmail({ to: ['roto'], subject: 's' });

  assert.equal(res.ok, false);
  assert.match(res.error, /validation_error/);
  // Un 422 es determinista: reintentarlo solo gastaría cuota.
  assert.equal(send.mock.callCount(), 1);
});

test('un 429 se reintenta hasta lograr el envío', async (t) => {
  const client = getResendClient();
  let calls = 0;
  const send = t.mock.method(client.emails, 'send', async () => {
    calls += 1;
    if (calls === 1) {
      return { data: null, error: { name: 'rate_limit_exceeded', message: 'Too many requests', statusCode: 429 } };
    }
    return { data: { id: 'email-456' }, error: null };
  });

  const res = await sendTransactionalEmail({ to: ['ana@ejemplo.com'], subject: 's' });

  assert.equal(res.ok, true);
  assert.equal(res.id, 'email-456');
  assert.equal(send.mock.callCount(), 2);
});

test('la clave de idempotencia se pasa al SDK como segundo argumento', async (t) => {
  const client = getResendClient();
  const send = t.mock.method(client.emails, 'send', async () => ({ data: { id: 'e1' }, error: null }));

  await sendTransactionalEmail({ to: ['ana@ejemplo.com'], subject: 's' }, { idempotencyKey: 'inv-1-guest-abc' });

  assert.deepEqual(send.mock.calls[0].arguments[1], { idempotencyKey: 'inv-1-guest-abc' });
});

test('el control de ritmo espacia las llamadas consecutivas', async (t) => {
  const client = getResendClient();
  t.mock.method(client.emails, 'send', async () => ({ data: { id: 'e' }, error: null }));

  const started = Date.now();
  await Promise.all([
    sendTransactionalEmail({ to: ['a@ejemplo.com'], subject: 's' }),
    sendTransactionalEmail({ to: ['b@ejemplo.com'], subject: 's' }),
    sendTransactionalEmail({ to: ['c@ejemplo.com'], subject: 's' }),
  ]);

  // 3 envíos a 10/s => al menos 2 huecos de 100 ms.
  assert.ok(Date.now() - started >= 200, 'los envíos no deben salir todos a la vez');
});

test('sendInvitationEmails incluye el correo del invitado en el resultado', async (t) => {
  const { Invitation } = await import('../src/models/Invitation.model.js');
  const { getResendClient } = await import('../src/services/resend.service.js');
  const { sendInvitationEmails } = await import('../src/services/email.service.js');

  // El archivo ya fija RESEND_API_KEY='re_test_key' arriba, así que hay un
  // cliente real de Resend: sin mockear `emails.send` este test haría una
  // llamada de red de verdad. Igual que los demás tests del archivo, se
  // mockea el método del cliente.
  const client = getResendClient();
  t.mock.method(client.emails, 'send', async () => ({ data: { id: 'email-1' }, error: null }));

  const fakeInvitation = {
    _id: 'inv-1',
    usedAt: null,
    emailStatus: { attendee: false },
    guest: { name: 'Ana Pérez', email: 'ana@ejemplo.com' },
    ccEmail: null,
  };
  const originalFindById = Invitation.findById;
  const originalUpdateOne = Invitation.updateOne;
  // `generateQrForInvitation` (qr.service.js) también llama a `Invitation.updateOne`
  // para persistir el hash del QR: el mismo mock cubre esa llamada.
  Invitation.findById = async () => fakeInvitation;
  Invitation.updateOne = async () => ({});

  try {
    const result = await sendInvitationEmails('inv-1');
    assert.equal(result.email, 'ana@ejemplo.com');
  } finally {
    Invitation.findById = originalFindById;
    Invitation.updateOne = originalUpdateOne;
  }
});
