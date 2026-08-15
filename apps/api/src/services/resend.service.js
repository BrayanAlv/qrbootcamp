import { Resend } from 'resend';
import env from '../config/env.js';

let client = null;

export function getResendClient() {
  if (!env.resendApiKey) return null;
  if (!client) {
    client = new Resend(env.resendApiKey);
  }
  return client;
}

const TIMEOUT_MS = 30000;
// Esperas antes de cada reintento. La longitud del array define cuántos se hacen.
const RETRY_DELAYS_MS = [500, 1500];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 429 y 5xx son transitorios. Los 4xx de validación (dominio sin verificar,
// destinatario inválido) son deterministas: reintentarlos solo gasta cuota.
const isRetryable = (statusCode) => statusCode === 429 || (statusCode >= 500 && statusCode <= 599);

// ---------------------------------------------------------------------------
// Control de ritmo
// Resend limita a 10 req/s por equipo y `sendAllPendingEmails` puede encadenar
// cientos de envíos dentro de un mismo request. Esta cadena de promesas serializa
// las llamadas salientes y garantiza un hueco mínimo entre ellas.
// ---------------------------------------------------------------------------
let queue = Promise.resolve();
let lastCallAt = 0;

function throttled(fn) {
  const run = queue.then(async () => {
    const wait = lastCallAt + Math.ceil(1000 / env.emailRatePerSec) - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    return fn();
  });
  // La cola no debe romperse porque un envío concreto falle.
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function withTimeout(promise) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout tras ${TIMEOUT_MS} ms`)), TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Envía un correo transaccional vía Resend.
 * Devuelve siempre `{ ok, id, error }`: el SDK no lanza ante errores de la API,
 * los entrega en `error`, así que el éxito se normaliza aquí y quien llama no
 * necesita conocer el formato del proveedor.
 * En modo desarrollo sin API key, simula el envío.
 *
 * @param {object} payload  Cuerpo de https://resend.com/docs/api-reference/emails/send-email
 * @param {{ idempotencyKey?: string }} [options]  Clave de idempotencia (TTL 24 h en Resend)
 */
export async function sendTransactionalEmail(payload, { idempotencyKey } = {}) {
  const resend = getResendClient();

  if (!resend) {
    // Modo desarrollo: sin API key no se envía de verdad.
    console.log('[resend][simulado] a:', payload.to?.[0], '| subject:', payload.subject);
    return { ok: true, id: null, error: null, simulated: true };
  }

  const requestOptions = idempotencyKey ? { idempotencyKey } : undefined;

  for (let attempt = 0; ; attempt += 1) {
    let result;

    try {
      result = await throttled(() => withTimeout(resend.emails.send(payload, requestOptions)));
    } catch (e) {
      // Aquí solo caen fallos de red y timeouts; son transitorios.
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      const message = e?.message ?? String(e);
      console.error('[resend] fallo de red al enviar:', message);
      return { ok: false, id: null, error: message };
    }

    const { data, error } = result ?? {};

    if (!error) return { ok: true, id: data?.id ?? null, error: null };

    if (isRetryable(error.statusCode) && attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }

    console.error('[resend] error al enviar:', error.name, '-', error.message);
    return { ok: false, id: null, error: `${error.name}: ${error.message}` };
  }
}

export default { getResendClient, sendTransactionalEmail };
