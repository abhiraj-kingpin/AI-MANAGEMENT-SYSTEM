import { mockQuery } from '../utils/mockQuery';

jest.mock('../../src/modules/employees/employee.model', () => ({
  Employee: { find: jest.fn() },
}));

import { Employee } from '../../src/modules/employees/employee.model';
import { getManagedEmployeeIds } from '../../src/shared/utils/teamScope';
import type { ActorContext } from '../../src/shared/types/actorContext';

const mockedFind = Employee.find as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getManagedEmployeeIds', () => {
  it("queries Employee by managerId = the actor's own employeeId", async () => {
    mockedFind.mockReturnValue(mockQuery([{ _id: 'bbbbbbbbbbbbbbbbbbbbbbbb' }]));
    const actor: ActorContext = {
      id: 'user-mgr',
      role: 'manager',
      employeeId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    };

    const ids = await getManagedEmployeeIds(actor);

    expect(mockedFind).toHaveBeenCalledWith({ managerId: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
    expect(ids).toEqual(['bbbbbbbbbbbbbbbbbbbbbbbb']);
  });

  it('returns an empty array for a manager with no direct reports', async () => {
    mockedFind.mockReturnValue(mockQuery([]));
    const actor: ActorContext = { id: 'user-mgr', role: 'manager', employeeId: 'aaa' };

    expect(await getManagedEmployeeIds(actor)).toEqual([]);
  });

  it('rejects an actor with no linked employee profile rather than querying with undefined', async () => {
    const actor: ActorContext = { id: 'user-x', role: 'manager' };

    await expect(getManagedEmployeeIds(actor)).rejects.toMatchObject({
      code: 'NO_EMPLOYEE_PROFILE',
    });
    expect(mockedFind).not.toHaveBeenCalled();
  });
});
