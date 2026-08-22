import { mockQuery } from '../../utils/mockQuery';

jest.mock('../../../src/modules/attendance/attendance.model', () => {
  const actual = jest.requireActual('../../../src/modules/attendance/attendance.model');

  const MockAttendance = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
    id: 'new-att-id',
    breaks: [],
    workingMinutes: 0,
    isOvertime: false,
    overtimeMinutes: 0,
    isCorrected: false,
    correctedBy: null,
    correctionRequest: null,
    syncStatus: 'synced',
    ...data,
    save: jest.fn(function save(this: object) {
      return Promise.resolve(this);
    }),
    toObject: jest.fn(function toObject(this: object) {
      return { ...this };
    }),
  })) as unknown as {
    (data: Record<string, unknown>): unknown;
    findOne: jest.Mock;
    findById: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
  };
  MockAttendance.findOne = jest.fn();
  MockAttendance.findById = jest.fn();
  MockAttendance.find = jest.fn();
  MockAttendance.countDocuments = jest.fn();

  return { ...actual, Attendance: MockAttendance };
});

jest.mock('../../../src/modules/employees/employee.model', () => ({
  Employee: { find: jest.fn(), findById: jest.fn() },
}));

jest.mock('../../../src/modules/audit/audit.service', () => ({
  recordAudit: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../src/modules/geofence/geofence.service', () => ({
  findNearestGeofence: jest.fn(),
}));

jest.mock('../../../src/modules/qr/qr.service', () => ({
  validateAndConsumeQrToken: jest.fn(),
}));

jest.mock('../../../src/modules/face-recognition/face.service', () => ({
  faceService: { verify: jest.fn() },
}));

jest.mock('../../../src/modules/shifts/shiftAssignment.service', () => ({
  getEffectiveShift: jest.fn(),
}));

jest.mock('../../../src/modules/notifications/notification.service', () => ({
  notify: jest.fn(() => Promise.resolve()),
}));

import { Employee } from '../../../src/modules/employees/employee.model';
import { Attendance } from '../../../src/modules/attendance/attendance.model';
import { attendanceService } from '../../../src/modules/attendance/attendance.service';
import { recordAudit } from '../../../src/modules/audit/audit.service';
import { faceService } from '../../../src/modules/face-recognition/face.service';
import { findNearestGeofence } from '../../../src/modules/geofence/geofence.service';
import { notify } from '../../../src/modules/notifications/notification.service';
import { validateAndConsumeQrToken } from '../../../src/modules/qr/qr.service';
import { getEffectiveShift } from '../../../src/modules/shifts/shiftAssignment.service';
import type { ActorContext } from '../../../src/shared/types/actorContext';

const mockedAttendanceCtor = Attendance as unknown as jest.Mock;
const mockedAttendanceFindOne = Attendance.findOne as unknown as jest.Mock;
const mockedAttendanceFindById = Attendance.findById as unknown as jest.Mock;
const mockedAttendanceFind = Attendance.find as unknown as jest.Mock;
const mockedAttendanceCount = Attendance.countDocuments as unknown as jest.Mock;
const mockedEmployeeFind = Employee.find as unknown as jest.Mock;
const mockedEmployeeFindById = Employee.findById as unknown as jest.Mock;
const mockedRecordAudit = recordAudit as unknown as jest.Mock;
const mockedFindNearestGeofence = findNearestGeofence as unknown as jest.Mock;
const mockedValidateAndConsumeQrToken = validateAndConsumeQrToken as unknown as jest.Mock;
const mockedFaceVerify = faceService.verify as unknown as jest.Mock;
const mockedGetEffectiveShift = getEffectiveShift as unknown as jest.Mock;
const mockedNotify = notify as unknown as jest.Mock;

const employee: ActorContext = {
  id: 'user-1',
  role: 'employee',
  employeeId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
};
const noProfile: ActorContext = { id: 'user-x', role: 'employee' };
const hr: ActorContext = { id: 'user-hr', role: 'hr', employeeId: 'dddddddddddddddddddddddd' };
const manager: ActorContext = {
  id: 'user-mgr',
  role: 'manager',
  employeeId: 'cccccccccccccccccccccccc',
};

function createFakeAttendance(overrides: Record<string, unknown> = {}) {
  return {
    id: 'att-1',
    employeeId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    date: new Date('2026-08-04'),
    checkInAt: null as Date | null,
    checkOutAt: null as Date | null,
    breaks: [] as { start: Date; end: Date | null }[],
    method: 'manual',
    workingMinutes: 0,
    status: 'present',
    isOvertime: false,
    overtimeMinutes: 0,
    isCorrected: false,
    correctedBy: null,
    correctionReason: undefined as string | undefined,
    correctionRequest: null as Record<string, unknown> | null,
    syncStatus: 'synced',
    clientGeneratedId: undefined as string | undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(function save(this: object) {
      return Promise.resolve(this);
    }),
    toObject: jest.fn(function toObject(this: object) {
      return { ...this };
    }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetEffectiveShift.mockResolvedValue(null);
});

describe('attendanceService.checkIn — manual (HR/Admin only, as of Phase 6)', () => {
  it('creates a new record with status "present" when checking in on time', async () => {
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T09:05:00Z'));

    const result = await attendanceService.checkIn(hr, { method: 'manual' });

    expect(result.status).toBe('present');
    expect(mockedAttendanceCtor).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: hr.employeeId, method: 'manual' }),
    );
    jest.useRealTimers();
  });

  it('marks status "late" when checking in after the grace period', async () => {
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T09:45:00Z'));

    const result = await attendanceService.checkIn(hr, { method: 'manual' });

    expect(result.status).toBe('late');
    jest.useRealTimers();
  });

  it('rejects a second check-in on the same day', async () => {
    mockedAttendanceFindOne.mockReturnValue(
      mockQuery(createFakeAttendance({ checkInAt: new Date() })),
    );

    await expect(attendanceService.checkIn(hr, { method: 'manual' })).rejects.toMatchObject({
      code: 'ALREADY_CHECKED_IN',
    });
  });

  it("uses the employee's real assigned shift, not the 09:00 default, when one exists (Phase 10)", async () => {
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));
    mockedGetEffectiveShift.mockResolvedValue({
      startTime: '22:00',
      gracePeriodMinutes: 5,
      workdayMinutes: 480,
      shiftId: 'shift-1',
    });
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T22:10:00Z'));

    const result = await attendanceService.checkIn(hr, { method: 'manual' });

    expect(mockedGetEffectiveShift).toHaveBeenCalledWith(hr.employeeId, expect.any(Date));
    expect(result.status).toBe('late');
    jest.useRealTimers();
  });

  it("is present, not late, within a real assigned shift's own grace window", async () => {
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));
    mockedGetEffectiveShift.mockResolvedValue({
      startTime: '22:00',
      gracePeriodMinutes: 15,
      workdayMinutes: 480,
      shiftId: 'shift-1',
    });
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T22:10:00Z'));

    const result = await attendanceService.checkIn(hr, { method: 'manual' });

    expect(result.status).toBe('present');
    jest.useRealTimers();
  });

  it('rejects a check-in on a day already stamped on_leave by an approved leave', async () => {
    mockedAttendanceFindOne.mockReturnValue(
      mockQuery(createFakeAttendance({ checkInAt: null, status: 'on_leave' })),
    );

    await expect(attendanceService.checkIn(hr, { method: 'manual' })).rejects.toMatchObject({
      code: 'ON_APPROVED_LEAVE',
    });
  });

  it('rejects a plain employee using manual check-in — GPS is now the self-service path', async () => {
    await expect(attendanceService.checkIn(employee, { method: 'manual' })).rejects.toMatchObject({
      code: 'MANUAL_CHECKIN_RESTRICTED',
    });
    expect(mockedAttendanceFindOne).not.toHaveBeenCalled();
  });

  it('rejects an actor with no linked employee profile', async () => {
    await expect(attendanceService.checkIn(noProfile, { method: 'manual' })).rejects.toMatchObject({
      code: 'NO_EMPLOYEE_PROFILE',
    });
  });
});

describe('attendanceService.checkIn — gps', () => {
  const location = { lat: 12.9716, lng: 77.5946, accuracyMeters: 8 };
  const insideMatch = {
    geofence: { id: 'geo-1', branchName: 'HQ - Bengaluru', radiusMeters: 150 },
    distanceMeters: 42,
    isInside: true,
  };
  const outsideMatch = {
    geofence: { id: 'geo-1', branchName: 'HQ - Bengaluru', radiusMeters: 150 },
    distanceMeters: 420,
    isInside: false,
  };

  it('checks in when inside the nearest geofence, and stores the location + geofenceId', async () => {
    mockedFindNearestGeofence.mockResolvedValue(insideMatch);
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));

    const result = await attendanceService.checkIn(employee, { method: 'gps', location });

    expect(result.method).toBe('gps');
    expect(mockedAttendanceCtor).toHaveBeenCalledWith(
      expect.objectContaining({ checkInLocation: location, geofenceId: 'geo-1' }),
    );
  });

  it('rejects with the distance to the nearest branch when outside every geofence', async () => {
    mockedFindNearestGeofence.mockResolvedValue(outsideMatch);
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));

    await expect(
      attendanceService.checkIn(employee, { method: 'gps', location }),
    ).rejects.toMatchObject({
      code: 'OUTSIDE_GEOFENCE',
      details: { distanceMeters: 420, branchName: 'HQ - Bengaluru' },
    });
  });

  it('checks the "already checked in today" guard before ever calling out to geofence lookup', async () => {
    mockedAttendanceFindOne.mockReturnValue(
      mockQuery(createFakeAttendance({ checkInAt: new Date() })),
    );

    await expect(
      attendanceService.checkIn(employee, { method: 'gps', location }),
    ).rejects.toMatchObject({ code: 'ALREADY_CHECKED_IN' });
    expect(mockedFindNearestGeofence).not.toHaveBeenCalled();
  });

  it('rejects when no office location is configured at all', async () => {
    mockedFindNearestGeofence.mockResolvedValue(null);
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));

    await expect(
      attendanceService.checkIn(employee, { method: 'gps', location }),
    ).rejects.toMatchObject({ code: 'OUTSIDE_GEOFENCE' });
  });
});

describe('attendanceService.checkIn — qr', () => {
  it('checks in on a valid token and stores the geofenceId + qrCodeId it resolved to', async () => {
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));
    mockedValidateAndConsumeQrToken.mockResolvedValue({
      geofenceId: 'geo-1',
      qrCodeId: 'qr-1',
    });

    const result = await attendanceService.checkIn(employee, {
      method: 'qr',
      qrToken: 'signed.token.value',
    });

    expect(result.method).toBe('qr');
    expect(mockedValidateAndConsumeQrToken).toHaveBeenCalledWith(
      'signed.token.value',
      employee.employeeId,
    );
    expect(mockedAttendanceCtor).toHaveBeenCalledWith(
      expect.objectContaining({ geofenceId: 'geo-1', qrCodeId: 'qr-1' }),
    );
  });

  it('propagates QR_EXPIRED/QR_INVALID/QR_ALREADY_USED from the QR service unchanged', async () => {
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));
    const AppErrorModule = jest.requireActual('../../../src/shared/errors/AppError');
    mockedValidateAndConsumeQrToken.mockRejectedValue(
      new AppErrorModule.AppError('This QR code has expired.', 422, 'QR_EXPIRED'),
    );

    await expect(
      attendanceService.checkIn(employee, { method: 'qr', qrToken: 'stale-token' }),
    ).rejects.toMatchObject({ code: 'QR_EXPIRED' });
  });

  it('never consumes the QR token when the employee already checked in today', async () => {
    mockedAttendanceFindOne.mockReturnValue(
      mockQuery(createFakeAttendance({ checkInAt: new Date() })),
    );

    await expect(
      attendanceService.checkIn(employee, { method: 'qr', qrToken: 'some-token' }),
    ).rejects.toMatchObject({ code: 'ALREADY_CHECKED_IN' });
    expect(mockedValidateAndConsumeQrToken).not.toHaveBeenCalled();
  });
});

describe('attendanceService.checkIn — face', () => {
  const faceEmbedding = Array.from({ length: 128 }, (_, i) => i / 128);
  const location = { lat: 12.9716, lng: 77.5946, accuracyMeters: 8 };
  const insideMatch = {
    geofence: { id: 'geo-1', branchName: 'HQ - Bengaluru', radiusMeters: 150 },
    distanceMeters: 42,
    isInside: true,
  };
  const outsideMatch = {
    geofence: { id: 'geo-1', branchName: 'HQ - Bengaluru', radiusMeters: 150 },
    distanceMeters: 420,
    isInside: false,
  };

  it('checks in on a matched, liveness-passed face inside the geofence, and stores both the confidence and the location', async () => {
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));
    mockedFindNearestGeofence.mockResolvedValue(insideMatch);
    mockedFaceVerify.mockResolvedValue({ matched: true, confidence: 0.94 });

    const result = await attendanceService.checkIn(employee, {
      method: 'face',
      location,
      faceEmbedding,
      livenessPassed: true,
    });

    expect(result.method).toBe('face');
    expect(mockedFaceVerify).toHaveBeenCalledWith(employee, faceEmbedding);
    expect(mockedAttendanceCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        faceMatchConfidence: 0.94,
        checkInLocation: location,
        geofenceId: 'geo-1',
      }),
    );
  });

  it('rejects without a location, without ever calling face verification', async () => {
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));

    await expect(
      attendanceService.checkIn(employee, { method: 'face', faceEmbedding, livenessPassed: true }),
    ).rejects.toMatchObject({ code: 'LOCATION_REQUIRED' });
    expect(mockedFaceVerify).not.toHaveBeenCalled();
  });

  it('rejects when outside every geofence, without ever calling face verification', async () => {
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));
    mockedFindNearestGeofence.mockResolvedValue(outsideMatch);

    await expect(
      attendanceService.checkIn(employee, {
        method: 'face',
        location,
        faceEmbedding,
        livenessPassed: true,
      }),
    ).rejects.toMatchObject({ code: 'OUTSIDE_GEOFENCE' });
    expect(mockedFaceVerify).not.toHaveBeenCalled();
  });

  it('rejects when liveness did not pass, without ever checking location or face verification', async () => {
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));

    await expect(
      attendanceService.checkIn(employee, {
        method: 'face',
        location,
        faceEmbedding,
        livenessPassed: false,
      }),
    ).rejects.toMatchObject({ code: 'LIVENESS_CHECK_FAILED' });
    expect(mockedFindNearestGeofence).not.toHaveBeenCalled();
    expect(mockedFaceVerify).not.toHaveBeenCalled();
  });

  it('rejects when livenessPassed is merely omitted (must be explicitly true, not just present)', async () => {
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));

    await expect(
      attendanceService.checkIn(employee, { method: 'face', location, faceEmbedding }),
    ).rejects.toMatchObject({ code: 'LIVENESS_CHECK_FAILED' });
  });

  it('rejects a low-confidence match', async () => {
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));
    mockedFindNearestGeofence.mockResolvedValue(insideMatch);
    mockedFaceVerify.mockResolvedValue({ matched: false, confidence: 0.4 });

    await expect(
      attendanceService.checkIn(employee, {
        method: 'face',
        location,
        faceEmbedding,
        livenessPassed: true,
      }),
    ).rejects.toMatchObject({ code: 'FACE_MATCH_LOW_CONFIDENCE' });
  });

  it('propagates FACE_NOT_REGISTERED from the face service unchanged', async () => {
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));
    mockedFindNearestGeofence.mockResolvedValue(insideMatch);
    const AppErrorModule = jest.requireActual('../../../src/shared/errors/AppError');
    mockedFaceVerify.mockRejectedValue(
      new AppErrorModule.AppError(
        'No face is registered for this account yet.',
        400,
        'FACE_NOT_REGISTERED',
      ),
    );

    await expect(
      attendanceService.checkIn(employee, {
        method: 'face',
        location,
        faceEmbedding,
        livenessPassed: true,
      }),
    ).rejects.toMatchObject({ code: 'FACE_NOT_REGISTERED' });
  });

  it('never calls face verification when the employee already checked in today', async () => {
    mockedAttendanceFindOne.mockReturnValue(
      mockQuery(createFakeAttendance({ checkInAt: new Date() })),
    );

    await expect(
      attendanceService.checkIn(employee, {
        method: 'face',
        location,
        faceEmbedding,
        livenessPassed: true,
      }),
    ).rejects.toMatchObject({ code: 'ALREADY_CHECKED_IN' });
    expect(mockedFaceVerify).not.toHaveBeenCalled();
  });
});

describe('attendanceService.checkOut', () => {
  it('computes workingMinutes net of breaks and flags overtime past 8h', async () => {
    const fake = createFakeAttendance({
      checkInAt: new Date('2026-08-04T09:00:00Z'),
      breaks: [{ start: new Date('2026-08-04T13:00:00Z'), end: new Date('2026-08-04T13:30:00Z') }],
    });
    mockedAttendanceFindOne.mockReturnValue(mockQuery(fake));
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T18:00:00Z'));

    const result = await attendanceService.checkOut(employee);

    expect(result.workingMinutes).toBe(510);
    expect(result.isOvertime).toBe(true);
    expect(result.overtimeMinutes).toBe(30);
    jest.useRealTimers();
  });

  it('downgrades status to half_day when working minutes are below the threshold', async () => {
    const fake = createFakeAttendance({ checkInAt: new Date('2026-08-04T09:00:00Z') });
    mockedAttendanceFindOne.mockReturnValue(mockQuery(fake));
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T11:00:00Z'));

    const result = await attendanceService.checkOut(employee);

    expect(result.status).toBe('half_day');
    jest.useRealTimers();
  });

  it('rejects checkout with an active break still open', async () => {
    const fake = createFakeAttendance({
      checkInAt: new Date('2026-08-04T09:00:00Z'),
      breaks: [{ start: new Date(), end: null }],
    });
    mockedAttendanceFindOne.mockReturnValue(mockQuery(fake));

    await expect(attendanceService.checkOut(employee)).rejects.toMatchObject({
      code: 'ACTIVE_BREAK',
    });
  });

  it('rejects checkout when never checked in', async () => {
    mockedAttendanceFindOne.mockReturnValue(mockQuery(null));
    await expect(attendanceService.checkOut(employee)).rejects.toMatchObject({
      code: 'NOT_CHECKED_IN',
    });
  });

  it('rejects a second checkout', async () => {
    const fake = createFakeAttendance({
      checkInAt: new Date('2026-08-04T09:00:00Z'),
      checkOutAt: new Date('2026-08-04T18:00:00Z'),
    });
    mockedAttendanceFindOne.mockReturnValue(mockQuery(fake));

    await expect(attendanceService.checkOut(employee)).rejects.toMatchObject({
      code: 'ALREADY_CHECKED_OUT',
    });
  });

  it("derives overtime/half-day thresholds from the employee's real assigned shift length, not the 8h default (Phase 10)", async () => {
    mockedGetEffectiveShift.mockResolvedValue({
      startTime: '09:00',
      gracePeriodMinutes: 10,
      workdayMinutes: 360,
      shiftId: 'shift-short',
    });
    const fake = createFakeAttendance({ checkInAt: new Date('2026-08-04T09:00:00Z') });
    mockedAttendanceFindOne.mockReturnValue(mockQuery(fake));
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T16:00:00Z'));

    const result = await attendanceService.checkOut(employee);

    expect(result.workingMinutes).toBe(420);
    expect(result.isOvertime).toBe(true);
    expect(result.overtimeMinutes).toBe(60);
    expect(result.status).not.toBe('half_day');
    jest.useRealTimers();
  });

  it('flags half_day against the real shift length even when it would be a full day under the 8h default', async () => {
    mockedGetEffectiveShift.mockResolvedValue({
      startTime: '09:00',
      gracePeriodMinutes: 10,
      workdayMinutes: 180,
      shiftId: 'shift-tiny',
    });
    const fake = createFakeAttendance({ checkInAt: new Date('2026-08-04T09:00:00Z') });
    mockedAttendanceFindOne.mockReturnValue(mockQuery(fake));
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T11:00:00Z'));

    const result = await attendanceService.checkOut(employee);

    expect(result.status).not.toBe('half_day');
    jest.useRealTimers();
  });
});

describe('attendanceService.breakStart / breakEnd', () => {
  it('starts a break and rejects a second concurrent one', async () => {
    const fake = createFakeAttendance({ checkInAt: new Date() });
    mockedAttendanceFindOne.mockReturnValue(mockQuery(fake));

    await attendanceService.breakStart(employee);
    expect(fake.breaks).toHaveLength(1);
    expect(fake.breaks[0].end).toBeNull();

    mockedAttendanceFindOne.mockReturnValue(mockQuery(fake));
    await expect(attendanceService.breakStart(employee)).rejects.toMatchObject({
      code: 'ACTIVE_BREAK',
    });
  });

  it('ends the open break', async () => {
    const fake = createFakeAttendance({
      checkInAt: new Date(),
      breaks: [{ start: new Date(), end: null }],
    });
    mockedAttendanceFindOne.mockReturnValue(mockQuery(fake));

    await attendanceService.breakEnd(employee);
    expect(fake.breaks[0].end).not.toBeNull();
  });

  it('rejects ending a break when none is active', async () => {
    const fake = createFakeAttendance({ checkInAt: new Date() });
    mockedAttendanceFindOne.mockReturnValue(mockQuery(fake));

    await expect(attendanceService.breakEnd(employee)).rejects.toMatchObject({
      code: 'NO_ACTIVE_BREAK',
    });
  });
});

const baseListQuery = { page: 1, limit: 20 };

describe('attendanceService.listAttendance (report scoping)', () => {
  it('blocks the employee role', async () => {
    await expect(attendanceService.listAttendance(baseListQuery, employee)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it("scopes a Manager's report to their own team", async () => {
    mockedEmployeeFind.mockReturnValue(
      mockQuery([{ _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' }, { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb' }]),
    );
    mockedAttendanceFind.mockReturnValue(mockQuery([]));
    mockedAttendanceCount.mockResolvedValue(0);

    await attendanceService.listAttendance(baseListQuery, manager);

    expect(mockedAttendanceFind).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: { $in: ['aaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbb'] },
      }),
    );
  });

  it('rejects a Manager filtering by an employee outside their team', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([{ _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' }]));

    await expect(
      attendanceService.listAttendance({ ...baseListQuery, employeeId: 'someone-else' }, manager),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('gives HR unscoped visibility by default', async () => {
    mockedAttendanceFind.mockReturnValue(mockQuery([]));
    mockedAttendanceCount.mockResolvedValue(0);
    mockedEmployeeFind.mockReturnValue(mockQuery([]));

    await attendanceService.listAttendance(baseListQuery, hr);

    expect(mockedAttendanceFind).toHaveBeenCalledWith({});
  });

  it("attaches each row's employee name/code from a single batch lookup, not one query per row", async () => {
    const empA = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const empB = 'bbbbbbbbbbbbbbbbbbbbbbbb';
    mockedAttendanceFind.mockReturnValue(
      mockQuery([
        { id: 'att-1', employeeId: empA, status: 'present', breaks: [] },
        { id: 'att-2', employeeId: empB, status: 'present', breaks: [] },
        { id: 'att-3', employeeId: empA, status: 'late', breaks: [] },
      ]),
    );
    mockedAttendanceCount.mockResolvedValue(3);
    mockedEmployeeFind.mockReturnValue(
      mockQuery([
        { _id: empA, employeeCode: 'ENG-0001', firstName: 'Asha', lastName: 'Rao' },
        { _id: empB, employeeCode: 'ENG-0002', firstName: 'Bilal', lastName: 'Khan' },
      ]),
    );

    const result = await attendanceService.listAttendance(baseListQuery, hr);

    expect(mockedEmployeeFind).toHaveBeenCalledTimes(1);
    expect(mockedEmployeeFind).toHaveBeenCalledWith({ _id: { $in: [empA, empB] } });
    expect(result.items[0].employee).toEqual({
      id: empA,
      employeeCode: 'ENG-0001',
      firstName: 'Asha',
      lastName: 'Rao',
    });
    expect(result.items[1].employee?.employeeCode).toBe('ENG-0002');
    expect(result.items[2].employee).toEqual(result.items[0].employee);
  });

  it("never attaches an employee ref to the caller's own /me history (getMyAttendance)", async () => {
    mockedAttendanceFind.mockReturnValue(
      mockQuery([
        { id: 'att-1', employeeId: 'aaaaaaaaaaaaaaaaaaaaaaaa', status: 'present', breaks: [] },
      ]),
    );

    const result = await attendanceService.getMyAttendance(employee, {});

    expect(result[0].employee).toBeUndefined();
    expect(mockedEmployeeFind).not.toHaveBeenCalled();
  });
});

describe('attendanceService.correctAttendance', () => {
  it('applies the correction, recomputes hours, and records an audit entry', async () => {
    const fake = createFakeAttendance({
      checkInAt: new Date('2026-08-04T09:00:00Z'),
    });
    mockedAttendanceFindById.mockReturnValue(mockQuery(fake));

    const result = await attendanceService.correctAttendance(
      'att-1',
      { checkOutAt: new Date('2026-08-04T17:00:00Z'), reason: 'Forgot to check out' },
      hr,
    );

    expect(result.isCorrected).toBe(true);
    expect(result.workingMinutes).toBe(480);
    expect(mockedRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'attendance.correct', entityId: 'att-1' }),
    );
  });

  it('404s for a missing record', async () => {
    mockedAttendanceFindById.mockReturnValue(mockQuery(null));
    await expect(
      attendanceService.correctAttendance('ghost', { reason: 'x' }, hr),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('attendanceService.requestCorrection / reviewCorrection', () => {
  it('lets an employee request a correction on their own record', async () => {
    const fake = createFakeAttendance();
    mockedAttendanceFindById.mockReturnValue(mockQuery(fake));

    const result = await attendanceService.requestCorrection(
      'att-1',
      { requestedCheckInAt: new Date('2026-08-04T09:00:00Z'), reason: 'Forgot to punch in' },
      employee,
    );

    expect(result.correctionRequest?.status).toBe('pending');
  });

  it("blocks requesting a correction on someone else's record", async () => {
    const fake = createFakeAttendance({ employeeId: 'someone-else' });
    mockedAttendanceFindById.mockReturnValue(mockQuery(fake));

    await expect(
      attendanceService.requestCorrection('att-1', { reason: 'x' }, employee),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects a second pending request', async () => {
    const fake = createFakeAttendance({ correctionRequest: { status: 'pending' } });
    mockedAttendanceFindById.mockReturnValue(mockQuery(fake));

    await expect(
      attendanceService.requestCorrection('att-1', { reason: 'x' }, employee),
    ).rejects.toMatchObject({ code: 'CORRECTION_PENDING' });
  });

  it('approves a pending request and applies the requested time', async () => {
    const fake = createFakeAttendance({
      checkInAt: new Date('2026-08-04T09:30:00Z'),
      checkOutAt: new Date('2026-08-04T17:00:00Z'),
      correctionRequest: {
        status: 'pending',
        requestedCheckInAt: new Date('2026-08-04T09:00:00Z'),
        requestedCheckOutAt: null,
        reason: 'Forgot to punch in on time',
      },
    });
    mockedAttendanceFindById.mockReturnValue(mockQuery(fake));

    const result = await attendanceService.reviewCorrection('att-1', 'approved', hr);

    expect(result.isCorrected).toBe(true);
    expect(result.correctionRequest?.status).toBe('approved');
    expect(mockedRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'attendance.correction.approved' }),
    );
    expect(mockedNotify).toHaveBeenCalledWith(
      fake.employeeId,
      expect.stringContaining('approved'),
      expect.any(String),
      'attendance',
      expect.objectContaining({ attendanceId: fake.id }),
    );
  });

  it('rejects approval when there is no pending request', async () => {
    mockedAttendanceFindById.mockReturnValue(mockQuery(createFakeAttendance()));
    await expect(attendanceService.reviewCorrection('att-1', 'approved', hr)).rejects.toMatchObject(
      { code: 'NO_PENDING_REQUEST' },
    );
  });

  it('blocks a Manager from reviewing a request outside their team', async () => {
    const fake = createFakeAttendance({ correctionRequest: { status: 'pending', reason: 'x' } });
    mockedAttendanceFindById.mockReturnValue(mockQuery(fake));
    mockedEmployeeFindById.mockReturnValue(mockQuery({ managerId: 'someone-else' }));

    await expect(
      attendanceService.reviewCorrection('att-1', 'approved', manager),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('attendanceService.syncAttendance', () => {
  function checkInPunch(overrides: Record<string, unknown> = {}) {
    return {
      clientGeneratedId: 'uuid-1',
      type: 'check_in' as const,
      method: 'manual' as const,
      occurredAt: new Date('2026-08-04T09:05:00Z'),
      ...overrides,
    };
  }

  function checkOutPunch(overrides: Record<string, unknown> = {}) {
    return {
      clientGeneratedId: 'uuid-2',
      type: 'check_out' as const,
      occurredAt: new Date('2026-08-04T18:00:00Z'),
      ...overrides,
    };
  }

  it('applies a new check-in punch and tags it with clientGeneratedId', async () => {
    mockedAttendanceFindOne
      .mockReturnValueOnce(mockQuery(null))
      .mockReturnValueOnce(mockQuery(null));

    const results = await attendanceService.syncAttendance(hr, [checkInPunch()]);

    expect(results).toEqual([
      { clientGeneratedId: 'uuid-1', status: 'applied', attendanceId: 'new-att-id' },
    ]);
    expect(mockedAttendanceCtor).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: hr.employeeId, method: 'manual' }),
    );
  });

  it('reports a duplicate without touching the day lookup at all', async () => {
    mockedAttendanceFindOne.mockReturnValueOnce(
      mockQuery(createFakeAttendance({ id: 'existing-att' })),
    );

    const results = await attendanceService.syncAttendance(hr, [checkInPunch()]);

    expect(results).toEqual([
      { clientGeneratedId: 'uuid-1', status: 'duplicate', attendanceId: 'existing-att' },
    ]);
    expect(mockedAttendanceFindOne).toHaveBeenCalledTimes(1);
  });

  it('reports a check-in conflict (already checked in) with the AppError code as the reason, and audits it', async () => {
    const already = createFakeAttendance({ id: 'att-today', checkInAt: new Date() });
    mockedAttendanceFindOne
      .mockReturnValueOnce(mockQuery(null))
      .mockReturnValueOnce(mockQuery(already))
      .mockReturnValueOnce(mockQuery(already));

    const results = await attendanceService.syncAttendance(hr, [checkInPunch()]);

    expect(results).toEqual([
      {
        clientGeneratedId: 'uuid-1',
        status: 'conflict',
        attendanceId: 'att-today',
        reason: 'ALREADY_CHECKED_IN',
      },
    ]);
    expect(mockedRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'attendance.sync.conflict', entityId: 'att-today' }),
    );
  });

  it('applies a check-out punch against an already-checked-in day', async () => {
    const openDay = createFakeAttendance({ checkInAt: new Date('2026-08-04T09:00:00Z') });
    mockedAttendanceFindOne
      .mockReturnValueOnce(mockQuery(null))
      .mockReturnValueOnce(mockQuery(openDay));

    const results = await attendanceService.syncAttendance(employee, [checkOutPunch()]);

    expect(results).toEqual([
      { clientGeneratedId: 'uuid-2', status: 'applied', attendanceId: openDay.id },
    ]);
    expect(openDay.clientGeneratedId).toBe('uuid-2');
  });

  it('reports a check-out conflict when there is nothing to check out from, with no attendanceId', async () => {
    mockedAttendanceFindOne
      .mockReturnValueOnce(mockQuery(null))
      .mockReturnValueOnce(mockQuery(null))
      .mockReturnValueOnce(mockQuery(null));

    const results = await attendanceService.syncAttendance(employee, [checkOutPunch()]);

    expect(results).toEqual([
      { clientGeneratedId: 'uuid-2', status: 'conflict', reason: 'NOT_CHECKED_IN' },
    ]);
  });

  it('processes punches sequentially, in the given order, not concurrently', async () => {
    mockedAttendanceFindOne
      .mockReturnValueOnce(mockQuery(null))
      .mockReturnValueOnce(mockQuery(null))
      .mockReturnValueOnce(mockQuery(null))
      .mockReturnValueOnce(mockQuery(null));
    mockedAttendanceFindOne.mockReturnValueOnce(mockQuery(null));

    const results = await attendanceService.syncAttendance(hr, [
      checkInPunch({ clientGeneratedId: 'uuid-1' }),
      checkOutPunch({ clientGeneratedId: 'uuid-2' }),
    ]);

    expect(results.map((r) => r.clientGeneratedId)).toEqual(['uuid-1', 'uuid-2']);
    expect(results[0].status).toBe('applied');
    expect(results[1].status).toBe('conflict');
  });

  it('lets a genuine unexpected error propagate rather than masking it as a conflict', async () => {
    mockedAttendanceFindOne.mockImplementationOnce(() => {
      throw new Error('database connection lost');
    });

    await expect(attendanceService.syncAttendance(hr, [checkInPunch()])).rejects.toThrow(
      'database connection lost',
    );
  });
});

describe('attendanceService exports', () => {
  it('produces a non-empty Excel buffer', async () => {
    mockedAttendanceFind.mockReturnValue(
      mockQuery([
        createFakeAttendance({
          employeeId: { employeeCode: 'ENG-0001', firstName: 'Jane', lastName: 'Doe' },
        }),
      ]),
    );

    const buffer = await attendanceService.exportExcel({}, hr);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('produces a non-empty PDF buffer', async () => {
    mockedAttendanceFind.mockReturnValue(
      mockQuery([
        createFakeAttendance({
          employeeId: { employeeCode: 'ENG-0001', firstName: 'Jane', lastName: 'Doe' },
        }),
      ]),
    );

    const buffer = await attendanceService.exportPdf({}, hr);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
