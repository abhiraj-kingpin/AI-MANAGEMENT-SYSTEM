import type { Request } from 'express';
import { AppError } from '../errors/AppError';
import type { ActorContext } from '../types/actorContext';

export function actorFromRequest(req: Request): ActorContext {
  const { id, role, employeeId } = req.user!;
  return { id, role, employeeId };
}

export function requireEmployeeId(actor: ActorContext): string {
  if (!actor.employeeId) {
    throw AppError.badRequest(
      'Your account is not linked to an employee profile.',
      'NO_EMPLOYEE_PROFILE',
    );
  }
  return actor.employeeId;
}
