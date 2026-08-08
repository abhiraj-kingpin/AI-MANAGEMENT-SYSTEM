import type { AttendanceTrendPoint } from '@/types/api';

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = { top: 16, right: 12, bottom: 28, left: 34 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
const GRID_LINES = [0, 25, 50, 75, 100];

function xFor(index: number, count: number): number {
  return count <= 1 ? PADDING.left : PADDING.left + (index / (count - 1)) * PLOT_WIDTH;
}

function yFor(value: number): number {
  return PADDING.top + (1 - Math.min(100, Math.max(0, value)) / 100) * PLOT_HEIGHT;
}

function monthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
  });
}

function linePath(points: AttendanceTrendPoint[], getValue: (p: AttendanceTrendPoint) => number) {
  return points.map((p, i) => `${xFor(i, points.length)},${yFor(getValue(p))}`).join(' ');
}

/**
 * A hand-rolled SVG line chart, matching `shared/lib/sparkline.ts`'s
 * no-dependency approach rather than pulling in a charting library for one
 * screen. Fixed 0–100 y-axis (both series are already percentages) so the
 * scale reads the same across every date range, instead of autoscaling to
 * whatever the data happens to span.
 */
export function AttendanceTrendChart({ points }: { points: AttendanceTrendPoint[] }) {
  if (points.length === 0) {
    return <p className="py-10 text-center text-sm text-text-dim">Not enough data yet.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-5 text-[12.5px] text-text-dim">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: 'var(--color-accent-light)' }}
            aria-hidden="true"
          />
          Attendance Rate
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: 'var(--color-warning)' }}
            aria-hidden="true"
          />
          Late Rate
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Monthly attendance and late-rate trend"
      >
        {GRID_LINES.map((value) => (
          <g key={value}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={yFor(value)}
              y2={yFor(value)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text
              x={PADDING.left - 8}
              y={yFor(value) + 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--color-text-faint)"
            >
              {value}
            </text>
          </g>
        ))}

        {points.map((p, i) => (
          <text
            key={p.month}
            x={xFor(i, points.length)}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-text-faint)"
          >
            {monthLabel(p.month)}
          </text>
        ))}

        <polyline
          points={linePath(points, (p) => p.attendanceRate)}
          fill="none"
          stroke="var(--color-accent-light)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <polyline
          points={linePath(points, (p) => p.lateRate)}
          fill="none"
          stroke="var(--color-warning)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <g key={p.month}>
            <circle
              cx={xFor(i, points.length)}
              cy={yFor(p.attendanceRate)}
              r={3}
              fill="var(--color-accent-light)"
            />
            <circle
              cx={xFor(i, points.length)}
              cy={yFor(p.lateRate)}
              r={3}
              fill="var(--color-warning)"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
