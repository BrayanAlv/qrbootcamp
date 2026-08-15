import env from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const status = err.httpStatus ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';
  const message = err.message ?? 'Error interno del servidor';

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(`[api-error] ${status} ${code}: ${message}`, err.stack);
  }

  const body = {
    success: false,
    error: { code, message },
  };

  if (err.details) {
    body.error.details = err.details;
  }

  if (env.nodeEnv !== 'production' && status >= 500) {
    body.error.stack = err.stack;
  }

  return res.status(status).json(body);
}