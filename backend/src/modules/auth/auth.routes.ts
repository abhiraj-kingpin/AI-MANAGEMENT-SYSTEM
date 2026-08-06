import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as authController from './auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.validators';

const router = Router();

// Tighter than the global limiter (app.ts) — these are the brute-force-
// sensitive, pre-authentication endpoints. See
// docs/architecture/04-api-documentation.md#conventions.
const bruteForceGuard = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many attempts. Please wait a minute and try again.',
    },
  },
});

router.post(
  '/register',
  authenticate,
  requireRole('super_admin', 'hr'),
  validate(registerSchema),
  authController.register,
);
router.post('/login', bruteForceGuard, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post(
  '/forgot-password',
  bruteForceGuard,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  bruteForceGuard,
  validate(resetPasswordSchema),
  authController.resetPassword,
);
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);
router.get('/me', authenticate, authController.me);

export { router as authRouter };
