import type { IShiftAssignment } from './shiftAssignment.model';
import { type ShiftDTO, toShiftDTO } from './shift.types';
import type { IShift } from './shift.model';

export interface ShiftAssignmentDTO {
  id: string;
  employeeId: string;
  shift: ShiftDTO;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export function toShiftAssignmentDTO(
  assignment: IShiftAssignment,
  shift: IShift,
): ShiftAssignmentDTO {
  return {
    id: assignment.id as string,
    employeeId: String(assignment.employeeId),
    shift: toShiftDTO(shift),
    effectiveFrom: assignment.effectiveFrom,
    effectiveTo: assignment.effectiveTo,
  };
}
