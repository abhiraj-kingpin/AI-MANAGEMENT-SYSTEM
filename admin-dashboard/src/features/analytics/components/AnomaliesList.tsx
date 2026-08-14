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
};

/**
 * A flat list, not a table — each row's `detail` is a full sentence
 * (the backend already renders the real numbers behind the flag into
 * human-readable text), which doesn't fit fixed table columns well.
 * `duplicate_face` rows carry the same caveat the backend's own docs
 * already state for it — see the note under the list.
 */
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
          // No stable id from the backend for a rule-based, recomputed-per-request
          // sweep result — type + employee + detectedAt is unique enough for a
          // list key here (two distinct real flags for the same employee at the
          // exact same millisecond would be a coincidence, not a collision risk
          // worth over-engineering a synthetic id for).
          key={`${anomaly.type}-${anomaly.employeeId}-${anomaly.detectedAt}`}
          className="rounded-xl border border-border/60 bg-white/[0.015] px-4 py-3.5"
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
          Duplicate Face flags compare placeholder embeddings (hashed image bytes, not real facial
          features — see backend/README.md#known-simplifications--future-work). A flagged pair means
          similar-looking source photos, not confirmed shared identity.
        </p>
      )}
    </div>
  );
}
