import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as holidayController from './holiday.controller';
import { createHolidaySchema, listHolidaysQuerySchema } from './holiday.validators';

const router = Router();

router.use(authenticate);

// Read is open to any authenticated user (everyone needs the holiday
// calendar, e.g. to see it's excluded from their leave day count);
// management is HR/Admin only — same reasoning as leave-types.
router.get('/', validate(listHolidaysQuerySchema), holidayController.listHolidays);
router.post(
  '/',
  requireRole('super_admin', 'hr'),
  validate(createHolidaySchema),
  holidayController.createHoliday,
);

export { router as holidayRouter };
