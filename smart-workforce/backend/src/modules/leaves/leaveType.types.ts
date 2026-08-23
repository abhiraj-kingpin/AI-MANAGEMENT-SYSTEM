import type { ILeaveType } from './leaveType.model';

export interface LeaveTypeDTO {
  id: string;
  name: string;
  defaultAnnualQuota: number;
  isPaid: boolean;
  carryForward: boolean;
  maxCarryForwardDays: number;
}

export function toLeaveTypeDTO(doc: ILeaveType): LeaveTypeDTO {
  return {
    id: doc.id as string,
    name: doc.name,
    defaultAnnualQuota: doc.defaultAnnualQuota,
    isPaid: doc.isPaid,
    carryForward: doc.carryForward,
    maxCarryForwardDays: doc.maxCarryForwardDays,
  };
}
