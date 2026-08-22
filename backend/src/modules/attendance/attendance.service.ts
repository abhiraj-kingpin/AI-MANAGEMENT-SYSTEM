import ExcelJS from 'exceljs';
import { Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import { recordAudit } from '../../modules/audit/audit.service';
import { AppError } from '../../shared/errors/AppError';
import type { ActorContext } from '../../shared/types/actorContext';
import type { PaginatedResult } from '../../shared/types/pagination';
import { requireEmployeeId } from '../../shared/utils/actor';
import { combineDateAndTime, minutesBetween, startOfUtcDay } from '../../shared/utils/dateTime';
import { resolveEmployeeRefs } from '../../shared/utils/employeeRef';
import { getManagedEmployeeIds } from '../../shared/utils/teamScope';
import { Employee } from '../employees/employee.model';
import { faceService } from '../face-recognition/face.service';
import { findNearestGeofence } from '../geofence/geofence.service';
import { notify } from '../notifications/notification.service';
import { validateAndConsumeQrToken } from '../qr/qr.service';
import { getEffectiveShift } from '../shifts/shiftAssignment.service';
import { type AttendanceStatus, Attendance, type IAttendance } from './attendance.model';
import { type AttendanceDTO, toAttendanceDTO } from './attendance.types';
import type {
  CheckInInput,
  CorrectAttendanceInput,
  GeoPointInput,
  ListAttendanceQuery,
  RequestCorrectionInput,
  SyncPunchInput,
} from './attendance.validators';

const DEFAULT_SHIFT_START = '09:00';
const DEFAULT_GRACE_PERIOD_MINUTES = 10;
const STANDARD_WORKDAY_MINUTES = 8 * 60;

function hasOpenBreak(attendance: IAttendance): boolean {
  return attendance.breaks.some((b) => !b.end);
}

async function resolveShift(
  employeeId: string,
  date: Date,
): Promise<{ startTime: string; gracePeriodMinutes: number; workdayMinutes: number }> {
  const assigned = await getEffectiveShift(employeeId, date);
  return (
    assigned ?? {
      startTime: DEFAULT_SHIFT_START,
      gracePeriodMinutes: DEFAULT_GRACE_PERIOD_MINUTES,
      workdayMinutes: STANDARD_WORKDAY_MINUTES,
    }
  );
}

function recomputeWorkingHours(attendance: IAttendance, workdayMinutes: number): void {
  if (!attendance.checkInAt || !attendance.checkOutAt) return;

  const grossMinutes = minutesBetween(attendance.checkInAt, attendance.checkOutAt);
  const breakMinutes = attendance.breaks.reduce(
    (sum, b) => sum + (b.end ? minutesBetween(b.start, b.end) : 0),
    0,
  );
  attendance.workingMinutes = Math.max(0, grossMinutes - breakMinutes);
  attendance.isOvertime = attendance.workingMinutes > workdayMinutes;
  attendance.overtimeMinutes = attendance.isOvertime
    ? attendance.workingMinutes - workdayMinutes
    : 0;
}

function sanitizeForAudit(doc: object): Record<string, unknown> {
  const { __v: _v, _id: _id, ...rest } = doc as Record<string, unknown>;
  return rest;
}

async function buildAttendanceFilter(
  query: Pick<ListAttendanceQuery, 'employeeId' | 'departmentId' | 'status' | 'from' | 'to'>,
  actor: ActorContext,
): Promise<Record<string, unknown>> {
  const filter: Record<string, unknown> = {};

  if (actor.role === 'manager') {
    const teamIds = await getManagedEmployeeIds(actor);

    if (query.employeeId) {
      if (!teamIds.includes(query.employeeId)) {
        throw AppError.forbidden('That employee is not on your team.', 'FORBIDDEN');
      }
      filter.employeeId = query.employeeId;
    } else {
      filter.employeeId = { $in: teamIds };
    }
  } else {
    if (query.employeeId) {
      filter.employeeId = query.employeeId;
    } else if (query.departmentId) {
      const deptEmployees = await Employee.find({ departmentId: query.departmentId }).select('_id');
      filter.employeeId = { $in: deptEmployees.map((e) => e._id) };
    }
  }

  if (query.status) filter.status = query.status;
  if (query.from || query.to) {
    const dateFilter: Record<string, unknown> = {};
    if (query.from) dateFilter.$gte = startOfUtcDay(query.from);
    if (query.to) dateFilter.$lte = startOfUtcDay(query.to);
    filter.date = dateFilter;
  }

  return filter;
}

async function performCheckIn(
  actor: ActorContext,
  employeeId: string,
  input: CheckInInput,
  now: Date,
  clientGeneratedId?: string,
): Promise<IAttendance> {
  const { method, location, qrToken, faceEmbedding, livenessPassed } = input;

  if (method === 'manual' && actor.role !== 'super_admin' && actor.role !== 'hr') {
    throw AppError.forbidden(
      'Manual check-in is reserved for HR/Admin corrections — use GPS, QR, or Face to check in.',
      'MANUAL_CHECKIN_RESTRICTED',
    );
  }

  const date = startOfUtcDay(now);

  let attendance = await Attendance.findOne({ employeeId, date });
  if (attendance?.checkInAt) {
    throw AppError.conflict('You have already checked in today.', 'ALREADY_CHECKED_IN');
  }
  if (attendance?.status === 'on_leave') {
    throw AppError.badRequest('You are on approved leave today.', 'ON_APPROVED_LEAVE');
  }

  let matchedGeofenceId: string | undefined;
  let matchedQrCodeId: string | undefined;
  let faceMatchConfidence: number | undefined;

  // Shared by both 'gps' and 'face': face check-in proves identity but says
  // nothing about *where* the phone is, so it requires the same geofence
  // proof GPS check-in always has — one combined method, not two weaker
  // ones. Throws the same OUTSIDE_GEOFENCE either way.
  async function requireInsideGeofence(loc: GeoPointInput | undefined): Promise<string> {
    if (!loc) {
      throw AppError.badRequest('Location is required to check in.', 'LOCATION_REQUIRED');
    }
    const match = await findNearestGeofence(loc.lat, loc.lng);
    if (!match) {
      throw AppError.unprocessable(
        'No office location is configured yet — contact HR.',
        'OUTSIDE_GEOFENCE',
      );
    }
    if (!match.isInside) {
      throw AppError.unprocessable(
        `You are ${match.distanceMeters}m from ${match.geofence.branchName}. Move within ${match.geofence.radiusMeters}m to check in.`,
        'OUTSIDE_GEOFENCE',
        { distanceMeters: match.distanceMeters, branchName: match.geofence.branchName },
      );
    }
    return match.geofence.id;
  }

  if (method === 'gps') {
    matchedGeofenceId = await requireInsideGeofence(location);
  }

  if (method === 'qr') {
    if (!qrToken) {
      throw AppError.badRequest('QR check-in requires a token.', 'QR_TOKEN_REQUIRED');
    }
    const result = await validateAndConsumeQrToken(qrToken, employeeId);
    matchedGeofenceId = result.geofenceId;
    matchedQrCodeId = result.qrCodeId;
  }

  if (method === 'face') {
    if (!faceEmbedding) {
      throw AppError.badRequest('Face check-in requires an embedding.', 'FACE_EMBEDDING_REQUIRED');
    }
    if (livenessPassed !== true) {
      throw AppError.unprocessable(
        'Liveness check failed. Please try again.',
        'LIVENESS_CHECK_FAILED',
      );
    }
    // Identity (face) and location (geofence) are both required — checked
    // independently so each failure gets its own honest error rather than
    // one check silently covering for the other.
    matchedGeofenceId = await requireInsideGeofence(location);
    const result = await faceService.verify(actor, faceEmbedding);
    if (!result.matched) {
      throw AppError.unauthorized(
        'Face not recognized. Try again or use QR.',
        'FACE_MATCH_LOW_CONFIDENCE',
      );
    }
    faceMatchConfidence = result.confidence;
  }

  const shift = await resolveShift(employeeId, date);
  const shiftStart = combineDateAndTime(date, shift.startTime);
  const status: AttendanceStatus =
    now.getTime() > shiftStart.getTime() + shift.gracePeriodMinutes * 60_000 ? 'late' : 'present';

  const fields = {
    method,
    checkInAt: now,
    status,
    checkInLocation: location,
    geofenceId: matchedGeofenceId,
    qrCodeId: matchedQrCodeId,
    faceMatchConfidence,
  };

  if (!attendance) {
    attendance = new Attendance({ employeeId, date, ...fields });
  } else {
    Object.assign(attendance, fields);
  }
  if (clientGeneratedId) attendance.clientGeneratedId = clientGeneratedId;
  await attendance.save();

  return attendance;
}

async function performCheckOut(
  employeeId: string,
  location: GeoPointInput | undefined,
  now: Date,
  clientGeneratedId?: string,
): Promise<IAttendance> {
  const date = startOfUtcDay(now);

  const attendance = await Attendance.findOne({ employeeId, date });
  if (!attendance || !attendance.checkInAt) {
    throw AppError.badRequest('You have not checked in today.', 'NOT_CHECKED_IN');
  }
  if (attendance.checkOutAt) {
    throw AppError.conflict('You have already checked out today.', 'ALREADY_CHECKED_OUT');
  }
  if (hasOpenBreak(attendance)) {
    throw AppError.badRequest('End your break before checking out.', 'ACTIVE_BREAK');
  }

  attendance.checkOutAt = now;
  if (location) attendance.checkOutLocation = location;
  if (clientGeneratedId) attendance.clientGeneratedId = clientGeneratedId;
  const shift = await resolveShift(employeeId, date);
  recomputeWorkingHours(attendance, shift.workdayMinutes);
  if (attendance.workingMinutes < Math.round(shift.workdayMinutes / 2)) {
    attendance.status = 'half_day';
  }

  await attendance.save();
  return attendance;
}

export interface PunchSyncResult {
  clientGeneratedId: string;
  status: 'applied' | 'duplicate' | 'conflict';
  attendanceId?: string;
  reason?: string;
}

async function applySyncPunch(
  actor: ActorContext,
  employeeId: string,
  punch: SyncPunchInput,
): Promise<PunchSyncResult> {
  const existing = await Attendance.findOne({ clientGeneratedId: punch.clientGeneratedId });
  if (existing) {
    return {
      clientGeneratedId: punch.clientGeneratedId,
      status: 'duplicate',
      attendanceId: existing.id as string,
    };
  }

  try {
    const attendance =
      punch.type === 'check_in'
        ? await performCheckIn(
            actor,
            employeeId,
            {
              method: punch.method!,
              location: punch.location,
              qrToken: punch.qrToken,
              faceEmbedding: punch.faceEmbedding,
              livenessPassed: punch.livenessPassed,
            },
            punch.occurredAt,
            punch.clientGeneratedId,
          )
        : await performCheckOut(
            employeeId,
            punch.location,
            punch.occurredAt,
            punch.clientGeneratedId,
          );

    return {
      clientGeneratedId: punch.clientGeneratedId,
      status: 'applied',
      attendanceId: attendance.id as string,
    };
  } catch (error) {
    if (!(error instanceof AppError)) throw error;

    const conflicting = await Attendance.findOne({
      employeeId,
      date: startOfUtcDay(punch.occurredAt),
    });
    await recordAudit({
      actorId: actor.id,
      action: 'attendance.sync.conflict',
      entityType: 'Attendance',
      entityId: (conflicting?.id as string) ?? 'none',
      before: null,
      after: { clientGeneratedId: punch.clientGeneratedId, type: punch.type, reason: error.code },
    });

    return {
      clientGeneratedId: punch.clientGeneratedId,
      status: 'conflict',
      attendanceId: conflicting?.id as string | undefined,
      reason: error.code,
    };
  }
}

export const attendanceService = {
  async checkIn(actor: ActorContext, input: CheckInInput): Promise<AttendanceDTO> {
    const employeeId = requireEmployeeId(actor);
    const attendance = await performCheckIn(actor, employeeId, input, new Date());
    return toAttendanceDTO(attendance);
  },

  async checkOut(actor: ActorContext, location?: GeoPointInput): Promise<AttendanceDTO> {
    const employeeId = requireEmployeeId(actor);
    const attendance = await performCheckOut(employeeId, location, new Date());
    return toAttendanceDTO(attendance);
  },

  async syncAttendance(actor: ActorContext, punches: SyncPunchInput[]): Promise<PunchSyncResult[]> {
    const employeeId = requireEmployeeId(actor);
    const results: PunchSyncResult[] = [];
    for (const punch of punches) {
      results.push(await applySyncPunch(actor, employeeId, punch));
    }
    return results;
  },

  async breakStart(actor: ActorContext): Promise<AttendanceDTO> {
    const employeeId = requireEmployeeId(actor);
    const date = startOfUtcDay(new Date());

    const attendance = await Attendance.findOne({ employeeId, date });
    if (!attendance || !attendance.checkInAt) {
      throw AppError.badRequest('You have not checked in today.', 'NOT_CHECKED_IN');
    }
    if (attendance.checkOutAt) {
      throw AppError.badRequest('You have already checked out today.', 'ALREADY_CHECKED_OUT');
    }
    if (hasOpenBreak(attendance)) {
      throw AppError.conflict('You already have an active break.', 'ACTIVE_BREAK');
    }

    attendance.breaks.push({ start: new Date(), end: null });
    await attendance.save();
    return toAttendanceDTO(attendance);
  },

  async breakEnd(actor: ActorContext): Promise<AttendanceDTO> {
    const employeeId = requireEmployeeId(actor);
    const date = startOfUtcDay(new Date());

    const attendance = await Attendance.findOne({ employeeId, date });
    if (!attendance) {
      throw AppError.badRequest('You have not checked in today.', 'NOT_CHECKED_IN');
    }
    const openBreak = attendance.breaks.find((b) => !b.end);
    if (!openBreak) {
      throw AppError.badRequest('You do not have an active break.', 'NO_ACTIVE_BREAK');
    }
    openBreak.end = new Date();

    await attendance.save();
    return toAttendanceDTO(attendance);
  },

  async getMyAttendance(
    actor: ActorContext,
    range: { from?: Date; to?: Date },
  ): Promise<AttendanceDTO[]> {
    const employeeId = requireEmployeeId(actor);

    const filter: Record<string, unknown> = { employeeId };
    if (range.from || range.to) {
      const dateFilter: Record<string, unknown> = {};
      if (range.from) dateFilter.$gte = startOfUtcDay(range.from);
      if (range.to) dateFilter.$lte = startOfUtcDay(range.to);
      filter.date = dateFilter;
    }

    const records = await Attendance.find(filter).sort({ date: -1 }).limit(90);
    return records.map((record) => toAttendanceDTO(record));
  },

  async listAttendance(
    query: ListAttendanceQuery,
    actor: ActorContext,
  ): Promise<PaginatedResult<AttendanceDTO>> {
    if (actor.role === 'employee') {
      throw AppError.forbidden(
        'You do not have permission to view attendance reports.',
        'FORBIDDEN',
      );
    }

    const filter = await buildAttendanceFilter(query, actor);

    const [items, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ date: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      Attendance.countDocuments(filter),
    ]);

    const employeeById = await resolveEmployeeRefs(items, (item) => String(item.employeeId));

    return {
      items: items.map((item) => toAttendanceDTO(item, employeeById.get(String(item.employeeId)))),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    };
  },

  async correctAttendance(
    attendanceId: string,
    input: CorrectAttendanceInput,
    actor: ActorContext,
  ): Promise<AttendanceDTO> {
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      throw AppError.notFound('Attendance record not found.');
    }

    const before = sanitizeForAudit(attendance.toObject());

    if (input.checkInAt) attendance.checkInAt = input.checkInAt;
    if (input.checkOutAt) attendance.checkOutAt = input.checkOutAt;
    if (input.status) attendance.status = input.status;
    const shift = await resolveShift(String(attendance.employeeId), attendance.date);
    recomputeWorkingHours(attendance, shift.workdayMinutes);

    attendance.isCorrected = true;
    attendance.correctedBy = actor.employeeId ? new Types.ObjectId(actor.employeeId) : null;
    attendance.correctionReason = input.reason;

    await attendance.save();

    await recordAudit({
      actorId: actor.id,
      action: 'attendance.correct',
      entityType: 'Attendance',
      entityId: attendance.id as string,
      before,
      after: sanitizeForAudit(attendance.toObject()),
    });

    return toAttendanceDTO(attendance);
  },

  async requestCorrection(
    attendanceId: string,
    input: RequestCorrectionInput,
    actor: ActorContext,
  ): Promise<AttendanceDTO> {
    const employeeId = requireEmployeeId(actor);
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      throw AppError.notFound('Attendance record not found.');
    }
    if (String(attendance.employeeId) !== employeeId) {
      throw AppError.forbidden(
        'You can only request corrections on your own attendance.',
        'FORBIDDEN',
      );
    }
    if (attendance.correctionRequest?.status === 'pending') {
      throw AppError.conflict(
        'A correction request is already pending for this record.',
        'CORRECTION_PENDING',
      );
    }

    attendance.correctionRequest = {
      requestedCheckInAt: input.requestedCheckInAt ?? null,
      requestedCheckOutAt: input.requestedCheckOutAt ?? null,
      reason: input.reason,
      requestedBy: new Types.ObjectId(employeeId),
      requestedAt: new Date(),
      status: 'pending',
    };
    await attendance.save();

    return toAttendanceDTO(attendance);
  },

  async reviewCorrection(
    attendanceId: string,
    decision: 'approved' | 'rejected',
    actor: ActorContext,
    comment?: string,
  ): Promise<AttendanceDTO> {
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      throw AppError.notFound('Attendance record not found.');
    }

    const request = attendance.correctionRequest;
    if (!request || request.status !== 'pending') {
      throw AppError.badRequest(
        'There is no pending correction request on this record.',
        'NO_PENDING_REQUEST',
      );
    }

    if (actor.role === 'manager') {
      const employee = await Employee.findById(attendance.employeeId).select('managerId');
      if (!employee || String(employee.managerId) !== actor.employeeId) {
        throw AppError.forbidden('That employee is not on your team.', 'FORBIDDEN');
      }
    }

    const before = sanitizeForAudit(attendance.toObject());

    request.status = decision;
    request.reviewedBy = actor.employeeId ? new Types.ObjectId(actor.employeeId) : null;
    request.reviewedAt = new Date();
    request.reviewComment = comment;

    if (decision === 'approved') {
      if (request.requestedCheckInAt) attendance.checkInAt = request.requestedCheckInAt;
      if (request.requestedCheckOutAt) attendance.checkOutAt = request.requestedCheckOutAt;
      const shift = await resolveShift(String(attendance.employeeId), attendance.date);
      recomputeWorkingHours(attendance, shift.workdayMinutes);
      attendance.isCorrected = true;
      attendance.correctedBy = request.reviewedBy;
      attendance.correctionReason = request.reason;
    }

    await attendance.save();

    await recordAudit({
      actorId: actor.id,
      action: `attendance.correction.${decision}`,
      entityType: 'Attendance',
      entityId: attendance.id as string,
      before,
      after: sanitizeForAudit(attendance.toObject()),
    });

    await notify(
      String(attendance.employeeId),
      `Attendance correction ${decision}`,
      decision === 'approved'
        ? `Your correction request for ${attendance.date.toISOString().slice(0, 10)} was approved.`
        : `Your correction request was rejected.${comment ? ` Reason: ${comment}` : ''}`,
      'attendance',
      { attendanceId: attendance.id },
    );

    return toAttendanceDTO(attendance);
  },

  async exportExcel(
    query: Pick<ListAttendanceQuery, 'employeeId' | 'departmentId' | 'status' | 'from' | 'to'>,
    actor: ActorContext,
  ): Promise<Buffer> {
    const filter = await buildAttendanceFilter(query, actor);
    const items = await Attendance.find(filter)
      .populate({ path: 'employeeId', select: 'employeeCode firstName lastName' })
      .sort({ date: -1 })
      .limit(5000);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance');
    sheet.columns = [
      { header: 'Employee Code', key: 'employeeCode', width: 16 },
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Check In', key: 'checkInAt', width: 20 },
      { header: 'Check Out', key: 'checkOutAt', width: 20 },
      { header: 'Working Minutes', key: 'workingMinutes', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Overtime (min)', key: 'overtimeMinutes', width: 14 },
      { header: 'Method', key: 'method', width: 10 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const item of items) {
      const employee = employeeRef(item);
      sheet.addRow({
        employeeCode: employee?.employeeCode ?? String(item.employeeId),
        name: employee ? `${employee.firstName} ${employee.lastName}` : '',
        date: item.date.toISOString().slice(0, 10),
        checkInAt: item.checkInAt?.toISOString() ?? '',
        checkOutAt: item.checkOutAt?.toISOString() ?? '',
        workingMinutes: item.workingMinutes,
        status: item.status,
        overtimeMinutes: item.overtimeMinutes,
        method: item.method,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  },

  async exportPdf(
    query: Pick<ListAttendanceQuery, 'employeeId' | 'departmentId' | 'status' | 'from' | 'to'>,
    actor: ActorContext,
  ): Promise<Buffer> {
    const filter = await buildAttendanceFilter(query, actor);
    const items = await Attendance.find(filter)
      .populate({ path: 'employeeId', select: 'employeeCode firstName lastName' })
      .sort({ date: -1 })
      .limit(5000);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Attendance Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(9);

      const headers = [
        'Employee',
        'Date',
        'Check In',
        'Check Out',
        'Minutes',
        'Status',
        'OT (min)',
      ];
      const colWidths = [150, 80, 80, 80, 60, 70, 60];
      const left = 40;

      const drawRow = (cells: string[]) => {
        const y = doc.y;
        cells.forEach((cell, i) => {
          const x = left + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          doc.text(cell, x, y, { width: colWidths[i] });
        });
        doc.moveDown();
      };

      doc.font('Helvetica-Bold');
      drawRow(headers);
      doc.font('Helvetica');

      for (const item of items) {
        const employee = employeeRef(item);
        drawRow([
          employee ? `${employee.firstName} ${employee.lastName}` : String(item.employeeId),
          item.date.toISOString().slice(0, 10),
          item.checkInAt ? item.checkInAt.toISOString().slice(11, 16) : '-',
          item.checkOutAt ? item.checkOutAt.toISOString().slice(11, 16) : '-',
          String(item.workingMinutes),
          item.status,
          String(item.overtimeMinutes),
        ]);
      }

      doc.end();
    });
  },
};

interface PopulatedEmployeeRef {
  employeeCode: string;
  firstName: string;
  lastName: string;
}

function employeeRef(attendance: IAttendance): PopulatedEmployeeRef | undefined {
  const value = attendance.employeeId as unknown;
  if (value && typeof value === 'object' && 'firstName' in value) {
    return value as PopulatedEmployeeRef;
  }
  return undefined;
}
