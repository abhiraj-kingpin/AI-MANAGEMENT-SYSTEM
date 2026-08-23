import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';
import './registerModels';

mongoose.set('strictQuery', true);

export async function connectDatabase(): Promise<typeof mongoose> {
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB connection error', { err }));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  return mongoose.connect(env.MONGO_URI, {
    maxPoolSize: env.MONGO_MAX_POOL_SIZE,
    minPoolSize: env.MONGO_MIN_POOL_SIZE,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
