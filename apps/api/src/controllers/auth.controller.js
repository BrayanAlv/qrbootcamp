import asyncHandler from '../utils/asyncHandler.js';
import { login, refresh, logout } from '../services/auth.service.js';
import { audit } from '../services/audit.service.js';
import env from '../config/env.js';

export const REFRESH_COOKIE = 'refresh_token';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días (pares con REFRESH_TOKEN_EXPIRES_IN)
  };
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
}

export const loginHandler = asyncHandler(async (req, res) => {
  try {
    const session = await login(req.body);
    await audit('login', { email: req.body.email, ip: req.ip });
    res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions());
    return res.status(200).json({
      success: true,
      data: { accessToken: session.accessToken, user: session.user },
    });
  } catch (error) {
    await audit(error.code === 'UNAUTHORIZED' ? 'login_failed' : 'security_error', { email: req.body.email, ip: req.ip, meta: { code: error.code } });
    throw error;
  }
});

export const refreshHandler = asyncHandler(async (req, res) => {
  const session = await refresh({ refreshTokenValue: req.cookies[REFRESH_COOKIE] });
  res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions());
  return res.status(200).json({
    success: true,
    data: { accessToken: session.accessToken, user: session.user },
  });
});

export const logoutHandler = asyncHandler(async (req, res) => {
  await logout({ refreshTokenValue: req.cookies[REFRESH_COOKIE] });
  clearRefreshCookie(res);
  await audit('logout', { email: req.user?.email ?? req.body?.email ?? null, ip: req.ip });
  return res.status(200).json({ success: true });
});

export const meHandler = asyncHandler(async (req, res) => {
  return res.status(200).json({ success: true, data: { user: req.user } });
});

export default { loginHandler, refreshHandler, logoutHandler, meHandler };