import { mockQuery } from '../../utils/mockQuery';

jest.mock('../../../src/modules/attendance/attendance.model', () => {
  const actual = jest.requireActual('../../../src/modules/attendance/attendance.model');
  return { ...actual, Attendance: { find: jest.fn(), updateOne: jest.fn() } };
});
jest.mock('../../../src/modules/employees/employee.model', () => ({
  Employee: { find: jest.fn() },
}));
jest.mock('../../../src/modules/leaves/holiday.service', () => ({
  getHolidayDatesInRange: jest.fn(),
}));

import { Attendance } from '../../../src/modules/attendance/attendance.model';
import { runAbsenceSweep } from '../../../src/modules/attendance/absenceDetection.service';
import { Employee } from '../../../src/modules/employees/employee.model';
import { getHolidayDatesInRange } from '../../../src/modules/leaves/holiday.service';

const mockedEmployeeFind = Employee.find as unknown as jest.Mock;
const mockedAttendanceFind = Attendance.find as unknown as jest.Mock;
const mockedAttendanceUpdateOne = Attendance.updateOne as unknown as jest.Mock;
const mockedGetHolidays = getHolidayDatesInRange as unknown as jest.Mock;

const aMonday = new Date('2026-08-10T00:00:00.000Z');
const aSaturday = new Date('2026-08-08T00:00:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetHolidays.mockResolvedValue([]);
  mockedAttendanceUpdateOne.mockResolvedValue({});
});

describe('runAbsenceSweep', () => {
  it('skips weekends without querying employees at all', async () => {
    const result = await runAbsenceSweep(aSaturday);

    expect(result.skippedReason).toBe('weekend_or_holiday');
    expect(result.employeesMarkedAbsent).toBe(0);
    expect(mockedEmployeeFind).not.toHaveBeenCalled();
  });

  it('skips a declared holiday even on a weekday', async () => {
    mockedGetHolidays.mockResolvedValue([aMonday]);

    const result = await runAbsenceSweep(aMonday);

    expect(result.skippedReason).toBe('weekend_or_holiday');
    expect(mockedEmployeeFind).not.toHaveBeenCalled();
  });

  it('marks only active employees with no Attendance record as absent', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([{ _id: 'emp-1' }, { _id: 'emp-2' }]));
    mockedAttendanceFind.mockReturnValue(mockQuery([{ employeeId: 'emp-1' }]));

    const result = await runAbsenceSweep(aMonday);

    expect(mockedAttendanceUpdateOne).toHaveBeenCalledTimes(1);
    expect(mockedAttendanceUpdateOne).toHaveBeenCalledWith(
      { employeeId: 'emp-2', date: expect.any(Date) },
      {
        $setOnInsert: {
          employeeId: 'emp-2',
          date: expect.any(Date),
          method: 'manual',
          status: 'absent',
        },
      },
      { upsert: true },
    );
    expect(result.employeesMarkedAbsent).toBe(1);
    expect(result.skippedReason).toBeNull();
  });

  it('marks nobody absent when every active employee already has a record', async () => {
    mockedEmployeeFind.mockReturnValue(mockQuery([{ _id: 'emp-1' }]));
    mockedAttendanceFind.mockReturnValue(mockQuery([{ employeeId: 'emp-1' }]));

    const result = await runAbsenceSweep(aMonday);

    expect(mockedAttendanceUpdateOne).not.toHaveBeenCalled();
    expect(result.employeesMarkedAbsent).toBe(0);
  });
});
