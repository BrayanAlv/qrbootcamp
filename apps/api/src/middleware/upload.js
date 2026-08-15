import multer from 'multer';
import AppError from '../utils/ApiError.js';

const ALLOWED = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];

// Subida en memoria (los archivos son pequeños). Límites estrictos.
export const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (!ALLOWED.includes(file.mimetype) && !['xlsx', 'xls', 'csv'].includes(ext)) {
      return cb(
        new AppError({ code: 'VALIDATION_ERROR', message: 'Solo se permiten archivos .xlsx, .xls o .csv', httpStatus: 400 }),
      );
    }
    return cb(null, true);
  },
});

export default uploadExcel;