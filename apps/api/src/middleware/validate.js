import { z } from 'zod';
import AppError from '../utils/ApiError.js';

// Valida body/params/query/headers/cookies con Zod.
// Acepta un esquema `z.object({ body, params, ... })` (se leen sus secciones desde `.shape`)
// o un objeto plano `{ body: ZodSchema, ... }`.
export function validate(schema = {}) {
  const { body, params, query, headers, cookies } = schema?.shape ?? schema;
  return function validator(req, _res, next) {
    try {
      if (body) assign(req, 'body', body.parse(req.body));
      if (params) assign(req, 'params', params.parse(req.params));
      if (query) assign(req, 'query', query.parse(req.query));
      if (headers) assign(req, 'headers', headers.parse(req.headers));
      if (cookies) assign(req, 'cookies', cookies.parse(req.cookies));
      next();
    } catch (error) {
      const issues = extractZodIssues(error);
      return next(
        new AppError({
          code: 'VALIDATION_ERROR',
          message: 'Datos inválidos',
          httpStatus: 400,
          details: issues,
        }),
      );
    }
  };
}

// `req.query` es un getter sin setter en el prototipo de Express: en modo estricto (ESM)
// una asignación normal lanzaría TypeError. defineProperty lo sombrea sin riesgo.
function assign(req, key, value) {
  Object.defineProperty(req, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

function extractZodIssues(error) {
  if (!(error instanceof z.ZodError)) return undefined;
  return error.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }));
}

export default validate;