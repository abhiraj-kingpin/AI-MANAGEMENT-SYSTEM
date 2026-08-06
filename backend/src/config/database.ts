import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';
// Side-effect import: registers every Mongoose model before anything connects.
import './registerModels';

mongoose.set('strictQuery', true);

export async function connectDatabase(): Promise<typeof mongoose> {
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB connection error', { err }));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  return mongoose.connect(env.MONGO_URI);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
}

/** Used by the readiness probe — true only when Mongo is actually connected (readyState 1). */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
