import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as userController from './user.controller';
import { inviteUserSchema, listUsersQuerySchema } from './user.validators';

const router = Router();

// Console user administration — separate from /employees (the workforce
// roster). Super admin only: this is who can sign into the admin console
// itself, not who's employed.
router.use(authenticate, requireRole('super_admin'));

router.get('/', validate(listUsersQuerySchema), userController.listUsers);
router.post('/invite', validate(inviteUserSchema), userController.inviteUser);

export { router as userRouter };
