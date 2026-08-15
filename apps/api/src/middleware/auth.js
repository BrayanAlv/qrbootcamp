import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/ApiError.js';
import { verifyToken } from '../security/jwt.js';
import { User } from '../models/User.model.js';

// Protege rutas: valida el Bearer access token y carga el usuario.
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError({ code: 'UNAUTHORIZED', message: 'Autenticación requerida', httpStatus: 401 });
  }

  const payload = verifyToken(token);
  const user = await User.findById(payload.sub).select('-passwordHash');

  if (!user || !user.isActive) {
    throw new AppError({ code: 'FORBIDDEN', message: 'Acceso denegado', httpStatus: 403 });
  }

  req.user = user;
  req.auth = { userId: user._id.toString(), jti: payload.jti };
  return next();
});

export default protect;