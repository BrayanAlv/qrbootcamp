import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildJobs, enqueuePendingInvitations, emailQueueAdapter, pendingQuery } from '../src/queues/email.queue.js';
import { Invitation } from '../src/models/Invitation.model.js';

test('pendingQuery excluye invitaciones ya usadas o con correo ya enviado', () => {
  assert.deepEqual(pendingQuery('sender-1'), {
    sender: 'sender-1',
    usedAt: null,
    'emailStatus.attendee': { $ne: true },
  });
});

test('buildJobs genera un job por invitación con jobId estable y reintentos', () => {
  const jobs = buildJobs(['inv-1', 'inv-2'], 'sender-1');
  assert.equal(jobs.length, 2);
  assert.equal(jobs[0].name, 'send-invitation');
  assert.deepEqual(jobs[0].data, { invitationId: 'inv-1', senderId: 'sender-1' });
  assert.equal(jobs[0].opts.jobId, 'inv-1');
  assert.equal(jobs[0].opts.attempts, 3);
  assert.equal(jobs[1].opts.jobId, 'inv-2');
});

test('enqueuePendingInvitations encola solo las invitaciones pendientes del admin', async () => {
  const originalFind = Invitation.find;
  const originalAddBulk = emailQueueAdapter.addBulk;
  let queried;
  let queuedJobs;
  Invitation.find = async (query) => {
    queried = query;
    return [{ _id: 'inv-1' }, { _id: 'inv-2' }];
  };
  emailQueueAdapter.addBulk = async (jobs) => {
    queuedJobs = jobs;
  };
  try {
    const result = await enqueuePendingInvitations('sender-1');
    assert.deepEqual(queried, pendingQuery('sender-1'));
    assert.equal(queuedJobs.length, 2);
    assert.equal(result.total, 2);
  } finally {
    Invitation.find = originalFind;
    emailQueueAdapter.addBulk = originalAddBulk;
  }
});

test('enqueuePendingInvitations no llama a la cola si no hay pendientes', async () => {
  const originalFind = Invitation.find;
  const originalAddBulk = emailQueueAdapter.addBulk;
  let called = false;
  Invitation.find = async () => [];
  emailQueueAdapter.addBulk = async () => {
    called = true;
  };
  try {
    const result = await enqueuePendingInvitations('sender-1');
    assert.equal(result.total, 0);
    assert.equal(called, false);
  } finally {
    Invitation.find = originalFind;
    emailQueueAdapter.addBulk = originalAddBulk;
  }
});
