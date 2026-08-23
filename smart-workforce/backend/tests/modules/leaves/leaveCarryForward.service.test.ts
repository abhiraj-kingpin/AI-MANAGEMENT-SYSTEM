import { mockQuery } from '../../utils/mockQuery';

jest.mock('../../../src/modules/leaves/leaveType.model', () => ({
  LeaveType: { find: jest.fn() },
}));
jest.mock('../../../src/modules/leaves/leaveBalance.model', () => ({
  LeaveBalance: { find: jest.fn(), findOneAndUpdate: jest.fn() },
}));
jest.mock('../../../src/modules/employees/employee.model', () => ({
  Employee: { find: jest.fn() },
}));

import { Employee } from '../../../src/modules/employees/employee.model';
import { LeaveBalance } from '../../../src/modules/leaves/leaveBalance.model';
import { LeaveType } from '../../../src/modules/leaves/leaveType.model';
import { runCarryForward } from '../../../src/modules/leaves/leaveCarryForward.service';

const mockedEmployeeFind = Employee.find as unknown as jest.Mock;
const mockedLeaveTypeFind = LeaveType.find as unknown as jest.Mock;
const mockedBalanceFind = LeaveBalance.find as unknown as jest.Mock;
const mockedBalanceUpdate = LeaveBalance.findOneAndUpdate as unknown as jest.Mock;

const carryForwardType = {
  _id: 'lt-annual',
  defaultAnnualQuota: 20,
  maxCarryForwardDays: 5,
  carryForward: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedBalanceUpdate.mockResolvedValue({});
});

describe('runCarryForward', () => {
  it('returns a zeroed result without querying employees/balances when no leave type allows carry-forward', async () => {
    mockedLeaveTypeFind.mockReturnValue(mockQuery([]));

    const result = await runCarryForward(2025, 2026);

    expect(result).toEqual({
      fromYear: 2025,
      toYear: 2026,
      employeesProcessed: 0,
      balancesUpdated: 0,
    });
    expect(mockedEmployeeFind).not.toHaveBeenCalled();
  });

  it('carries forward the remaining balance, capped at maxCarryForwardDays, for an employee with an existing prior-year row', async () => {
    mockedLeaveTypeFind.mockReturnValue(mockQuery([carryForwardType]));
    mockedEmployeeFind.mockReturnValue(mockQuery([{ _id: 'emp-1' }]));
    mockedBalanceFind.mockReturnValue(
      mockQuery([
        {
          employeeId: 'emp-1',
          leaveTypeId: 'lt-annual',
          allocated: 20,
          used: 5,
          carriedForward: 0,
        },
      ]),
    );

    const result = await runCarryForward(2025, 2026);

    expect(mockedBalanceUpdate).toHaveBeenCalledWith(
      { employeeId: 'emp-1', leaveTypeId: 'lt-annual', year: 2026 },
      {
        $set: { carriedForward: 5 },
        $setOnInsert: { allocated: 20, used: 0 },
      },
      { upsert: true },
    );
    expect(result).toEqual({
      fromYear: 2025,
      toYear: 2026,
      employeesProcessed: 1,
      balancesUpdated: 1,
    });
  });

  it('still computes a carry-forward for an employee with no persisted prior-year row (never took leave)', async () => {
    mockedLeaveTypeFind.mockReturnValue(mockQuery([carryForwardType]));
    mockedEmployeeFind.mockReturnValue(mockQuery([{ _id: 'emp-2' }]));
    mockedBalanceFind.mockReturnValue(mockQuery([]));

    const result = await runCarryForward(2025, 2026);

    expect(mockedBalanceUpdate).toHaveBeenCalledWith(
      { employeeId: 'emp-2', leaveTypeId: 'lt-annual', year: 2026 },
      { $set: { carriedForward: 5 }, $setOnInsert: { allocated: 20, used: 0 } },
      { upsert: true },
    );
    expect(result.balancesUpdated).toBe(1);
  });

  it('skips the write entirely when nothing is left to carry forward', async () => {
    mockedLeaveTypeFind.mockReturnValue(mockQuery([carryForwardType]));
    mockedEmployeeFind.mockReturnValue(mockQuery([{ _id: 'emp-3' }]));
    mockedBalanceFind.mockReturnValue(
      mockQuery([
        {
          employeeId: 'emp-3',
          leaveTypeId: 'lt-annual',
          allocated: 20,
          used: 20,
          carriedForward: 0,
        },
      ]),
    );

    const result = await runCarryForward(2025, 2026);

    expect(mockedBalanceUpdate).not.toHaveBeenCalled();
    expect(result).toEqual({
      fromYear: 2025,
      toYear: 2026,
      employeesProcessed: 0,
      balancesUpdated: 0,
    });
  });
});
