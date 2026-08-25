import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Reveal } from '@/shared/ui/Reveal';
import { AiInsightsIcon } from '@/shared/ui/icons';
import { useDismissed } from '@/shared/hooks/useDismissed';
import { pushToast } from '@/stores/toastStore';
import { AbsenteeismForecastChart } from '@/features/analytics/components/AbsenteeismForecastChart';
import { AnomaliesList } from '@/features/analytics/components/AnomaliesList';
import { LateRiskTable } from '@/features/analytics/components/LateRiskTable';
import { useAbsenteeismForecast } from '@/features/analytics/hooks/useAbsenteeismForecast';
import { useAnomalies } from '@/features/analytics/hooks/useAnomalies';
import { useLateRisk } from '@/features/analytics/hooks/useLateRisk';
import { useAuthStore } from '@/stores/authStore';
import type { Anomaly, AnomalySeverity, LateRiskEmployee } from '@/types/api';

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

function MetricTile({ label, value, unit, note }: { label: string; value: string; unit?: string; note: string }) {
  return (
    <div className="rounded-[15px] border border-border bg-card-subtle p-3.5">
      <div className="text-[10px] font-bold tracking-[0.03em] text-text-dim uppercase">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-mono text-[22px] font-extrabold tabular-nums">{value}</span>
        {unit && <span className="font-mono text-[11px] tabular-nums text-text-dim">{unit}</span>}
      </div>
      <div className="mt-1 text-[10.5px] font-medium text-text-dim">{note}</div>
    </div>
  );
}

// Severity is a real classification each detector already assigns — this
// derives a display-only confidence band from it (not a computed
// probability) so every card follows the same "always show the numbers"
// rule without pretending anomalies carry a calibrated confidence score.
const SEVERITY_CONFIDENCE: Record<AnomalySeverity, number> = { high: 90, medium: 72, low: 55 };

const ANOMALY_TAG: Record<Anomaly['type'], string> = {
  location_anomaly: 'Location',
  duplicate_face: 'Face',
  overtime_outlier: 'Overtime',
  attendance_pattern_anomaly: 'Pattern',
};

interface InsightCard {
  id: string;
  tag: string;
  confidence: number;
  title: string;
  body: string;
  evidence: Array<{ k: string; v: string }>;
  action: string;
  onAct: () => void;
}

export function AiInsightsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canViewAnomalies = role === 'super_admin' || role === 'hr';
  const navigate = useNavigate();

  const { data: lateRisk, isLoading: lateRiskLoading } = useLateRisk();
  const { data: forecast, isLoading: forecastLoading } = useAbsenteeismForecast();
  const { data: anomalies, isLoading: anomaliesLoading } = useAnomalies();
  const { isDismissed, dismiss } = useDismissed('ai-insights');

  const insights: InsightCard[] = useMemo(() => {
    const cards: InsightCard[] = [];

    for (const a of (anomalies ?? []).slice(0, 6)) {
      cards.push({
        id: `anomaly-${a.type}-${a.employeeId}-${a.detectedAt}`,
        tag: ANOMALY_TAG[a.type],
        confidence: SEVERITY_CONFIDENCE[a.severity],
        title: `${a.employeeName} — ${ANOMALY_TAG[a.type].toLowerCase()} anomaly`,
        body: a.detail,
        evidence: [
          { k: 'Severity', v: a.severity },
          { k: 'Detected', v: new Date(a.detectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
          ...(a.relatedEmployeeName ? [{ k: 'Related to', v: a.relatedEmployeeName }] : []),
        ],
        action: 'Review employee',
        onAct: () => navigate('/employees'),
      });
    }

    for (const r of (lateRisk ?? []).filter((e: LateRiskEmployee) => e.riskScore >= 45).slice(0, 4)) {
      cards.push({
        id: `risk-${r.employeeId}`,
        tag: 'Attendance',
        confidence: Math.min(95, Math.round(r.riskScore)),
        title: `${r.employeeName} trending ${r.trend === 'increasing' ? 'later' : r.trend === 'decreasing' ? 'better' : 'steady'}`,
        body: `Rule-based risk score of ${r.riskScore} over the observed window — rate plus trend, not a prediction from a trained model.`,
        evidence: [
          { k: 'Late rate', v: `${r.lateRate.toFixed(1)}%` },
          { k: 'Late days', v: `${r.lateDays}/${r.workingDays}` },
          { k: 'Trend', v: r.trend },
        ],
        action: 'View attendance',
        onAct: () => navigate('/attendance'),
      });
    }

    if (forecast && forecast.trendPpPerMonth > 0.15) {
      cards.push({
        id: 'forecast-trend',
        tag: 'Forecast',
        confidence: Math.round(forecast.rSquared * 100),
        title: `Absenteeism trending up ${forecast.trendPpPerMonth.toFixed(2)} pp/month`,
        body: `Projected ${forecast.forecastRate.toFixed(1)}% for ${forecast.forecastMonth}, up from ${forecast.history[forecast.history.length - 1]?.absenteeismRate.toFixed(1)}% last observed month.`,
        evidence: [
          { k: 'R²', v: forecast.rSquared.toFixed(2) },
          { k: '95% interval', v: `±${forecast.confidenceIntervalPp.toFixed(1)} pp` },
          { k: 'Backtest MAE', v: forecast.backtestMaePp != null ? `${forecast.backtestMaePp.toFixed(1)} pp` : 'n/a' },
        ],
        action: 'See department breakdown',
        onAct: () => document.getElementById('forecast-departments')?.scrollIntoView({ behavior: 'smooth' }),
      });
    }

    return cards.filter((c) => !isDismissed(c.id));
  }, [anomalies, lateRisk, forecast, isDismissed, navigate]);

  return (
    <div className="flex flex-col gap-5">
      <Reveal className="flex items-center gap-3.5">
        <div className="bg-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white">
          <AiInsightsIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="mb-0.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Intelligence
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">AI Insights</h1>
        </div>
      </Reveal>

      <InsightSection
        index={1}
        title="Absenteeism Forecast"
        description="Last months observed, next month projected — a stated least-squares line, not a trained model."
      >
        {forecastLoading && !forecast ? (
          <SectionLoading />
        ) : !forecast ? (
          <p className="py-10 text-center text-sm text-text-dim">Not enough data yet.</p>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricTile
                label={`${forecast.forecastMonth} forecast`}
                value={`${forecast.forecastRate.toFixed(1)}%`}
                unit={`±${forecast.confidenceIntervalPp.toFixed(1)}`}
                note="95% prediction interval"
              />
              <MetricTile
                label="Trend"
                value={`${forecast.trendPpPerMonth >= 0 ? '+' : ''}${forecast.trendPpPerMonth.toFixed(2)}`}
                unit="pp/mo"
                note={forecast.trendPpPerMonth > 0 ? 'Rising' : forecast.trendPpPerMonth < 0 ? 'Falling' : 'Flat'}
              />
              <MetricTile label="Fit" value={forecast.rSquared.toFixed(2)} unit="R²" note={`n = ${forecast.history.length} monthly points`} />
              <MetricTile
                label="Backtest error"
                value={forecast.backtestMaePp != null ? forecast.backtestMaePp.toFixed(1) : '—'}
                unit={forecast.backtestMaePp != null ? 'pp MAE' : undefined}
                note={forecast.backtestMaePp != null ? 'Last 3 held-out months' : 'Not enough history yet'}
              />
            </div>

            <AbsenteeismForecastChart forecast={forecast} />

            {forecast.drivers.length > 0 && (
              <div className="rounded-2xl border border-border p-4">
                <h3 className="text-[12.5px] font-extrabold">Contribution to the latest step</h3>
                <p className="mt-0.5 mb-3 text-[11px] text-text-dim">
                  Decomposition of the month-over-month change, in percentage points — headcount-weighted per department
                </p>
                <div className="flex flex-col gap-2.5">
                  {forecast.drivers.map((d) => (
                    <div key={d.label}>
                      <div className="mb-1 flex items-baseline gap-2 text-[11.5px]">
                        <span className="flex-1 font-bold">{d.label}</span>
                        <span className={`font-mono font-bold tabular-nums ${d.valuePp >= 0 ? 'text-danger' : 'text-success'}`}>
                          {d.valuePp >= 0 ? '+' : ''}
                          {d.valuePp.toFixed(2)} pp
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-pill bg-ink/[0.06]">
                        <div
                          className={`h-full rounded-pill ${d.valuePp >= 0 ? 'bg-danger' : 'bg-success'}`}
                          style={{ width: `${Math.min(100, Math.abs(d.valuePp) * 20)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {forecast.departmentBreakdown.length > 0 && (
              <div id="forecast-departments" className="overflow-hidden rounded-2xl border border-border">
                <div className="border-b border-border bg-card-subtle px-4 py-3">
                  <h3 className="text-[12.5px] font-extrabold">Department comparison</h3>
                  <p className="mt-0.5 text-[11px] text-text-dim">Last observed month against next month's projection</p>
                </div>
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-bold tracking-wide text-text-dim uppercase">
                      <th className="px-4 py-2.5">Department</th>
                      <th className="px-4 py-2.5">Last</th>
                      <th className="px-4 py-2.5">Projected</th>
                      <th className="px-4 py-2.5">Δ</th>
                      <th className="px-4 py-2.5 text-right">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.departmentBreakdown.map((row) => (
                      <tr key={row.departmentId} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2.5 font-bold text-text">{row.departmentName}</td>
                        <td className="px-4 py-2.5 font-mono tabular-nums text-text-dim">{row.lastObservedRate.toFixed(1)}%</td>
                        <td className="px-4 py-2.5 font-mono font-bold tabular-nums">{row.projectedRate.toFixed(1)}%</td>
                        <td className={`px-4 py-2.5 font-mono tabular-nums ${row.deltaPp >= 0 ? 'text-danger' : 'text-success'}`}>
                          {row.deltaPp >= 0 ? '+' : ''}
                          {row.deltaPp.toFixed(1)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span
                            className={`rounded-pill px-2 py-0.5 text-[10.5px] font-bold ${
                              row.risk === 'high' ? 'bg-danger/10 text-danger' : row.risk === 'medium' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                            }`}
                          >
                            {row.risk}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="flex items-start gap-2 rounded-2xl border border-border bg-card-subtle p-3.5 text-[11.5px] leading-relaxed text-text-dim">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" className="mt-0.5 shrink-0">
                <path d="M12 8.5v5M12 16.5h.01" />
                <circle cx="12" cy="12" r="8.5" />
              </svg>
              Ordinary least squares over {forecast.history.length} monthly observations, one month projected — an approximate 95%
              interval from the fit's own residuals, not a seasonal model. Method: {forecast.method}. No adjustment for
              seasonality or holidays beyond what already shows up in the observed history.
            </p>
          </div>
        )}
      </InsightSection>

      <InsightSection
        index={2}
        title="Late-Risk Employees"
        description="Ranked by a transparent rate-plus-trend score over the last 30 days — a rule-based signal for who to check in with, not a prediction from a trained model."
      >
        {lateRiskLoading && !lateRisk ? <SectionLoading /> : <LateRiskTable employees={lateRisk ?? []} />}
      </InsightSection>

      {insights.length > 0 && (
        <Reveal index={3}>
          <div>
            <h2 className="mb-3 text-[15px] font-bold">Insights</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {insights.map((card) => (
                <div key={card.id} className="rounded-[20px] border border-border bg-surface p-4.5">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-pill bg-accent/10 px-2.5 py-1 text-[10.5px] font-bold text-accent-light">{card.tag}</span>
                    <span className="flex-1" />
                    <span className="font-mono text-[11px] tabular-nums text-text-faint">confidence {card.confidence}%</span>
                  </div>
                  <h3 className="mt-3 text-[14.5px] font-extrabold text-balance">{card.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-text-dim">{card.body}</p>
                  <div className="mt-3.5 rounded-2xl border border-border bg-card-subtle p-3">
                    <div className="mb-2 text-[9.5px] font-bold tracking-[0.03em] text-text-dim uppercase">Evidence</div>
                    {card.evidence.map((e) => (
                      <div key={e.k} className="flex justify-between py-1 text-[11.5px]">
                        <span className="font-semibold text-text-dim">{e.k}</span>
                        <span className="font-mono tabular-nums font-semibold">{e.v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3.5 flex gap-2">
                    <button
                      type="button"
                      onClick={card.onAct}
                      className="flex-1 rounded-xl bg-accent px-3 py-2.5 text-center text-[12px] font-bold text-white"
                    >
                      {card.action}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        dismiss(card.id);
                        pushToast('Insight dismissed');
                      }}
                      className="rounded-xl bg-card-subtle px-3.5 py-2.5 text-center text-[12px] font-bold text-text-dim"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {canViewAnomalies && (
        <InsightSection
          index={4}
          title="Anomalies"
          description="Last 30 days — three independent rule-based checks: implausible GPS travel speed, overtime outliers, and similar face embeddings across employees."
        >
          {anomaliesLoading && !anomalies ? <SectionLoading /> : <AnomaliesList anomalies={anomalies ?? []} />}
        </InsightSection>
      )}
    </div>
  );
}
