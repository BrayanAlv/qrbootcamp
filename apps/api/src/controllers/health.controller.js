import { health } from '../services/health.service.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getHealth = asyncHandler(async (_req, res) => {
  const data = await health();
  return res.status(200).json(data);
});