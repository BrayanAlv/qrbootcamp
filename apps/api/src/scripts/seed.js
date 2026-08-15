// Siembra el primer usuario administrador.
// Uso:  docker compose exec api node src/scripts/seed.js
import mongoose from 'mongoose';
import env from '../config/env.js';
import { User } from '../models/User.model.js';
import { hashPassword } from '../services/password.service.js';

const EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@dominio.com';
const NAME = process.env.SEED_ADMIN_NAME ?? 'Administrador';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? null;

if (!PASSWORD || PASSWORD.length < 8) {
  // eslint-disable-next-line no-console
  console.error('[seed] Define SEED_ADMIN_PASSWORD (>= 8 caracteres).');
  process.exit(1);
}

await mongoose.connect(env.mongoUri);

const existing = await User.findOne({ email: EMAIL });
if (existing) {
  // eslint-disable-next-line no-console
  console.log(`[seed] El usuario ${EMAIL} ya existe.`);
} else {
  const passwordHash = await hashPassword(PASSWORD);
  await User.create({ email: EMAIL, name: NAME, role: 'admin', passwordHash });
  // eslint-disable-next-line no-console
  console.log(`[seed] Usuario admin creado: ${EMAIL}`);
}

await mongoose.disconnect();