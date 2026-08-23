import { countBusinessDays, listBusinessDays } from '../../src/shared/utils/businessDays';

describe('listBusinessDays', () => {
  it('returns every day for a single weekday', () => {
    const days = listBusinessDays(new Date('2026-08-10'), new Date('2026-08-10'));
    expect(days).toHaveLength(1);
    expect(days[0].toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });

  it('excludes Saturday and Sunday from a full week', () => {
    const days = listBusinessDays(new Date('2026-08-10'), new Date('2026-08-16'));
    expect(days).toHaveLength(5);
    expect(days.map((d) => d.getUTCDay())).not.toContain(0);
    expect(days.map((d) => d.getUTCDay())).not.toContain(6);
  });

  it('excludes an explicit holiday that falls on a weekday', () => {
    const days = listBusinessDays(new Date('2026-08-10'), new Date('2026-08-14'), [
      new Date('2026-08-12'),
    ]);
    expect(days).toHaveLength(4);
    expect(days.some((d) => d.toISOString() === '2026-08-12T00:00:00.000Z')).toBe(false);
  });

  it('ignores a holiday that falls on a weekend (already excluded)', () => {
    const days = listBusinessDays(new Date('2026-08-10'), new Date('2026-08-16'), [
      new Date('2026-08-15'),
    ]);
    expect(days).toHaveLength(5);
  });

  it('returns an empty array when the range is entirely a weekend', () => {
    const days = listBusinessDays(new Date('2026-08-15'), new Date('2026-08-16'));
    expect(days).toHaveLength(0);
  });

  it('is inclusive of both start and end dates', () => {
    const days = listBusinessDays(new Date('2026-08-10'), new Date('2026-08-11'));
    expect(days).toHaveLength(2);
  });

  it('normalizes any time-of-day component to UTC midnight', () => {
    const days = listBusinessDays(
      new Date('2026-08-10T15:30:00Z'),
      new Date('2026-08-10T23:59:59Z'),
    );
    expect(days).toHaveLength(1);
    expect(days[0].toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });
});

describe('countBusinessDays', () => {
  it('matches the length of listBusinessDays for the same range', () => {
    const start = new Date('2026-08-10');
    const end = new Date('2026-08-21');
    expect(countBusinessDays(start, end)).toBe(listBusinessDays(start, end).length);
    expect(countBusinessDays(start, end)).toBe(10);
  });

  it('returns 0 for a weekend-only range', () => {
    expect(countBusinessDays(new Date('2026-08-15'), new Date('2026-08-16'))).toBe(0);
  });

  it('subtracts holidays from the business-day count', () => {
    const withoutHoliday = countBusinessDays(new Date('2026-08-10'), new Date('2026-08-14'));
    const withHoliday = countBusinessDays(new Date('2026-08-10'), new Date('2026-08-14'), [
      new Date('2026-08-13'),
    ]);
    expect(withoutHoliday).toBe(5);
    expect(withHoliday).toBe(4);
  });
});
