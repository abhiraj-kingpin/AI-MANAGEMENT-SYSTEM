import type { DepartmentComparison } from '@/types/api';

/** A horizontal-bar-style ranking rather than a second line chart — easier to scan "who's ahead/behind" across departments than overlaying N lines on one axis. */
export function DepartmentComparisonTable({ rows }: { rows: DepartmentComparison[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-text-dim">No departments to compare yet.</p>
    );
  }

  const sorted = [...rows].sort((a, b) => b.attendanceRate - a.attendanceRate);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((row) => (
        <div key={row.departmentId} className="flex items-center gap-3">
          <span
            className="w-28 shrink-0 truncate text-[13px] font-semibold text-text"
            title={row.departmentName}
          >
            {row.departmentName}
          </span>
          <div className="relative h-6 flex-1 overflow-hidden rounded-pill bg-white/[0.04]">
            <div
              className="h-full rounded-pill bg-gradient-to-r from-accent to-accent-light"
              style={{ width: `${Math.min(100, Math.max(0, row.attendanceRate))}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right font-mono text-[12.5px] text-text-dim">
            {row.attendanceRate.toFixed(1)}%
          </span>
          <span className="w-16 shrink-0 text-right font-mono text-[11.5px] text-warning">
            {row.lateRate.toFixed(1)}% late
          </span>
          <span className="w-16 shrink-0 text-right font-mono text-[11.5px] text-text-faint">
            {row.headcount} ppl
          </span>
        </div>
      ))}
    </div>
  );
}
