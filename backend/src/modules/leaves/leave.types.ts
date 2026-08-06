import type { ILeave, LeaveStatus } from './leave.model';

export interface LeaveDTO {
  id: string;
  employeeId: string;
  leaveTypeId: string;
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

export function toLeaveDTO(doc: ILeave): LeaveDTO {
  return {
    id: doc.id as string,
    employeeId: String(doc.employeeId),
    leaveTypeId: String(doc.leaveTypeId),
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
