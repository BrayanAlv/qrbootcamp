import { isDbConnected } from '../config/db.js';

export async function health() {
  return {
    success: true,
    status: 'ok',
    db: isDbConnected() ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  };
}