import { type CSSProperties, useEffect, useRef } from 'react';
import { Card } from './Card';
import { useCountUp } from '@/shared/hooks/useCountUp';
import { useReveal } from '@/shared/hooks/useReveal';
import { drawSparkline } from '@/shared/lib/sparkline';

type SparkColor = 'accent' | 'success' | 'warning' | 'dim';

const SPARK_HEX: Record<SparkColor, string> = {
  accent: '#6f8fff',
  success: '#35d4a4',
  warning: '#f2b155',
  dim: '#8d8f98',
};

interface StatCardData {
  value: number;
  decimals?: number;
  unit?: string;
  trend: { direction: 'up' | 'down'; label: string };
  spark: number[];
  sparkColor?: SparkColor;
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

  useEffect(() => {
    if (!inView || !data || !canvasRef.current) return;
    drawSparkline(canvasRef.current, data.spark, SPARK_HEX[data.sparkColor ?? 'accent']);
  }, [inView, data]);

  return (
    <div
      ref={ref}
      className={`reveal ${inView ? 'in-view' : ''}`}
      style={{ '--reveal-i': index } as CSSProperties}
    >
      <Card className="flex flex-col gap-2.5 px-5 py-5">
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
