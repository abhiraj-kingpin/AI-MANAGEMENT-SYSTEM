import type { ReactNode } from 'react';
import { Reveal } from '@/shared/ui/Reveal';
import { AiInsightsIcon } from '@/shared/ui/icons';
import { AbsenteeismForecastChart } from '@/features/analytics/components/AbsenteeismForecastChart';
import { AnomaliesList } from '@/features/analytics/components/AnomaliesList';
import { LateRiskTable } from '@/features/analytics/components/LateRiskTable';
import { useAbsenteeismForecast } from '@/features/analytics/hooks/useAbsenteeismForecast';
import { useAnomalies } from '@/features/analytics/hooks/useAnomalies';
import { useLateRisk } from '@/features/analytics/hooks/useLateRisk';
import { useAuthStore } from '@/stores/authStore';

// A visual treatment specific to this page — see the shadcn "neutral" theme
// preset this was adapted from (generous radius, restrained neutral
// surfaces, a clear title/description/content rhythm per section) — rather
// than the plain shared <Card/> every other page uses. Deliberately scoped
// here via this local component instead of touching Card itself, so nothing
// outside AI Insights changes. All data/hooks/child components below are
// unchanged from before; only this wrapper markup is new.
function InsightSection({
  title,
  description,
  index,
  children,
}: {
  title: string;
  description: string;
  index: number;
  children: ReactNode;
}) {
  return (
    <Reveal index={index}>
      <section className="overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_2px_16px_rgba(20,48,79,0.06)]">
        <div className="border-b border-border/70 bg-card-subtle px-7 py-5">
          <h2 className="text-[15px] font-bold text-text">{title}</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-text-dim">{description}</p>
        </div>
        <div className="px-7 py-6">{children}</div>
      </section>
    </Reveal>
  );
}

function SectionLoading() {
  return <p className="py-10 text-center text-sm text-text-dim">Loading…</p>;
}

export function AiInsightsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canViewAnomalies = role === 'super_admin' || role === 'hr';

  const { data: lateRisk, isLoading: lateRiskLoading } = useLateRisk();
  const { data: forecast, isLoading: forecastLoading } = useAbsenteeismForecast();
  const { data: anomalies, isLoading: anomaliesLoading } = useAnomalies();

  return (
    <div className="flex flex-col gap-5">
      <Reveal className="flex items-center gap-3.5">
        <div className="bg-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white">
          <AiInsightsIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="mb-0.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Analytics
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">AI Insights</h1>
        </div>
      </Reveal>

      <InsightSection
        index={1}
        title="Late-Risk Employees"
        description="Ranked by a transparent rate-plus-trend score over the last 30 days — a rule-based signal for who to check in with, not a prediction from a trained model."
      >
        {lateRiskLoading && !lateRisk ? <SectionLoading /> : <LateRiskTable employees={lateRisk ?? []} />}
      </InsightSection>

      <InsightSection
        index={2}
        title="Absenteeism Forecast"
        description="Last 6 months, plus next month's forecast — a stated least-squares line, not a trained model (the method name is in the API response itself)."
      >
        {forecastLoading && !forecast ? (
          <SectionLoading />
        ) : forecast ? (
          <AbsenteeismForecastChart forecast={forecast} />
        ) : (
          <p className="py-10 text-center text-sm text-text-dim">Not enough data yet.</p>
        )}
      </InsightSection>

      {canViewAnomalies && (
        <InsightSection
          index={3}
          title="Anomalies"
          description="Last 30 days — three independent rule-based checks: implausible GPS travel speed, overtime outliers, and similar face embeddings across employees."
        >
          {anomaliesLoading && !anomalies ? <SectionLoading /> : <AnomaliesList anomalies={anomalies ?? []} />}
        </InsightSection>
      )}
    </div>
  );
}
