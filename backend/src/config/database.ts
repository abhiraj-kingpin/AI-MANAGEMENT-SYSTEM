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

  // Explicit rather than left at the driver's defaults (maxPoolSize 100,
  // minPoolSize 0) — see env.ts's doc comment on MONGO_MAX_POOL_SIZE/
  // MONGO_MIN_POOL_SIZE. This used to be flagged in backend/README.md's
  // Performance Notes as "not yet done"; the actual throughput effect is
  // still unverified without a live multi-connection load test against a
  // real MongoDB instance (this environment has neither), so this is a
  // real, documented config change, not a measured tuning result.
  return mongoose.connect(env.MONGO_URI, {
    maxPoolSize: env.MONGO_MAX_POOL_SIZE,
    minPoolSize: env.MONGO_MIN_POOL_SIZE,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
}

/** Used by the readiness probe — true only when Mongo is actually connected (readyState 1). */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
