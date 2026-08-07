/** Rounds to 2 decimal places — every percentage/currency figure computed across the app (payroll, analytics) goes through this rather than each module rolling its own. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
