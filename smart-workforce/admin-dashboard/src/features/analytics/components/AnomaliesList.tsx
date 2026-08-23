import { Chip } from '@/shared/ui/Chip';
import type { Anomaly, AnomalySeverity, AnomalyType } from '@/types/api';

const SEVERITY_TONE: Record<AnomalySeverity, 'danger' | 'warning' | 'neutral'> = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
};

const TYPE_LABEL: Record<AnomalyType, string> = {
  location_anomaly: 'Location Anomaly',
  duplicate_face: 'Duplicate Face',
  overtime_outlier: 'Overtime Outlier',
  attendance_pattern_anomaly: 'Attendance Pattern (ML)',
};

export function AnomaliesList({ anomalies }: { anomalies: Anomaly[] }) {
  if (anomalies.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-text-dim">
        No anomalies flagged over this window.
      </p>
    );
  }

  const hasDuplicateFace = anomalies.some((a) => a.type === 'duplicate_face');

  return (
    <div className="flex flex-col gap-3">
      {anomalies.map((anomaly) => (
        <div
          key={`${anomaly.type}-${anomaly.employeeId}-${anomaly.detectedAt}`}
          className="rounded-xl border border-border/60 bg-ink/[0.02] px-4 py-3.5"
        >
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Chip tone={SEVERITY_TONE[anomaly.severity]}>{anomaly.severity.toUpperCase()}</Chip>
            <span className="text-[12.5px] font-bold text-text">{TYPE_LABEL[anomaly.type]}</span>
            <span className="text-[12px] text-text-faint">
              {new Date(anomaly.detectedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <p className="text-[13.5px] text-text-dim">{anomaly.detail}</p>
        </div>
      ))}
      {hasDuplicateFace && (
        <p className="mt-1 text-[12px] text-text-faint">
          Duplicate Face flags: a high score is a genuine facial-similarity signal only when both
          sides are real MobileFaceNet embeddings — read each flag's own detail text above, which
          says which embedding type that specific pair actually compared (see
          backend/README.md#known-simplifications--future-work for the full picture).
        </p>
      )}
    </div>
  );
}
