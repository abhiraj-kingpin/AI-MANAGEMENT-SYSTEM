import type { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import multer from 'multer';
import { z } from 'zod';
import { errorHandler } from '../../src/middlewares/error.middleware';
import { AppError } from '../../src/shared/errors/AppError';

function fakeReq(overrides: Partial<Request> = {}): Request {
  return { originalUrl: '/api/v1/test', method: 'GET', ...overrides } as Request;
}

function fakeRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler — development mode (NODE_ENV=test, isProduction=false)', () => {
  it('maps an AppError to its own statusCode/code/message/details', () => {
    const res = fakeRes();
    const err = AppError.badRequest('Bad input', 'BAD_INPUT', { field: 'email' });

    errorHandler(err, fakeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'BAD_INPUT',
          message: 'Bad input',
          details: { field: 'email' },
        }),
      }),
    );
  });

  it('maps a ZodError to 422 VALIDATION_ERROR with flattened details', () => {
    const res = fakeRes();
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: 'not-an-email' });
    if (result.success) throw new Error('expected validation to fail');

    errorHandler(result.error, fakeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(422);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual(result.error.flatten());
  });

  it('maps a Mongoose ValidationError to 422 with a path->message map', () => {
    const res = fakeRes();
    const err = new MongooseError.ValidationError();
    err.errors = {
      email: new MongooseError.ValidatorError({ message: 'Invalid email', path: 'email' }),
    };

    errorHandler(err, fakeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          details: { email: 'Invalid email' },
        }),
      }),
    );
  });

  it('maps a Mongoose CastError to 400 INVALID_ID naming the offending path', () => {
    const res = fakeRes();
    const err = new MongooseError.CastError('ObjectId', 'not-an-id', 'employeeId');

    errorHandler(err, fakeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INVALID_ID',
          message: expect.stringContaining('employeeId'),
        }),
      }),
    );
  });

  it('maps a file-too-large Multer error to 413', () => {
    const res = fakeRes();
    const err = new multer.MulterError('LIMIT_FILE_SIZE');

    errorHandler(err, fakeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'UPLOAD_LIMIT_FILE_SIZE' }),
      }),
    );
  });

  it('maps any other Multer error to 400', () => {
    const res = fakeRes();
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');

    errorHandler(err, fakeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'UPLOAD_LIMIT_UNEXPECTED_FILE' }),
      }),
    );
  });

  it('maps a Mongo duplicate-key error (code 11000) to 409 DUPLICATE_KEY', () => {
    const res = fakeRes();
    const err = { code: 11000, keyValue: { email: 'jane@acme.com' } };

    errorHandler(err, fakeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'DUPLICATE_KEY',
          details: { email: 'jane@acme.com' },
        }),
      }),
    );
  });

  it('falls back to 500 for an unrecognized Error, exposing the real message outside production', () => {
    const res = fakeRes();
    const err = new Error('unexpected boom');

    errorHandler(err, fakeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('unexpected boom');
    expect(body.error.stack).toEqual(expect.any(String)); // included outside production
  });

  it('falls back to 500 with the generic message for a thrown non-Error value', () => {
    const res = fakeRes();

    errorHandler('a plain string was thrown', fakeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Something went wrong. Please try again later.');
    expect(body.error.stack).toBeUndefined(); // only attached for real Error instances
  });
});
