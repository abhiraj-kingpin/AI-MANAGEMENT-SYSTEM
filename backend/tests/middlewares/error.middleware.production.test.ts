import type { Request, Response } from 'express';

// A separate file (rather than toggling a variable mid-suite) because
// `isProduction` is computed once at module load from `env.NODE_ENV` —
// jest.mock is hoisted and file-scoped, which is exactly what's needed to
// exercise the production branch without touching the real environment
// every other test file in this suite runs under (NODE_ENV=test).
// `env.LOG_LEVEL` must still be real-ish since error.middleware.ts pulls in
// config/logger.ts, which reads it at module-load time to build the
// winston instance.
jest.mock('../../src/config/env', () => ({ isProduction: true, env: { LOG_LEVEL: 'error' } }));

import { errorHandler } from '../../src/middlewares/error.middleware';
import { AppError } from '../../src/shared/errors/AppError';

function fakeReq(): Request {
  return { originalUrl: '/api/v1/test', method: 'GET' } as Request;
}

function fakeRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler — production mode (isProduction=true)', () => {
  it("hides an unrecognized error's real message behind a generic one", () => {
    const res = fakeRes();
    const err = new Error('a stack trace could leak internals here');

    errorHandler(err, fakeReq(), res, jest.fn());

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.message).toBe('Something went wrong. Please try again later.');
    expect(body.error.message).not.toContain('leak internals');
  });

  it('never attaches a stack trace to the response', () => {
    const res = fakeRes();
    const err = new Error('boom');

    errorHandler(err, fakeReq(), res, jest.fn());

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.stack).toBeUndefined();
  });

  it("still exposes an AppError's deliberate, safe-by-design message (operational errors are meant to be shown)", () => {
    const res = fakeRes();
    const err = AppError.notFound('Employee not found.');

    errorHandler(err, fakeReq(), res, jest.fn());

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.message).toBe('Employee not found.');
  });
});
