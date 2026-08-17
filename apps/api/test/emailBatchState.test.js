import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newBatch, getBatch, recordResult } from '../src/queues/emailBatchState.js';

test('newBatch queda corriendo si hay invitaciones pendientes', () => {
  const state = newBatch('sender-a', 3);
  assert.equal(state.running, true);
  assert.equal(state.total, 3);
  assert.equal(state.processed, 0);
  assert.deepEqual(getBatch('sender-a'), state);
});

test('newBatch con total 0 no queda corriendo', () => {
  const state = newBatch('sender-b', 0);
  assert.equal(state.running, false);
});

test('recordResult acumula envíos correctos y termina al llegar al total', () => {
  newBatch('sender-c', 2);
  recordResult('sender-c', { sent: true });
  assert.equal(getBatch('sender-c').processed, 1);
  assert.equal(getBatch('sender-c').running, true);

  recordResult('sender-c', { sent: true });
  assert.equal(getBatch('sender-c').processed, 2);
  assert.equal(getBatch('sender-c').running, false);
});

test('recordResult acumula fallos con su error, acotado a 20 entradas', () => {
  newBatch('sender-d', 1);
  recordResult('sender-d', { sent: false, error: 'bounce', guestEmail: 'ana@ejemplo.com' });
  const state = getBatch('sender-d');
  assert.equal(state.failed, 1);
  assert.deepEqual(state.lastErrors, [{ guest: 'ana@ejemplo.com', error: 'bounce' }]);
});

test('recordResult acota lastErrors a 20 entradas, descartando la más antigua (FIFO)', () => {
  newBatch('sender-e', 25);
  for (let i = 0; i < 25; i += 1) {
    recordResult('sender-e', { sent: false, error: `error-${i}`, guestEmail: `g${i}@ejemplo.com` });
  }
  const state = getBatch('sender-e');
  assert.equal(state.lastErrors.length, 20);
  // Se descartaron los 5 más antiguos (error-0..error-4); el primero que queda es error-5.
  assert.equal(state.lastErrors[0].error, 'error-5');
  assert.equal(state.lastErrors[19].error, 'error-24');
});

test('recordResult ignora un senderId sin batch en curso', () => {
  assert.doesNotThrow(() => recordResult('sender-inexistente', { sent: true }));
});
