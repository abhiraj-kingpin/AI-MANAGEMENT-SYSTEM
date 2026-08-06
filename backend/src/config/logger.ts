import path from 'node:path';
import winston from 'winston';
import { env, isProduction } from './env';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} ${level}: ${stack ?? message}${metaStr}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: isProduction ? prodFormat : devFormat,
  defaultMeta: { service: 'ai-management-system-api' },
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

if (isProduction) {
  // Persist errors to disk in addition to stdout when running in prod
  // (in container deployments this is typically also captured by the platform's log stream).
  logger.add(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
    }),
  );
}

/** Adapter so morgan can pipe HTTP access logs through winston. */
export const morganStream = {
  write: (message: string) => logger.http(message.trim()),
};
