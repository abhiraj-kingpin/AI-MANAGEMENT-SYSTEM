import { AppError } from '../errors/AppError';
import type { Role } from '../constants/roles';

const HR_ASSIGNABLE_ROLES: Role[] = ['manager', 'employee'];

export function assertRoleAssignable(actorRole: Role, targetRole: Role): void {
  if (actorRole === 'hr' && !HR_ASSIGNABLE_ROLES.includes(targetRole)) {
    throw AppError.forbidden(
      'HR can only create manager or employee accounts.',
      'ROLE_NOT_ASSIGNABLE',
    );
  }
}
