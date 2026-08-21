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

// Console-only, deliberately, even in production — this used to also add a
// `winston.transports.File` writing to `logs/error.log`, which crashed the
// process outright on Render: the Dockerfile's runtime stage runs as a
// non-root `app` user with no write access to create a new directory under
// `/app`, so the very first log line threw EACCES before the server could
// even start listening (a real deploy failure, not a hypothetical one —
// see backend/CHANGELOG.md). Removed rather than patched around (e.g.
// pre-creating/chowning a logs/ dir in the Dockerfile) because a local log
// file is close to pointless on Render's ephemeral filesystem anyway — it
// vanishes on every restart or redeploy — while stdout is what Render (and
// most container platforms) actually capture and display, which every log
// line in this file already goes to regardless.
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: isProduction ? prodFormat : devFormat,
  defaultMeta: { service: 'ai-management-system-api' },
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

/** Adapter so morgan can pipe HTTP access logs through winston. */
export const morganStream = {
  write: (message: string) => logger.http(message.trim()),
};
