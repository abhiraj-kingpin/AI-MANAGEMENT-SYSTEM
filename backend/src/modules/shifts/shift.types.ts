import type { IShift, ShiftType } from './shift.model';

export interface ShiftDTO {
  id: string;
  name: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toShiftDTO(doc: IShift): ShiftDTO {
  return {
    id: doc.id as string,
    name: doc.name,
    type: doc.type,
    startTime: doc.startTime,
    endTime: doc.endTime,
    gracePeriodMinutes: doc.gracePeriodMinutes,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
