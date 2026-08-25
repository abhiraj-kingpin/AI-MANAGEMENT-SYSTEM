import type { AbsenteeismForecast } from '@/types/api';

const WIDTH = 700;
const HEIGHT = 260;
const PADDING = { top: 28, right: 16, bottom: 28, left: 38 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

function monthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString('en-US', { month: 'short' });
}

export function AbsenteeismForecastChart({ forecast }: { forecast: AbsenteeismForecast }) {
  const { history, forecastMonth, forecastRate, confidenceIntervalPp } = forecast;

  if (history.length === 0) {
    return <p className="py-10 text-center text-sm text-text-dim">Not enough data yet.</p>;
  }

  // Y-axis follows the data — never a fixed 0–100%, which would flatten a
  // single-digit absenteeism rate into an unreadable sliver near the axis.
  const allValues = [...history.map((p) => p.absenteeismRate), forecastRate + confidenceIntervalPp];
  const maxValue = Math.max(...allValues, 1);
  const yMax = Math.ceil((maxValue * 1.15) / 2) * 2 || 2;

  const points = [...history, { month: forecastMonth, absenteeismRate: forecastRate }];
  const forecastIndex = points.length - 1;
  const lastObservedIndex = forecastIndex - 1;

  const xFor = (index: number) =>
    points.length <= 1 ? PADDING.left : PADDING.left + (index / (points.length - 1)) * PLOT_WIDTH;
  const yFor = (value: number) =>
    PADDING.top + (1 - Math.min(yMax, Math.max(0, value)) / yMax) * PLOT_HEIGHT;

  const gridLines = [0, yMax / 2, yMax];
  const historyPath = history.map((p, i) => `${xFor(i)},${yFor(p.absenteeismRate)}`).join(' ');
  const lastObservedRate = history[history.length - 1].absenteeismRate;
  const forecastSegment = `${xFor(lastObservedIndex)},${yFor(lastObservedRate)} ${xFor(forecastIndex)},${yFor(forecastRate)}`;

  // The 95% interval — zero-width at the last observed point (nothing to
  // be uncertain about yet), widening to ±confidenceIntervalPp by the
  // forecast month. A wedge, not a band, since there's exactly one
  // projected month.
  const ciTop = `${xFor(lastObservedIndex)},${yFor(lastObservedRate)} ${xFor(forecastIndex)},${yFor(forecastRate + confidenceIntervalPp)}`;
  const ciBottom = `${xFor(forecastIndex)},${yFor(Math.max(0, forecastRate - confidenceIntervalPp))} ${xFor(lastObservedIndex)},${yFor(lastObservedRate)}`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] text-text-dim">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: 'var(--color-accent-light)' }} aria-hidden="true" />
          Observed rate
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-4 rounded"
            style={{ background: 'repeating-linear-gradient(90deg, var(--color-warning) 0 5px, transparent 5px 9px)' }}
            aria-hidden="true"
          />
          Projection
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: 'rgba(222,142,27,.18)' }} aria-hidden="true" />
          95% interval
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Monthly absenteeism rate with next month's forecast and 95% interval"
      >
        {gridLines.map((value) => (
          <g key={value}>
            <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={yFor(value)} y2={yFor(value)} stroke="rgba(20,20,40,0.07)" strokeWidth={1} />
            <text x={PADDING.left - 8} y={yFor(value) + 4} textAnchor="end" fontSize={10} fill="var(--color-text-faint)">
              {value.toFixed(0)}%
            </text>
          </g>
        ))}

        <line
          x1={xFor(lastObservedIndex)}
          x2={xFor(lastObservedIndex)}
          y1={PADDING.top}
          y2={HEIGHT - PADDING.bottom}
          stroke="rgba(20,20,40,0.14)"
          strokeWidth={1}
          strokeDasharray="4 5"
        />
        <text x={xFor(lastObservedIndex) + 6} y={PADDING.top + 4} fontSize={10} fontWeight={700} fill="var(--color-warning)">
          PROJECTED →
        </text>

        <polygon points={`${ciTop} ${ciBottom}`} fill="rgba(222,142,27,.16)" />

        {points.map((p, i) => (
          <text
            key={p.month}
            x={xFor(i)}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize={10}
            fontWeight={i === forecastIndex ? 700 : 500}
            fill={i === forecastIndex ? 'var(--color-warning)' : 'var(--color-text-faint)'}
          >
            {monthLabel(p.month)}
          </text>
        ))}

        <polyline points={historyPath} fill="none" stroke="var(--color-accent-light)" strokeWidth={2.5} strokeLinejoin="round" />
        <polyline
          points={forecastSegment}
          fill="none"
          stroke="var(--color-warning)"
          strokeWidth={2.5}
          strokeDasharray="7 6"
          strokeLinejoin="round"
        />

        {history.map((p, i) => (
          <g key={p.month}>
            <circle cx={xFor(i)} cy={yFor(p.absenteeismRate)} r={3} fill="var(--color-accent-light)" />
            <text x={xFor(i)} y={yFor(p.absenteeismRate) - 9} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="var(--color-text-dim)">
              {p.absenteeismRate.toFixed(1)}
            </text>
          </g>
        ))}
        <circle cx={xFor(forecastIndex)} cy={yFor(forecastRate)} r={4.5} fill="var(--color-warning)" stroke="#fff" strokeWidth={2} />
        <text x={xFor(forecastIndex)} y={yFor(forecastRate) - 12} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="var(--color-warning)">
          {forecastRate.toFixed(1)}% ±{confidenceIntervalPp.toFixed(1)}
        </text>
      </svg>
    </div>
  );
}
