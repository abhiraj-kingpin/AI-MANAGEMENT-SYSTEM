import { mockQuery } from '../../utils/mockQuery';

jest.mock('../../../src/modules/leaves/holiday.model', () => ({
  Holiday: { find: jest.fn(), create: jest.fn() },
}));

import { Holiday } from '../../../src/modules/leaves/holiday.model';
import { holidayService } from '../../../src/modules/leaves/holiday.service';

const mockedFind = Holiday.find as unknown as jest.Mock;
const mockedCreate = Holiday.create as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('holidayService.list', () => {
  it('returns every holiday, sorted by date, when no year filter is given', async () => {
    mockedFind.mockReturnValue(
      mockQuery([{ id: 'h-1', name: 'Independence Day', date: new Date('2026-08-15') }]),
    );

    await holidayService.list();

    expect(mockedFind).toHaveBeenCalledWith({});
  });

  it('filters to the given calendar year (UTC) when a year is provided', async () => {
    mockedFind.mockReturnValue(mockQuery([]));

    await holidayService.list(2026);

    expect(mockedFind).toHaveBeenCalledWith({
      date: {
        $gte: new Date(Date.UTC(2026, 0, 1)),
        $lte: new Date(Date.UTC(2026, 11, 31, 23, 59, 59)),
      },
    });
  });
});

describe('holidayService.create', () => {
  it('creates a holiday from the given input', async () => {
    mockedCreate.mockResolvedValue({
      id: 'h-2',
      name: 'Republic Day',
      date: new Date('2027-01-26'),
      isOptional: false,
    });

    const dto = await holidayService.create({
      name: 'Republic Day',
      date: new Date('2027-01-26'),
    });

    expect(mockedCreate).toHaveBeenCalledWith({
      name: 'Republic Day',
      date: new Date('2027-01-26'),
    });
    expect(dto.name).toBe('Republic Day');
  });
});
