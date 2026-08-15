import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import env from '../config/env.js';
import { jwtPrivateKey, jwtPublicKey, assertKeysDefined } from './keys.js';
import AppError from '../utils/ApiError.js';

const ALGORITHM = 'RS256';

function baseClaims(sub) {
  return {
    iss: env.jwtIssuer,
    aud: env.jwtAudience,
    sub,
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(),
  };
}

export function signAccessToken(userId) {
  assertKeysDefined();
  return jwt.sign(baseClaims(userId), jwtPrivateKey, {
    algorithm: ALGORITHM,
    expiresIn: env.accessTokenExpiresIn,
  });
}

export function signRefreshToken(userId, jti) {
  assertKeysDefined();
  return jwt.sign(
    { ...baseClaims(userId), jti },
    jwtPrivateKey,
    { algorithm: ALGORITHM, expiresIn: env.refreshTokenExpiresIn },
  );
}

export function verifyToken(token, { type } = {}) {
  assertKeysDefined();
  try {
    const payload = jwt.verify(token, jwtPublicKey, {
      algorithms: [ALGORITHM],
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
      ignoreExpiration: false,
      // En verificación normal no aceptamos tokens sin exp (require exp/iat/jti)
      requiredClaims: ['sub', 'exp', 'iat', 'jti', 'iss', 'aud'],
    });
    if (type === 'refresh' && !payload.jti) {
      throw new AppError({ code: 'UNAUTHORIZED', message: 'Token inválido', httpStatus: 401 });
    }
    return payload;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error?.name === 'TokenExpiredError') {
      throw new AppError({ code: 'UNAUTHORIZED', message: 'Token expirado', httpStatus: 401 });
    }
    throw new AppError({ code: 'UNAUTHORIZED', message: 'Token inválido', httpStatus: 401 });
  }
}

export default { signAccessToken, signRefreshToken, verifyToken };