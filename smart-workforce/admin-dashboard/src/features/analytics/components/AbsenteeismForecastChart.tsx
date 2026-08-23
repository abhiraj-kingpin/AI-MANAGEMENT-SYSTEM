import type { AbsenteeismForecast } from '@/types/api';

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = { top: 16, right: 12, bottom: 28, left: 34 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

function monthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString('en-US', { month: 'short' });
}

export function AbsenteeismForecastChart({ forecast }: { forecast: AbsenteeismForecast }) {
  const { history, forecastMonth, forecastRate } = forecast;

  if (history.length === 0) {
    return <p className="py-10 text-center text-sm text-text-dim">Not enough data yet.</p>;
  }

  const allValues = [...history.map((p) => p.absenteeismRate), forecastRate];
  const maxValue = Math.max(...allValues, 1);
  const yMax = Math.ceil((maxValue * 1.2) / 5) * 5 || 5;

  const points = [...history, { month: forecastMonth, absenteeismRate: forecastRate }];
  const forecastIndex = points.length - 1;

  const xFor = (index: number) =>
    points.length <= 1 ? PADDING.left : PADDING.left + (index / (points.length - 1)) * PLOT_WIDTH;
  const yFor = (value: number) =>
    PADDING.top + (1 - Math.min(yMax, Math.max(0, value)) / yMax) * PLOT_HEIGHT;

  const gridLines = [0, yMax / 2, yMax];
  const historyPath = history.map((p, i) => `${xFor(i)},${yFor(p.absenteeismRate)}`).join(' ');
  const forecastSegment = `${xFor(forecastIndex - 1)},${yFor(history[history.length - 1].absenteeismRate)} ${xFor(forecastIndex)},${yFor(forecastRate)}`;

  return (
    <div>
      <div className="mb-3 flex items-center gap-5 text-[12.5px] text-text-dim">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: 'var(--color-accent-light)' }}
            aria-hidden="true"
          />
          Absenteeism Rate
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: 'var(--color-warning)' }}
            aria-hidden="true"
          />
          Forecast ({forecast.method})
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Monthly absenteeism rate with next month's linear-regression forecast"
      >
        {gridLines.map((value) => (
          <g key={value}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={yFor(value)}
              y2={yFor(value)}
              stroke="rgba(20,20,40,0.07)"
              strokeWidth={1}
            />
            <text
              x={PADDING.left - 8}
              y={yFor(value) + 4}
              textAnchor="end"
              fontSize={10}
              fill="var(--color-text-faint)"
            >
              {value.toFixed(0)}%
            </text>
          </g>
        ))}

        {points.map((p, i) => (
          <text
            key={p.month}
            x={xFor(i)}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize={10}
            fill={i === forecastIndex ? 'var(--color-warning)' : 'var(--color-text-faint)'}
          >
            {monthLabel(p.month)}
          </text>
        ))}

        <polyline
          points={historyPath}
          fill="none"
          stroke="var(--color-accent-light)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <polyline
          points={forecastSegment}
          fill="none"
          stroke="var(--color-warning)"
          strokeWidth={2}
          strokeDasharray="5 4"
          strokeLinejoin="round"
        />

        {history.map((p, i) => (
          <circle
            key={p.month}
            cx={xFor(i)}
            cy={yFor(p.absenteeismRate)}
            r={3}
            fill="var(--color-accent-light)"
          />
        ))}
        <circle
          cx={xFor(forecastIndex)}
          cy={yFor(forecastRate)}
          r={4}
          fill="var(--color-warning)"
        />
      </svg>
    </div>
  );
}
