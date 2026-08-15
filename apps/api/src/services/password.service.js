import { hash, verify, Algorithm } from '@node-rs/argon2';

// Argon2id: algoritmo recomendado para almacenar contraseñas.
const ARGON_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  m: 65536, // 64 MiB
  t: 3,
  p: 4,
};

export async function hashPassword(password) {
  return hash(password, ARGON_OPTIONS);
}

export async function verifyPassword(passwordHash, password) {
  return verify(passwordHash, password);
}

export default { hashPassword, verifyPassword };