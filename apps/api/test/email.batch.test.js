import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.EMAIL_FROM = 'no-reply@dominio.com';
process.env.EMAIL_FROM_NAME = 'QR Invitations';

const { startPendingEmailsBatch, getBatchStatus } = await import('../src/services/email.service.js');
const { default: emailQueue } = await import('../src/queues/email.queue.js');

test('startPendingEmailsBatch encola lo pendiente y devuelve el estado inicial', async () => {
  const original = emailQueue.enqueuePendingInvitations;
  emailQueue.enqueuePendingInvitations = async () => ({ total: 3 });
  try {
    const state = await startPendingEmailsBatch('sender-batch-1');
    assert.equal(state.total, 3);
    assert.equal(state.running, true);
    assert.equal(state.processed, 0);
  } finally {
    emailQueue.enqueuePendingInvitations = original;
  }
});

test('startPendingEmailsBatch reutiliza el batch si ya hay uno corriendo', async () => {
  const original = emailQueue.enqueuePendingInvitations;
  let calls = 0;
  emailQueue.enqueuePendingInvitations = async () => {
    calls += 1;
    return { total: 5 };
  };
  try {
    const first = await startPendingEmailsBatch('sender-batch-2');
    const second = await startPendingEmailsBatch('sender-batch-2');
    assert.equal(second, first);
    assert.equal(calls, 1);
  } finally {
    emailQueue.enqueuePendingInvitations = original;
  }
});

test('getBatchStatus cae a los conteos de Mongo cuando no hay batch en memoria', async () => {
  const originalPending = emailQueue.countPending;
  const originalFailed = emailQueue.countFailed;
  emailQueue.countPending = async () => 7;
  emailQueue.countFailed = async () => 2;
  try {
    const state = await getBatchStatus('sender-batch-nunca-lanzado');
    assert.equal(state.running, false);
    assert.equal(state.pendientes, 7);
    assert.equal(state.fallidos, 2);
  } finally {
    emailQueue.countPending = originalPending;
    emailQueue.countFailed = originalFailed;
  }
});
