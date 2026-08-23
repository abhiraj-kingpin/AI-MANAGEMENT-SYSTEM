import { Chip } from '@/shared/ui/Chip';
import type { LateRiskEmployee, RiskTrend } from '@/types/api';

const TREND_LABEL: Record<RiskTrend, string> = {
  increasing: '↑ Rising',
  decreasing: '↓ Falling',
  stable: '→ Stable',
};

const TREND_TONE: Record<RiskTrend, 'danger' | 'success' | 'neutral'> = {
  increasing: 'danger',
  decreasing: 'success',
  stable: 'neutral',
};

const RISK_BAR_CLASS: Record<'danger' | 'warning' | 'success', string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  success: 'bg-success',
};

function riskTone(score: number): 'danger' | 'warning' | 'success' {
  if (score >= 60) return 'danger';
  if (score >= 30) return 'warning';
  return 'success';
}

export function LateRiskTable({ employees }: { employees: LateRiskEmployee[] }) {
  if (employees.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-text-dim">
        No one shows a meaningful lateness pattern over this window.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
            <th className="px-5 py-3.5 font-bold">Employee</th>
            <th className="px-5 py-3.5 font-bold">Risk</th>
            <th className="px-5 py-3.5 font-bold">Late Rate</th>
            <th className="px-5 py-3.5 font-bold">Trend</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((row) => (
            <tr
              key={row.employeeId}
              className="border-b border-border/60 transition-colors last:border-0 hover:bg-ink/[0.025]"
            >
              <td className="px-5 py-3.5">
                <div className="font-semibold text-text">{row.employeeName}</div>
                <div className="font-mono text-[12px] text-text-dim">{row.employeeCode}</div>
              </td>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="relative h-1.5 w-20 overflow-hidden rounded-pill bg-ink/[0.06]">
                    <div
                      className={`h-full rounded-pill ${RISK_BAR_CLASS[riskTone(row.riskScore)]}`}
                      style={{ width: `${Math.min(100, Math.max(0, row.riskScore))}%` }}
                    />
                  </div>
                  <span className="font-mono text-[12.5px] text-text-dim">{row.riskScore}</span>
                </div>
              </td>
              <td className="px-5 py-3.5 text-text-dim">
                {row.lateRate.toFixed(1)}%{' '}
                <span className="text-[11.5px] text-text-faint">
                  ({row.lateDays}/{row.workingDays} days)
                </span>
              </td>
              <td className="px-5 py-3.5">
                <Chip tone={TREND_TONE[row.trend]}>{TREND_LABEL[row.trend]}</Chip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
