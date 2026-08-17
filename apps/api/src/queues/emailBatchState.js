const MAX_LAST_ERRORS = 20;

// Progreso en memoria del batch en curso por admin. Lo actualiza el worker
// (`recordResult`) a medida que procesa jobs y lo lee `GET /invitations/send/status`.
// Vive solo mientras el proceso corre: un reinicio no pierde ningún envío (los
// jobs siguen en Redis y `emailStatus.attendee` en Mongo es la fuente real de
// qué ya se envió), solo se pierde la barra de progreso en curso, que se
// retoma con el siguiente "Enviar pendientes".
const batches = new Map();

export function newBatch(senderId, total) {
  const state = { running: total > 0, total, processed: 0, sent: 0, failed: 0, startedAt: new Date(), lastErrors: [] };
  batches.set(senderId, state);
  return state;
}

export function getBatch(senderId) {
  return batches.get(senderId) ?? null;
}

export function recordResult(senderId, { sent, error, guestEmail }) {
  const state = batches.get(senderId);
  if (!state) return;
  state.processed += 1;
  if (sent) {
    state.sent += 1;
  } else {
    state.failed += 1;
    state.lastErrors.push({ guest: guestEmail, error: error ?? 'error desconocido' });
    if (state.lastErrors.length > MAX_LAST_ERRORS) state.lastErrors.shift();
  }
  if (state.processed >= state.total) state.running = false;
}

const emailBatchState = { newBatch, getBatch, recordResult };
export default emailBatchState;
