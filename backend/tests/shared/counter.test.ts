jest.mock('../../src/shared/counter/counter.model', () => ({
  Counter: { findByIdAndUpdate: jest.fn() },
}));

import { nextSequence } from '../../src/shared/counter/counter.service';
import { Counter } from '../../src/shared/counter/counter.model';

const mockedFindByIdAndUpdate = Counter.findByIdAndUpdate as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('nextSequence', () => {
  it('atomically increments via $inc, upserting the counter on first use', async () => {
    mockedFindByIdAndUpdate.mockResolvedValue({ _id: 'ENG', seq: 1 });

    const result = await nextSequence('ENG');

    expect(result).toBe(1);
    expect(mockedFindByIdAndUpdate).toHaveBeenCalledWith(
      'ENG',
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );
  });

  it('returns the post-increment value, not the pre-increment one', async () => {
    mockedFindByIdAndUpdate.mockResolvedValue({ _id: 'ENG', seq: 42 });

    expect(await nextSequence('ENG')).toBe(42);
  });

  it('keeps independent sequences for different names', async () => {
    mockedFindByIdAndUpdate
      .mockResolvedValueOnce({ _id: 'ENG', seq: 1 })
      .mockResolvedValueOnce({ _id: 'SAL', seq: 1 });

    const eng = await nextSequence('ENG');
    const sal = await nextSequence('SAL');

    expect(eng).toBe(1);
    expect(sal).toBe(1);
    expect(mockedFindByIdAndUpdate).toHaveBeenNthCalledWith(
      1,
      'ENG',
      expect.anything(),
      expect.anything(),
    );
    expect(mockedFindByIdAndUpdate).toHaveBeenNthCalledWith(
      2,
      'SAL',
      expect.anything(),
      expect.anything(),
    );
  });
});
