import type { ILeave, LeaveStatus } from './leave.model';

/** Only attached where a caller needs a name instead of a bare id — the HR/Manager review queue (`list`), not an employee's own `/me` history. */
export interface LeaveEmployeeRefDTO {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

export interface LeaveDTO {
  id: string;
  employeeId: string;
  employee?: LeaveEmployeeRefDTO;
  leaveTypeId: string;
  leaveTypeName?: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  approvedBy: string | null;
  managerComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalanceDTO {
  leaveTypeId: string;
  leaveTypeName: string;
  year: number;
  allocated: number;
  used: number;
  carriedForward: number;
  remaining: number;
}

export function toLeaveDTO(
  doc: ILeave,
  employee?: LeaveEmployeeRefDTO,
  leaveTypeName?: string,
): LeaveDTO {
  return {
    id: doc.id as string,
    employeeId: String(doc.employeeId),
    employee,
    leaveTypeId: String(doc.leaveTypeId),
    leaveTypeName,
    startDate: doc.startDate,
    endDate: doc.endDate,
    totalDays: doc.totalDays,
    reason: doc.reason,
    status: doc.status,
    approvedBy: doc.approvedBy ? String(doc.approvedBy) : null,
    managerComment: doc.managerComment,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
