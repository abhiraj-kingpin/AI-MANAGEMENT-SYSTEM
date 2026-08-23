import { Router } from 'express';
import { isDatabaseConnected } from '../../config/database';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AppError } from '../../shared/errors/AppError';

const router = Router();

router.get('/live', (_req, res) => {
  sendSuccess(res, { status: 'ok', uptimeSeconds: Math.floor(process.uptime()) });
});

router.get('/ready', (_req, res, next) => {
  if (!isDatabaseConnected()) {
    next(AppError.internal('Database not connected', 'DB_NOT_READY'));
    return;
  }
  sendSuccess(res, { status: 'ok', database: 'connected' });
});

export { router as healthRouter };
