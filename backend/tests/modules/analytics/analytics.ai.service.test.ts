import { mockQuery } from '../../utils/mockQuery';

// Service-layer unit tests — every model this reaches (directly, or via the
// real resolveEmployeeIds it imports from analytics.service.ts) is mocked,
// no live database. Same approach as analytics.service.test.ts.
jest.mock('../../../src/modules/employees/employee.model', () => ({
  Employee: { find: jest.fn() },
}));
jest.mock('../../../src/modules/attendance/attendance.model', () => ({
  Attendance: { find: jest.fn(), aggregate: jest.fn() },
}));
jest.mock('../../../src/modules/face-recognition/faceEmbedding.model', () => ({
  FaceEmbedding: { find: jest.fn() },
}));
jest.mock('../../../src/modules/leaves/holiday.service', () => ({
  getHolidayDatesInRange: jest.fn(),
}));

import { aiAnalyticsService } from '../../../src/modules/analytics/analytics.ai.service';
import { Attendance } from '../../../src/modules/attendance/attendance.model';
import { Employee } from '../../../src/modules/employees/employee.model';
import { FaceEmbedding } from '../../../src/modules/face-recognition/faceEmbedding.model';
import { getHolidayDatesInRange } from '../../../src/modules/leaves/holiday.service';
import type { ActorContext } from '../../../src/shared/types/actorContext';

const mockedEmployeeFind = Employee.find as unknown as jest.Mock;
const mockedAttendanceFind = Attendance.find as unknown as jest.Mock;
const mockedAttendanceAggregate = Attendance.aggregate as unknown as jest.Mock;
const mockedFaceEmbeddingFind = FaceEmbedding.find as unknown as jest.Mock;
const mockedGetHolidayDatesInRange = getHolidayDatesInRange as unknown as jest.Mock;

const hr: ActorContext = { id: 'user-hr', role: 'hr' };
const employeeActor: ActorContext = { id: 'user-emp', role: 'employee', employeeId: 'emp-1' };

const idOf = (suffix: string) => `${'a'.repeat(24 - suffix.length)}${suffix}`;

function employeeRows(...ids: string[]) {
  return ids.map((id) => ({ _id: id }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetHolidayDatesInRange.mockResolvedValue([]);
  // Sensible "nothing to see here" defaults for getAnomalies' three
  // concurrent detectors — individual tests override just the one(s) they
  // care about, so an unrelated detector never contaminates the assertion.
  mockedAttendanceFind.mockReturnValue(mockQuery([]));
  mockedAttendanceAggregate.mockResolvedValue([]);
  mockedFaceEmbeddingFind.mockReturnValue(mockQuery([]));
});

describe('aiAnalyticsService.getLateRiskEmployees', () => {
  it('rejects a plain employee', async () => {
    await expect(
      aiAnalyticsService.getLateRiskEmployees(employeeActor, { days: 30, limit: 20 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('returns an empty array when the caller has no employees in scope', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([]));

    const result = await aiAnalyticsService.getLateRiskEmployees(hr, { days: 30, limit: 20 });

    expect(result).toEqual([]);
    expect(mockedAttendanceAggregate).not.toHaveBeenCalled();
  });

  it('returns an empty array — without aggregating — when the window has zero working days', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-15T00:00:00Z'));
    mockedEmployeeFind.mockReturnValueOnce(mockQuery(employeeRows(idOf('1'))));
    // Every weekday in the 30-day window is "held" — an artificial holiday
    // list, but the cleanest way to force workingDays to 0 deterministically.
    const allDays: Date[] = [];
    for (let i = 0; i < 30; i += 1) {
      allDays.push(new Date(Date.UTC(2026, 6, 17 + i))); // covers the whole trailing-30-day window
    }
    mockedGetHolidayDatesInRange.mockResolvedValue(allDays);

    const result = await aiAnalyticsService.getLateRiskEmployees(hr, { days: 30, limit: 20 });

    expect(result).toEqual([]);
    expect(mockedAttendanceAggregate).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('scores risk from real late-day counts and flags a worsening trend', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-15T00:00:00Z'));
    const e1 = idOf('1');
    const e2 = idOf('2');
    mockedEmployeeFind
      .mockReturnValueOnce(mockQuery(employeeRows(e1, e2))) // resolveEmployeeIds' lookup
      .mockReturnValueOnce(
        mockQuery([
          { _id: e1, employeeCode: 'ENG-0001', firstName: 'Asha', lastName: 'Rao' },
          { _id: e2, employeeCode: 'ENG-0002', firstName: 'Bilal', lastName: 'Khan' },
        ]),
      ); // name lookup
    mockedAttendanceAggregate.mockResolvedValue([
      // e1 was late twice in the first half, four times in the second — worsening.
      { _id: e1, lateFirstHalf: 2, lateSecondHalf: 4 },
      // e2 has no late records at all — never appears in the aggregation bucket.
    ]);

    const [asha, bilal] = await aiAnalyticsService.getLateRiskEmployees(hr, {
      days: 30,
      limit: 20,
    });

    expect(asha.employeeId).toBe(e1);
    expect(asha.lateDays).toBe(6);
    expect(asha.trend).toBe('increasing');
    expect(asha.riskScore).toBeGreaterThan(asha.lateRate); // the increasing-trend nudge pushed it up
    expect(bilal.employeeId).toBe(e2);
    expect(bilal.lateDays).toBe(0);
    expect(bilal.riskScore).toBe(0);
    // Sorted highest-risk first.
    expect(asha.riskScore).toBeGreaterThan(bilal.riskScore);
    jest.useRealTimers();
  });

  it('caps the result at `limit`', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-15T00:00:00Z'));
    const ids = [idOf('1'), idOf('2'), idOf('3')];
    mockedEmployeeFind.mockReturnValueOnce(mockQuery(employeeRows(...ids))).mockReturnValueOnce(
      mockQuery(
        ids.map((id, i) => ({
          _id: id,
          employeeCode: `ENG-000${i}`,
          firstName: `Emp${i}`,
          lastName: 'Test',
        })),
      ),
    );
    mockedAttendanceAggregate.mockResolvedValue([]);

    const result = await aiAnalyticsService.getLateRiskEmployees(hr, { days: 30, limit: 2 });

    expect(result).toHaveLength(2);
    jest.useRealTimers();
  });
});

describe('aiAnalyticsService.getAbsenteeismTrend', () => {
  it('rejects a plain employee', async () => {
    await expect(
      aiAnalyticsService.getAbsenteeismTrend(employeeActor, { months: 3 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('returns a flat zero history and forecast when the caller has no employees in scope', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([]));

    const result = await aiAnalyticsService.getAbsenteeismTrend(hr, { months: 3 });

    expect(result.history).toEqual([
      { month: expect.any(String), absenteeismRate: 0 },
      { month: expect.any(String), absenteeismRate: 0 },
      { month: expect.any(String), absenteeismRate: 0 },
    ]);
    expect(result.forecastRate).toBe(0);
    expect(result.method).toBe('linear-regression');
    expect(mockedAttendanceAggregate).not.toHaveBeenCalled();
  });

  it('computes a real absence rate (expected minus accounted-for days) and forecasts from it', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-15T00:00:00Z'));
    // A single-month window: August 2026 has 21 working days (see
    // analytics.service.test.ts's hand count), so with 2 employees expected
    // = 42 employee-days.
    mockedEmployeeFind.mockReturnValue(mockQuery(employeeRows(idOf('1'), idOf('2'))));
    mockedAttendanceAggregate.mockResolvedValue([{ _id: '2026-08', accounted: 30 }]);

    const result = await aiAnalyticsService.getAbsenteeismTrend(hr, { months: 1 });

    // absence = 42 - 30 = 12 -> rate = 12/42*100 = 28.57...% -> round2 = 28.57
    expect(result.history).toEqual([{ month: '2026-08', absenteeismRate: 28.57 }]);
    // A single data point forecasts as itself (n===1 branch).
    expect(result.forecastRate).toBe(28.57);
    expect(result.forecastMonth).toBe('2026-09');
    jest.useRealTimers();
  });

  it('extrapolates a real linear trend across three months exactly', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-15T00:00:00Z'));
    // 1 employee, no holidays -> expected = real weekday count for each
    // month: June 2026 = 22, July 2026 = 23, August 2026 = 21 (hand-counted,
    // same method as analytics.service.test.ts's August count).
    mockedEmployeeFind.mockReturnValue(mockQuery(employeeRows(idOf('1'))));
    mockedAttendanceAggregate.mockResolvedValue([
      { _id: '2026-06', accounted: 20 }, // absence 2/22 -> 9.09%
      { _id: '2026-07', accounted: 18 }, // absence 5/23 -> 21.74%
      { _id: '2026-08', accounted: 15 }, // absence 6/21 -> 28.57%
    ]);

    const result = await aiAnalyticsService.getAbsenteeismTrend(hr, { months: 3 });

    expect(result.history).toEqual([
      { month: '2026-06', absenteeismRate: 9.09 },
      { month: '2026-07', absenteeismRate: 21.74 },
      { month: '2026-08', absenteeismRate: 28.57 },
    ]);
    // Least-squares line through (0, 9.09), (1, 21.74), (2, 28.57),
    // evaluated at x=3 — hand-computed: slope 9.74, intercept 10.06,
    // forecast = 10.06 + 9.74*3 = 39.28.
    expect(result.forecastRate).toBe(39.28);
    expect(result.forecastMonth).toBe('2026-09');
    jest.useRealTimers();
  });
});

describe('aiAnalyticsService.getAnomalies', () => {
  it('returns nothing when every signal is clean', async () => {
    const result = await aiAnalyticsService.getAnomalies({ days: 30 });
    expect(result).toEqual([]);
  });

  it('flags an implausible GPS travel speed between two consecutive punches', async () => {
    const employeeId = idOf('1');
    mockedAttendanceFind.mockReturnValue(
      mockQuery([
        {
          employeeId,
          date: new Date('2026-08-01T00:00:00Z'),
          checkInAt: new Date('2026-08-01T09:00:00Z'),
          checkOutAt: new Date('2026-08-01T18:00:00Z'),
          checkInLocation: { lat: 0, lng: 0 },
          checkOutLocation: { lat: 0, lng: 0 },
        },
        {
          employeeId,
          date: new Date('2026-08-02T00:00:00Z'),
          // ~111 km away, only 6 minutes after the prior check-out — no
          // real mode of transport covers that, so this must be flagged.
          checkInAt: new Date('2026-08-01T18:06:00Z'),
          checkOutAt: null,
          checkInLocation: { lat: 1, lng: 0 },
          checkOutLocation: undefined,
        },
      ]),
    );
    mockedEmployeeFind.mockReturnValue(
      mockQuery([{ _id: employeeId, firstName: 'Asha', lastName: 'Rao' }]),
    );

    const result = await aiAnalyticsService.getAnomalies({ days: 30 });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'location_anomaly',
      severity: 'high',
      employeeId,
      employeeName: 'Asha Rao',
    });
    expect(result[0].detail).toContain('km/h');
  });

  it('does not flag a normal overnight gap between two nearby punches', async () => {
    const employeeId = idOf('1');
    mockedAttendanceFind.mockReturnValue(
      mockQuery([
        {
          employeeId,
          date: new Date('2026-08-01T00:00:00Z'),
          checkInAt: new Date('2026-08-01T09:00:00Z'),
          checkOutAt: new Date('2026-08-01T18:00:00Z'),
          checkInLocation: { lat: 12.9716, lng: 77.5946 },
          checkOutLocation: { lat: 12.9716, lng: 77.5946 },
        },
        {
          employeeId,
          date: new Date('2026-08-02T00:00:00Z'),
          checkInAt: new Date('2026-08-02T09:00:00Z'), // 15h later, same city
          checkOutAt: null,
          checkInLocation: { lat: 12.9716, lng: 77.5946 },
          checkOutLocation: undefined,
        },
      ]),
    );

    const result = await aiAnalyticsService.getAnomalies({ days: 30 });

    expect(result).toEqual([]);
  });

  it('flags a highly similar face embedding pair across two different employees', async () => {
    const e1 = idOf('1');
    const e2 = idOf('2');
    mockedFaceEmbeddingFind.mockReturnValue(
      mockQuery([
        { employeeId: e1, vector: [1, 0, 0, 0] },
        { employeeId: e2, vector: [1, 0, 0, 0] }, // identical vector -> similarity 1.0
      ]),
    );
    mockedEmployeeFind.mockReturnValue(
      mockQuery([
        { _id: e1, firstName: 'Asha', lastName: 'Rao' },
        { _id: e2, firstName: 'Bilal', lastName: 'Khan' },
      ]),
    );

    const result = await aiAnalyticsService.getAnomalies({ days: 30 });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'duplicate_face',
      severity: 'high',
      employeeId: e1,
      relatedEmployeeId: e2,
    });
  });

  it('does not flag two dissimilar embeddings, or two embeddings belonging to the same employee', async () => {
    const e1 = idOf('1');
    mockedFaceEmbeddingFind.mockReturnValue(
      mockQuery([
        { employeeId: e1, vector: [1, 0, 0, 0] },
        { employeeId: e1, vector: [0.99, 0.01, 0, 0] }, // same employee, re-registered
        { employeeId: idOf('2'), vector: [0, 1, 0, 0] }, // orthogonal -> similarity 0
      ]),
    );

    const result = await aiAnalyticsService.getAnomalies({ days: 30 });

    expect(result).toEqual([]);
  });

  it('skips (does not crash on) a pair of embeddings from different embedding spaces', async () => {
    // A real, reachable state now that three embedding spaces coexist:
    // 512-d from the real MobileFaceNet model, 67-d from mobile's on-device
    // geometric placeholder, and anything else from a pre-real-model
    // registration. cosineSimilarity throws on a length mismatch (correctly
    // — vectors from different spaces aren't comparable), so this sweep
    // must skip mismatched pairs rather than let one crash the whole
    // request for every other employee.
    const e1 = idOf('1');
    const e2 = idOf('2');
    mockedFaceEmbeddingFind.mockReturnValue(
      mockQuery([
        { employeeId: e1, vector: Array(512).fill(0.5) },
        { employeeId: e2, vector: Array(67).fill(0.5) },
      ]),
    );
    mockedEmployeeFind.mockReturnValue(
      mockQuery([
        { _id: e1, firstName: 'Asha', lastName: 'Rao' },
        { _id: e2, firstName: 'Bilal', lastName: 'Khan' },
      ]),
    );

    await expect(aiAnalyticsService.getAnomalies({ days: 30 })).resolves.toEqual([]);
  });

  it('flags an employee whose overtime is a statistical outlier against everyone else', async () => {
    const outlier = idOf('9');
    mockedAttendanceAggregate.mockResolvedValue([
      { _id: idOf('1'), totalOvertimeMinutes: 60 },
      { _id: idOf('2'), totalOvertimeMinutes: 65 },
      { _id: idOf('3'), totalOvertimeMinutes: 70 },
      { _id: outlier, totalOvertimeMinutes: 900 }, // wildly out of line with everyone else
    ]);
    mockedEmployeeFind.mockReturnValue(
      mockQuery([
        { _id: idOf('1'), firstName: 'A', lastName: 'One' },
        { _id: idOf('2'), firstName: 'B', lastName: 'Two' },
        { _id: idOf('3'), firstName: 'C', lastName: 'Three' },
        { _id: outlier, firstName: 'D', lastName: 'Outlier' },
      ]),
    );

    const result = await aiAnalyticsService.getAnomalies({ days: 30 });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'overtime_outlier',
      severity: 'high',
      employeeId: outlier,
    });
  });

  it('never flags an overtime outlier from fewer than 4 employees with overtime', async () => {
    mockedAttendanceAggregate.mockResolvedValue([
      { _id: idOf('1'), totalOvertimeMinutes: 60 },
      { _id: idOf('2'), totalOvertimeMinutes: 65 },
      { _id: idOf('3'), totalOvertimeMinutes: 900 },
    ]);

    const result = await aiAnalyticsService.getAnomalies({ days: 30 });

    expect(result).toEqual([]);
  });

  // getAnomalies runs four detectors concurrently via Promise.all, and two
  // of them (detectOvertimeOutliers, detectAttendancePatternAnomalies)
  // both call Attendance.aggregate — sharing one mocked function.
  // Promise.all evaluates its array left-to-right, and each async
  // function body runs synchronously up to its own first await, so the
  // call order to mockedAttendanceAggregate is deterministic:
  // detectOvertimeOutliers's call always lands first, this detector's
  // second. mockResolvedValueOnce/mockResolvedValueOnce (not a single
  // shared mockResolvedValue) is what lets a test control both
  // independently — every test above this comment gets away with a
  // single shared mockResolvedValue only because their overtime-outlier
  // row counts (<=4) are all below MIN_EMPLOYEES_FOR_PATTERN_ANALYSIS (5),
  // so this detector's own early-return guard saves them from ever
  // reading those mismatched-shape rows as if they were its own features.
  describe('attendance_pattern_anomaly (real isolation-forest detector)', () => {
    function patternRow(
      id: string,
      overrides: Partial<{
        avgCheckInMinute: number;
        stdDevCheckInMinute: number;
        lateCount: number;
        totalDays: number;
        avgOvertimeMinutes: number;
      }> = {},
    ) {
      return {
        _id: id,
        avgCheckInMinute: 540, // 09:00
        stdDevCheckInMinute: 5,
        lateCount: 0,
        totalDays: 20,
        avgOvertimeMinutes: 10,
        ...overrides,
      };
    }

    it("flags an employee whose attendance pattern is isolated from everyone else's", async () => {
      const outlier = idOf('9');
      const rows = [
        patternRow(idOf('1')),
        patternRow(idOf('2')),
        patternRow(idOf('3')),
        patternRow(idOf('4')),
        // Wildly different on every dimension at once — very late average
        // check-in, erratic timing, late every day, huge overtime — the
        // kind of joint-multi-dimensional outlier a single z-score check
        // would have to be run four separate times to even have a chance
        // of catching, and this catches in one pass.
        patternRow(outlier, {
          avgCheckInMinute: 780, // 13:00
          stdDevCheckInMinute: 120,
          lateCount: 18,
          totalDays: 20,
          avgOvertimeMinutes: 200,
        }),
      ];
      mockedAttendanceAggregate.mockResolvedValueOnce([]).mockResolvedValueOnce(rows);
      mockedEmployeeFind.mockReturnValue(
        mockQuery([
          { _id: idOf('1'), firstName: 'A', lastName: 'One' },
          { _id: idOf('2'), firstName: 'B', lastName: 'Two' },
          { _id: idOf('3'), firstName: 'C', lastName: 'Three' },
          { _id: idOf('4'), firstName: 'D', lastName: 'Four' },
          { _id: outlier, firstName: 'E', lastName: 'Outlier' },
        ]),
      );

      const result = await aiAnalyticsService.getAnomalies({ days: 30 });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'attendance_pattern_anomaly',
        employeeId: outlier,
        employeeName: 'E Outlier',
      });
      expect(result[0].detail).toContain('isolation-forest');
    });

    it('never runs the isolation forest at all with fewer than 5 employees with attendance data', async () => {
      const rows = [patternRow(idOf('1')), patternRow(idOf('2')), patternRow(idOf('3'))];
      mockedAttendanceAggregate.mockResolvedValueOnce([]).mockResolvedValueOnce(rows);

      const result = await aiAnalyticsService.getAnomalies({ days: 30 });

      expect(result).toEqual([]);
    });

    it('does not flag anyone when every employee has an unremarkable, similar pattern', async () => {
      const rows = [
        patternRow(idOf('1'), { avgCheckInMinute: 538 }),
        patternRow(idOf('2'), { avgCheckInMinute: 541 }),
        patternRow(idOf('3'), { avgCheckInMinute: 539 }),
        patternRow(idOf('4'), { avgCheckInMinute: 542 }),
        patternRow(idOf('5'), { avgCheckInMinute: 540 }),
      ];
      mockedAttendanceAggregate.mockResolvedValueOnce([]).mockResolvedValueOnce(rows);

      const result = await aiAnalyticsService.getAnomalies({ days: 30 });

      expect(result).toEqual([]);
    });
  });

  it('merges anomalies from all three (of four) rule-based/statistical detectors in one response', async () => {
    const gpsEmployee = idOf('1');
    mockedAttendanceFind.mockReturnValue(
      mockQuery([
        {
          employeeId: gpsEmployee,
          date: new Date('2026-08-01T00:00:00Z'),
          checkInAt: new Date('2026-08-01T09:00:00Z'),
          checkOutAt: new Date('2026-08-01T09:06:00Z'),
          checkInLocation: { lat: 0, lng: 0 },
          checkOutLocation: { lat: 0, lng: 0 },
        },
        {
          employeeId: gpsEmployee,
          date: new Date('2026-08-01T00:00:00Z'),
          checkInAt: new Date('2026-08-01T09:12:00Z'),
          checkOutAt: null,
          checkInLocation: { lat: 5, lng: 5 },
          checkOutLocation: undefined,
        },
      ]),
    );
    const faceE1 = idOf('2');
    const faceE2 = idOf('3');
    mockedFaceEmbeddingFind.mockReturnValue(
      mockQuery([
        { employeeId: faceE1, vector: [1, 0] },
        { employeeId: faceE2, vector: [1, 0] },
      ]),
    );
    const overtimeOutlier = idOf('9');
    mockedAttendanceAggregate.mockResolvedValue([
      { _id: idOf('4'), totalOvertimeMinutes: 60 },
      { _id: idOf('5'), totalOvertimeMinutes: 65 },
      { _id: idOf('6'), totalOvertimeMinutes: 70 },
      { _id: overtimeOutlier, totalOvertimeMinutes: 900 },
    ]);
    mockedEmployeeFind.mockReturnValue(mockQuery([]));

    const result = await aiAnalyticsService.getAnomalies({ days: 30 });

    const types = result.map((a) => a.type).sort();
    expect(types).toEqual(['duplicate_face', 'location_anomaly', 'overtime_outlier']);
  });
});
