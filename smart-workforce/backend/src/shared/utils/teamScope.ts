import { Employee } from '../../modules/employees/employee.model';
import { AppError } from '../errors/AppError';
import type { ActorContext } from '../types/actorContext';

export async function getManagedEmployeeIds(actor: ActorContext): Promise<string[]> {
  if (!actor.employeeId) {
    throw AppError.forbidden(
      'Your account is not linked to an employee profile.',
      'NO_EMPLOYEE_PROFILE',
    );
  }
  const team = await Employee.find({ managerId: actor.employeeId }).select('_id');
  return team.map((e) => String(e._id));
}
