import mongoose from 'mongoose';
import env from './env.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
  // eslint-disable-next-line no-console
  console.log('[db] MongoDB conectado');
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export default { connectDb, isDbConnected };