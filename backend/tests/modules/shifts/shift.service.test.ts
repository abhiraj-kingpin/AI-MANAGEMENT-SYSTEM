import { mockQuery } from '../../utils/mockQuery';

jest.mock('../../../src/modules/shifts/shift.model', () => {
  const actual = jest.requireActual('../../../src/modules/shifts/shift.model');
  return {
    ...actual,
    Shift: { create: jest.fn(), find: jest.fn(), findById: jest.fn() },
  };
});

import { Shift } from '../../../src/modules/shifts/shift.model';
import { shiftService } from '../../../src/modules/shifts/shift.service';

const mockedCreate = Shift.create as unknown as jest.Mock;
const mockedFind = Shift.find as unknown as jest.Mock;
const mockedFindById = Shift.findById as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

function fakeShift(overrides: Record<string, unknown> = {}) {
  return {
    id: 'shift-1',
    name: 'Morning',
    type: 'morning',
    startTime: '09:00',
    endTime: '17:00',
    gracePeriodMinutes: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(function save(this: object) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

describe('shiftService.create', () => {
  it('creates a shift from the given input', async () => {
    mockedCreate.mockResolvedValue(fakeShift());

    const dto = await shiftService.create({
      name: 'Morning',
      type: 'morning',
      startTime: '09:00',
      endTime: '17:00',
      gracePeriodMinutes: 10,
    });

    expect(dto.name).toBe('Morning');
    expect(dto.type).toBe('morning');
  });
});

describe('shiftService.list', () => {
  it('defaults to active-only', async () => {
    mockedFind.mockReturnValue(mockQuery([fakeShift()]));
    await shiftService.list(false);
    expect(mockedFind).toHaveBeenCalledWith({ isActive: true });
  });

  it('includes inactive shifts when asked', async () => {
    mockedFind.mockReturnValue(mockQuery([fakeShift(), fakeShift({ isActive: false })]));
    await shiftService.list(true);
    expect(mockedFind).toHaveBeenCalledWith({});
  });
});

describe('shiftService.update', () => {
  it('404s for a missing shift', async () => {
    mockedFindById.mockResolvedValue(null);
    await expect(shiftService.update('ghost', { name: 'X' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('updates only the fields provided', async () => {
    const fake = fakeShift();
    mockedFindById.mockResolvedValue(fake);

    const dto = await shiftService.update('shift-1', { gracePeriodMinutes: 20 });

    expect(fake.gracePeriodMinutes).toBe(20);
    expect(fake.name).toBe('Morning'); // untouched
    expect(dto.gracePeriodMinutes).toBe(20);
  });
});

describe('shiftService.deactivate', () => {
  it('sets isActive to false rather than deleting the document', async () => {
    const fake = fakeShift();
    mockedFindById.mockResolvedValue(fake);

    await shiftService.deactivate('shift-1');

    expect(fake.isActive).toBe(false);
    expect(fake.save).toHaveBeenCalledTimes(1);
  });

  it('404s for a missing shift', async () => {
    mockedFindById.mockResolvedValue(null);
    await expect(shiftService.deactivate('ghost')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
