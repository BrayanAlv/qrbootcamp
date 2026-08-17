import AppError from '../utils/ApiError.js';

// Requiere que `protect` ya haya cargado req.user; deja pasar rol admin y user
// (los roles limitados de escaneo/lectura). Bloquea cualquier rol futuro.
export const requireUser = (req, _res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'user') {
    throw new AppError({ code: 'FORBIDDEN', message: 'Requiere rol de acceso', httpStatus: 403 });
  }
  return next();
};

export default requireUser;