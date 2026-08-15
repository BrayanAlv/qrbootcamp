import crypto from 'node:crypto';
import { RefreshToken } from '../models/RefreshToken.model.js';

export function generateRefreshJti() {
  return crypto.randomUUID();
}

export async function issueRefreshToken({ jti, userId, expiresAt }) {
  await RefreshToken.create({ jti, userId, expiresAt });
}

export async function revokeRefreshToken(jti) {
  if (!jti) return;
  await RefreshToken.updateOne({ jti }, { $set: { revoked: true } });
}

// Rota un refresh token: revoca el actual y crea su sucesor.
export async function rotateRefreshToken({ oldJti, userId, newJti, expiresAt }) {
  await revokeRefreshToken(oldJti);
  await issueRefreshToken({ jti: newJti, userId, expiresAt });
}

// Valida que el jti exista, no esté revocado y pertenezca al usuario.
export async function findValidRefreshToken({ jti, userId }) {
  return RefreshToken.findOne({
    jti,
    userId,
    revoked: false,
    expiresAt: { $gt: new Date() },
  });
}

export default {
  generateRefreshJti,
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  findValidRefreshToken,
};