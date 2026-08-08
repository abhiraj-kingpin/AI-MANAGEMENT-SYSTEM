import type { EmployeeRefDTO } from '../../shared/utils/employeeRef';
import type {
  AttendanceMethod,
  AttendanceStatus,
  CorrectionStatus,
  IAttendance,
  SyncStatus,
} from './attendance.model';

export interface BreakDTO {
  start: Date;
  end: Date | null;
}

export interface GeoPointDTO {
  lat: number;
  lng: number;
  accuracyMeters?: number;
}

export interface CorrectionRequestDTO {
  requestedCheckInAt: Date | null;
  requestedCheckOutAt: Date | null;
  reason: string;
  requestedBy: string;
  requestedAt: Date;
  status: CorrectionStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewComment?: string;
}

export interface AttendanceDTO {
  id: string;
  employeeId: string;
  employee?: EmployeeRefDTO;
  date: Date;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  breaks: BreakDTO[];
  method: AttendanceMethod;
  checkInLocation: GeoPointDTO | null;
  checkOutLocation: GeoPointDTO | null;
  geofenceId: string | null;
  qrCodeId: string | null;
  faceMatchConfidence: number | null;
  workingMinutes: number;
  status: AttendanceStatus;
  isOvertime: boolean;
  overtimeMinutes: number;
  isCorrected: boolean;
  correctionReason?: string;
  correctionRequest: CorrectionRequestDTO | null;
  syncStatus: SyncStatus;
  createdAt: Date;
  updatedAt: Date;
}

export function toAttendanceDTO(doc: IAttendance, employee?: EmployeeRefDTO): AttendanceDTO {
  return {
    id: doc.id as string,
    employeeId: String(doc.employeeId),
    employee,
    date: doc.date,
    checkInAt: doc.checkInAt,
    checkOutAt: doc.checkOutAt,
    breaks: doc.breaks.map((b) => ({ start: b.start, end: b.end ?? null })),
    method: doc.method,
    checkInLocation: doc.checkInLocation ?? null,
    checkOutLocation: doc.checkOutLocation ?? null,
    geofenceId: doc.geofenceId ? String(doc.geofenceId) : null,
    qrCodeId: doc.qrCodeId ? String(doc.qrCodeId) : null,
    faceMatchConfidence: doc.faceMatchConfidence,
    workingMinutes: doc.workingMinutes,
    status: doc.status,
    isOvertime: doc.isOvertime,
    overtimeMinutes: doc.overtimeMinutes,
    isCorrected: doc.isCorrected,
    correctionReason: doc.correctionReason,
    correctionRequest: doc.correctionRequest
      ? {
          requestedCheckInAt: doc.correctionRequest.requestedCheckInAt ?? null,
          requestedCheckOutAt: doc.correctionRequest.requestedCheckOutAt ?? null,
          reason: doc.correctionRequest.reason,
          requestedBy: String(doc.correctionRequest.requestedBy),
          requestedAt: doc.correctionRequest.requestedAt,
          status: doc.correctionRequest.status,
          reviewedBy: doc.correctionRequest.reviewedBy
            ? String(doc.correctionRequest.reviewedBy)
            : null,
          reviewedAt: doc.correctionRequest.reviewedAt ?? null,
          reviewComment: doc.correctionRequest.reviewComment,
        }
      : null,
    syncStatus: doc.syncStatus,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
