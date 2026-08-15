import AppError from '../utils/ApiError.js';
import { User } from '../models/User.model.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../security/jwt.js';
import { verifyPassword } from './password.service.js';
import {
  generateRefreshJti,
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  findValidRefreshToken,
} from './token.service.js';
import env from '../config/env.js';

function msFromExpiresIn(string) {
  const match = string.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return value * unit;
}

export async function login({ email, password }) {
  const user = await User.findOne({ email, isActive: true }).select('+passwordHash');
  if (!user) {
    throw new AppError({ code: 'UNAUTHORIZED', message: 'Credenciales inválidas', httpStatus: 401 });
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    throw new AppError({ code: 'UNAUTHORIZED', message: 'Credenciales inválidas', httpStatus: 401 });
  }

  return issueSession(user);
}

export async function refresh({ refreshTokenValue }) {
  const payload = verifyToken(refreshTokenValue, { type: 'refresh' });

  const stored = await findValidRefreshToken({ jti: payload.jti, userId: payload.sub });
  if (!stored) {
    throw new AppError({ code: 'UNAUTHORIZED', message: 'Sesión inválida', httpStatus: 401 });
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new AppError({ code: 'UNAUTHORIZED', message: 'Usuario inactivo', httpStatus: 401 });
  }

  // Rotación de refresh token (reutilización).
  const oldJti = payload.jti;
  const newJti = generateRefreshJti();
  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString(), newJti);

  const expiresAt = new Date(Date.now() + msFromExpiresIn(env.refreshTokenExpiresIn));
  await rotateRefreshToken({ oldJti, userId: user._id, newJti, expiresAt });

  return { accessToken, refreshToken, user };
}

export async function logout({ refreshTokenValue }) {
  if (!refreshTokenValue) return;
  let jti = null;
  try {
    jti = verifyToken(refreshTokenValue, { type: 'refresh' }).jti;
  } catch {
    jti = null; // token inválido: aun así se limpia la cookie
  }
  if (jti) await revokeRefreshToken(jti);
}

async function issueSession(user) {
  const jti = generateRefreshJti();
  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString(), jti);

  const expiresAt = new Date(Date.now() + msFromExpiresIn(env.refreshTokenExpiresIn));
  await issueRefreshToken({ jti, userId: user._id, expiresAt });

  return { accessToken, refreshToken, user };
}

export default { login, refresh, logout };