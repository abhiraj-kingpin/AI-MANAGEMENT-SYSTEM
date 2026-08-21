import { type CSSProperties, useEffect, useRef } from 'react';
import { Card } from './Card';
import { useCountUp } from '@/shared/hooks/useCountUp';
import { useReveal } from '@/shared/hooks/useReveal';
import { drawSparkline } from '@/shared/lib/sparkline';

// Which of the four KPI tiles this is, driving both its sparkline color and
// its hover glow — orange for Headcount, blue for Attendance, amber for
// Late Arrivals, slate for On Leave, matching the design handoff's per-card
// mapping rather than every tile sharing one accent.
type StatAccent = 'orange' | 'blue' | 'amber' | 'slate';

const STAT_ACCENTS: Record<StatAccent, { spark: string; border: string; shadow: string }> = {
  orange: {
    spark: '#ff8a3d',
    border: 'rgba(255,138,61,.4)',
    shadow: '0 14px 34px -12px rgba(255,138,61,.45)',
  },
  blue: {
    spark: '#3d8bff',
    border: 'rgba(61,139,255,.4)',
    shadow: '0 14px 34px -12px rgba(61,139,255,.45)',
  },
  amber: {
    spark: '#f5a623',
    border: 'rgba(245,166,35,.4)',
    shadow: '0 14px 34px -12px rgba(245,166,35,.5)',
  },
  slate: {
    spark: '#94a3b8',
    border: 'rgba(148,163,184,.4)',
    shadow: '0 14px 34px -12px rgba(148,163,184,.4)',
  },
};

interface StatCardData {
  value: number;
  decimals?: number;
  unit?: string;
  trend: { direction: 'up' | 'down'; label: string };
  spark: number[];
  accent?: StatAccent;
}

interface StatCardProps {
  label: string;
  /** Position in the KPI row — staggers the reveal (see Reveal.tsx). */
  index?: number;
  /** Omit while the metric has no real backing endpoint yet — renders an honest "not built yet" state instead of a fabricated number. */
  data?: StatCardData;
  pendingNote?: string;
}

export function StatCard({ label, index = 0, data, pendingNote }: StatCardProps) {
  const { ref, inView } = useReveal<HTMLDivElement>();
  const display = useCountUp(data?.value ?? 0, inView && !!data, data?.decimals);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accent = STAT_ACCENTS[data?.accent ?? 'orange'];

  useEffect(() => {
    if (!inView || !data || !canvasRef.current) return;
    drawSparkline(canvasRef.current, data.spark, accent.spark);
  }, [inView, data, accent.spark]);

  return (
    <div
      ref={ref}
      className={`reveal ${inView ? 'in-view' : ''}`}
      style={{ '--reveal-i': index } as CSSProperties}
    >
      <Card
        className="stat-glow flex flex-col gap-2.5 px-5 py-5"
        style={
          {
            '--stat-border': accent.border,
            '--stat-shadow': accent.shadow,
          } as CSSProperties
        }
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-text-dim">{label}</span>
          {data ? (
            <span
              className={`rounded-pill px-2 py-0.5 font-mono text-[11px] font-medium ${
                data.trend.direction === 'up'
                  ? 'text-success bg-success/10'
                  : 'text-danger bg-danger/10'
              }`}
            >
              {data.trend.direction === 'up' ? '▲' : '▼'} {data.trend.label}
            </span>
          ) : (
            <span className="rounded-pill bg-text-dim/10 px-2 py-0.5 font-mono text-[11px] font-medium text-text-dim">
              {pendingNote ?? 'Not yet available'}
            </span>
          )}
        </div>

        {data ? (
          <>
            <div className="font-mono text-[34px] font-medium tracking-tight tabular-nums">
              {display}
              {data.unit && <span className="ml-0.5 text-base text-text-dim">{data.unit}</span>}
            </div>
            <canvas ref={canvasRef} className="block h-8 w-full" />
          </>
        ) : (
          <div className="font-mono text-[34px] font-medium tracking-tight text-text-dim">—</div>
        )}
      </Card>
    </div>
  );
}
