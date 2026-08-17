import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processEmailJob, handleJobFailed } from '../src/queues/email.worker.js';
import emailService from '../src/services/email.service.js';
import { newBatch, getBatch } from '../src/queues/emailBatchState.js';

test('processEmailJob delega en sendInvitationEmails y registra un envío correcto', async () => {
  const original = emailService.sendInvitationEmails;
  let calledWith;
  emailService.sendInvitationEmails = async (id) => {
    calledWith = id;
    return { sent: 1, errors: [], email: 'ana@ejemplo.com' };
  };
  try {
    newBatch('sender-w1', 1);
    await processEmailJob({ data: { invitationId: 'inv-1', senderId: 'sender-w1' } });
    assert.equal(calledWith, 'inv-1');
    const state = getBatch('sender-w1');
    assert.equal(state.sent, 1);
    assert.equal(state.running, false);
  } finally {
    emailService.sendInvitationEmails = original;
  }
});

test('processEmailJob registra el error cuando el envío falla sin lanzar', async () => {
  const original = emailService.sendInvitationEmails;
  emailService.sendInvitationEmails = async () => ({ sent: 0, errors: ['bounce'], email: 'ana@ejemplo.com' });
  try {
    newBatch('sender-w2', 1);
    await processEmailJob({ data: { invitationId: 'inv-2', senderId: 'sender-w2' } });
    const state = getBatch('sender-w2');
    assert.equal(state.failed, 1);
    assert.deepEqual(state.lastErrors, [{ guest: 'ana@ejemplo.com', error: 'bounce' }]);
  } finally {
    emailService.sendInvitationEmails = original;
  }
});

test('processEmailJob no cuenta una invitación saltada (ya usada/ya enviada) como fallo', async () => {
  const original = emailService.sendInvitationEmails;
  emailService.sendInvitationEmails = async () => ({ sent: 0, skipped: true, message: 'Correo ya enviado' });
  try {
    newBatch('sender-w3', 1);
    await processEmailJob({ data: { invitationId: 'inv-3', senderId: 'sender-w3' } });
    const state = getBatch('sender-w3');
    assert.equal(state.processed, 1);
    assert.equal(state.failed, 0);
    assert.deepEqual(state.lastErrors, []);
  } finally {
    emailService.sendInvitationEmails = original;
  }
});

test('handleJobFailed registra el fallo en el batch cuando se agotaron los reintentos', () => {
  newBatch('sender-w4', 1);
  handleJobFailed({ data: { senderId: 'sender-w4' }, attemptsMade: 3, opts: { attempts: 3 } }, new Error('mongo caído'));
  const state = getBatch('sender-w4');
  assert.equal(state.processed, 1);
  assert.equal(state.failed, 1);
  assert.equal(state.lastErrors[0].error, 'mongo caído');
});

test('handleJobFailed no registra nada si todavía quedan reintentos', () => {
  newBatch('sender-w5', 1);
  handleJobFailed({ data: { senderId: 'sender-w5' }, attemptsMade: 1, opts: { attempts: 3 } }, new Error('timeout'));
  const state = getBatch('sender-w5');
  assert.equal(state.processed, 0);
});
