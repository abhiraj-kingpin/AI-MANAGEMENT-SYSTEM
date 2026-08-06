import { AppError } from '../errors/AppError';
import type { Role } from '../constants/roles';

// HR can onboard managers/employees but not mint admin-level accounts — only
// Super Admin can create hr/super_admin users. Shared by auth.service
// (register) and employee.service (createEmployee) — both entry points that
// create a User — so the privilege-escalation rule can't drift between them.
// See docs/architecture/07-authentication-flow.md §6.
const HR_ASSIGNABLE_ROLES: Role[] = ['manager', 'employee'];

export function assertRoleAssignable(actorRole: Role, targetRole: Role): void {
  if (actorRole === 'hr' && !HR_ASSIGNABLE_ROLES.includes(targetRole)) {
    throw AppError.forbidden(
      'HR can only create manager or employee accounts.',
      'ROLE_NOT_ASSIGNABLE',
    );
  }
}
