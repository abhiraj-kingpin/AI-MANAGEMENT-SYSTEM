import { mockQuery } from '../../utils/mockQuery';

jest.mock('../../../src/modules/leaves/leaveType.model', () => ({
  LeaveType: { find: jest.fn(), findOne: jest.fn(), create: jest.fn() },
}));

import { LeaveType } from '../../../src/modules/leaves/leaveType.model';
import { leaveTypeService } from '../../../src/modules/leaves/leaveType.service';

const mockedFind = LeaveType.find as unknown as jest.Mock;
const mockedFindOne = LeaveType.findOne as unknown as jest.Mock;
const mockedCreate = LeaveType.create as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('leaveTypeService.list', () => {
  it('returns every leave type sorted by name', async () => {
    mockedFind.mockReturnValue(
      mockQuery([{ id: 'lt-1', name: 'Casual Leave', defaultAnnualQuota: 12 }]),
    );

    const types = await leaveTypeService.list();

    expect(types).toEqual([expect.objectContaining({ id: 'lt-1', name: 'Casual Leave' })]);
  });
});

describe('leaveTypeService.create', () => {
  it('rejects a duplicate name', async () => {
    mockedFindOne.mockResolvedValue({ id: 'lt-1', name: 'Casual Leave' });

    await expect(
      leaveTypeService.create({ name: 'Casual Leave', defaultAnnualQuota: 12 }),
    ).rejects.toMatchObject({ code: 'LEAVE_TYPE_EXISTS' });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('creates a new leave type when the name is unique', async () => {
    mockedFindOne.mockResolvedValue(null);
    mockedCreate.mockResolvedValue({ id: 'lt-2', name: 'Sick Leave', defaultAnnualQuota: 10 });

    const dto = await leaveTypeService.create({ name: 'Sick Leave', defaultAnnualQuota: 10 });

    expect(mockedCreate).toHaveBeenCalledWith({ name: 'Sick Leave', defaultAnnualQuota: 10 });
    expect(dto.name).toBe('Sick Leave');
  });
});
