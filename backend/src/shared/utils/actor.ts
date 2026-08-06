import type { Request } from 'express';
import { AppError } from '../errors/AppError';
import type { ActorContext } from '../types/actorContext';

/**
 * Reads the authenticated caller off `req.user` into an `ActorContext`.
 * Safe to call from any controller mounted behind `authenticate` — every
 * route file runs that middleware before any handler using this.
 */
export function actorFromRequest(req: Request): ActorContext {
  const { id, role, employeeId } = req.user!;
  return { id, role, employeeId };
}

/** The actor's linked employee id, or a `NO_EMPLOYEE_PROFILE` 400 if their account isn't linked to one — self-service endpoints (leave, payslips, shifts, attendance, notifications, ...) all need this same guard. */
export function requireEmployeeId(actor: ActorContext): string {
  if (!actor.employeeId) {
    throw AppError.badRequest(
      'Your account is not linked to an employee profile.',
      'NO_EMPLOYEE_PROFILE',
    );
  }
  return actor.employeeId;
}
