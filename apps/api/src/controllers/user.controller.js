import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/ApiError.js';
import { User } from '../models/User.model.js';
import { hashPassword } from '../services/password.service.js';
import { audit } from '../services/audit.service.js';

const USER_LIST_SELECT = 'name email role isActive createdAt';

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'user' } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    throw new AppError({ code: 'VALIDATION_ERROR', message: 'Ya existe un usuario con ese correo', httpStatus: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email, passwordHash, role });
  await audit('user_created', {
    userId: req.user?._id,
    email: req.user?.email,
    ip: req.ip,
    meta: { targetEmail: email, role },
  });

  return res.status(201).json({ success: true, data: user });
});

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: 1 }).select(USER_LIST_SELECT);
  return res.status(200).json({ success: true, data: users });
});

export const updateUser = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const patch = req.body;

  if (String(id) === String(req.user._id) && (('isActive' in patch && patch.isActive === false) || ('role' in patch && patch.role !== 'admin'))) {
    throw new AppError({ code: 'FORBIDDEN', message: 'No puedes desactivarte ni quitarte el rol admin', httpStatus: 403 });
  }

  const user = await User.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).select(USER_LIST_SELECT);
  if (!user) {
    throw new AppError({ code: 'NOT_FOUND', message: 'Usuario no encontrado', httpStatus: 404 });
  }

  await audit('user_updated', {
    userId: req.user?._id,
    email: req.user?.email,
    ip: req.ip,
    meta: { target: id, patch },
  });

  return res.status(200).json({ success: true, data: user });
});

export default { createUser, listUsers, updateUser };