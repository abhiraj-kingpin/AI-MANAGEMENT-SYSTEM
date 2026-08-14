import { Card } from '@/shared/ui/Card';
import { Reveal } from '@/shared/ui/Reveal';
import { AbsenteeismForecastChart } from '@/features/analytics/components/AbsenteeismForecastChart';
import { AnomaliesList } from '@/features/analytics/components/AnomaliesList';
import { LateRiskTable } from '@/features/analytics/components/LateRiskTable';
import { useAbsenteeismForecast } from '@/features/analytics/hooks/useAbsenteeismForecast';
import { useAnomalies } from '@/features/analytics/hooks/useAnomalies';
import { useLateRisk } from '@/features/analytics/hooks/useLateRisk';
import { useAuthStore } from '@/stores/authStore';

/**
 * Phase 15's three AI-assisted analytics endpoints, previously backend-only
 * (see root README's Future Work). Same dual-gate shape `DashboardPage`
 * already uses: late-risk/absenteeism-trend are team-scoped (Super
 * Admin/HR/Manager — a Manager sees their own reports, the router doesn't
 * even reach this page for a plain `employee`), anomalies is a narrower
 * Super Admin/HR-only investigative sweep with no "my team" reading, same
 * as `department-comparison`.
 */
export function AiInsightsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canViewAnomalies = role === 'super_admin' || role === 'hr';

  const { data: lateRisk, isLoading: lateRiskLoading } = useLateRisk();
  const { data: forecast, isLoading: forecastLoading } = useAbsenteeismForecast();
  const { data: anomalies, isLoading: anomaliesLoading } = useAnomalies();

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex items-end justify-between">
        <div>
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Analytics
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">AI Insights</h1>
        </div>
      </Reveal>

      <Reveal index={1}>
        <Card className="px-6 py-5">
          <h2 className="mb-1 text-[15px] font-bold">Late-Risk Employees</h2>
          <p className="mb-4 text-[12.5px] text-text-dim">
            Ranked by a transparent rate-plus-trend score over the last 30 days — a rule-based
            signal for who to check in with, not a prediction from a trained model.
          </p>
          {lateRiskLoading && !lateRisk ? (
            <p className="py-10 text-center text-sm text-text-dim">Loading…</p>
          ) : (
            <LateRiskTable employees={lateRisk ?? []} />
          )}
        </Card>
      </Reveal>

      <Reveal index={2}>
        <Card className="px-6 py-5">
          <h2 className="mb-1 text-[15px] font-bold">Absenteeism Forecast</h2>
          <p className="mb-4 text-[12.5px] text-text-dim">
            Last 6 months, plus next month's forecast — a stated least-squares line, not a trained
            model (the method name is in the API response itself).
          </p>
          {forecastLoading && !forecast ? (
            <p className="py-10 text-center text-sm text-text-dim">Loading…</p>
          ) : forecast ? (
            <AbsenteeismForecastChart forecast={forecast} />
          ) : (
            <p className="py-10 text-center text-sm text-text-dim">Not enough data yet.</p>
          )}
        </Card>
      </Reveal>

      {canViewAnomalies && (
        <Reveal index={3}>
          <Card className="px-6 py-5">
            <h2 className="mb-1 text-[15px] font-bold">Anomalies</h2>
            <p className="mb-4 text-[12.5px] text-text-dim">
              Last 30 days — three independent rule-based checks: implausible GPS travel speed,
              overtime outliers, and similar face embeddings across employees.
            </p>
            {anomaliesLoading && !anomalies ? (
              <p className="py-10 text-center text-sm text-text-dim">Loading…</p>
            ) : (
              <AnomaliesList anomalies={anomalies ?? []} />
            )}
          </Card>
        </Reveal>
      )}
    </div>
  );
}
