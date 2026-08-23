import type { Request, Response } from 'express';

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
