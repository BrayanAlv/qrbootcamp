import AppError from '../utils/ApiError.js';

// Requiere que `protect` ya haya cargado req.user; solo deja pasar rol admin.
export const requireAdmin = (req, _res, next) => {
  if (req.user?.role !== 'admin') {
    throw new AppError({ code: 'FORBIDDEN', message: 'Requiere rol administrador', httpStatus: 403 });
  }
  return next();
};

export default requireAdmin;
