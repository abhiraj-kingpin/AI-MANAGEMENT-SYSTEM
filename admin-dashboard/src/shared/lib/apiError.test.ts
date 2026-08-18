import axios from 'axios';
import { apiErrorMessage } from './apiError';
import type { ApiError } from '@/types/api';

describe('apiErrorMessage', () => {
  it('surfaces the backend error message from a real axios error response', () => {
    const backendError: ApiError = {
      success: false,
      error: {
        code: 'ACCOUNT_LOCKED',
        message: 'Too many failed attempts. Try again in 10 minutes.',
      },
    };
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const error = { response: { data: backendError } };

    expect(apiErrorMessage(error)).toBe('Too many failed attempts. Try again in 10 minutes.');
  });

  it('falls back to the default message when the axios error has no response body', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const error = { response: undefined };

    expect(apiErrorMessage(error)).toBe('Something went wrong. Please try again.');
  });

  it('falls back to a caller-supplied message, not just the default', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const error = { response: undefined };

    expect(apiErrorMessage(error, 'Could not save changes.')).toBe('Could not save changes.');
  });

  it('falls back to the default message for a non-axios error (e.g. a thrown plain Error)', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(false);

    expect(apiErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
