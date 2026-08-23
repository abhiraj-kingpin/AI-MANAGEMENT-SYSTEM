import { shiftDurationMinutes } from '../../src/shared/utils/dateTime';

describe('shiftDurationMinutes', () => {
  it('computes a same-day shift normally', () => {
    expect(shiftDurationMinutes('09:00', '17:00')).toBe(8 * 60);
  });

  it('computes a short same-day shift', () => {
    expect(shiftDurationMinutes('09:00', '15:00')).toBe(6 * 60);
  });

  it('wraps past midnight for a night shift', () => {
    expect(shiftDurationMinutes('22:00', '06:00')).toBe(8 * 60);
  });

  it('wraps past midnight when the gap is small', () => {
    expect(shiftDurationMinutes('23:30', '00:30')).toBe(60);
  });

  it('treats identical start/end as a full 24-hour shift rather than zero', () => {
    expect(shiftDurationMinutes('09:00', '09:00')).toBe(24 * 60);
  });
});
