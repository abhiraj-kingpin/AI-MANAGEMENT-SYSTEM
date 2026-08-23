import { z } from 'zod';
import { ROLES } from '../../shared/constants/roles';

const PASSWORD_MIN_LENGTH = 8;
const password = z.string().min(PASSWORD_MIN_LENGTH, 'Password must be at least 8 characters');

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password,
    role: z.enum(ROLES),
  }),
});

export const claimAccountSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({ refreshToken: z.string().optional() }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email: z.string().email() }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: password,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
  }),
});
