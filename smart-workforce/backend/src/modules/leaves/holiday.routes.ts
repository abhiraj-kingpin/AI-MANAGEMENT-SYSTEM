import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as holidayController from './holiday.controller';
import { createHolidaySchema, listHolidaysQuerySchema } from './holiday.validators';

const router = Router();

router.use(authenticate);

router.get('/', validate(listHolidaysQuerySchema), holidayController.listHolidays);
router.post(
  '/',
  requireRole('super_admin', 'hr'),
  validate(createHolidaySchema),
  holidayController.createHoliday,
);

export { router as holidayRouter };
