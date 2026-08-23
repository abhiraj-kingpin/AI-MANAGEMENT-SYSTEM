import axios from 'axios';
import type { ApiError } from '@/types/api';

export function apiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.error?.message) return data.error.message;
  }
  return fallback;
}
