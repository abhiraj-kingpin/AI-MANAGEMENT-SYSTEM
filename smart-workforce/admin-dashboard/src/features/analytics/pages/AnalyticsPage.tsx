import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Reveal } from '@/shared/ui/Reveal';
import { Select } from '@/shared/ui/Field';
import { AnalyticsIcon } from '@/shared/ui/icons';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { AttendanceTrendChart } from '@/features/analytics/components/AttendanceTrendChart';
import {
  exportAttendanceCsv,
  exportAttendanceExcel,
  exportAttendancePdf,
} from '@/features/analytics/api/analyticsApi';
import { useAnomalies } from '@/features/analytics/hooks/useAnomalies';
import { useAttendanceTrend } from '@/features/analytics/hooks/useAttendanceTrend';
import { useDashboardKpis } from '@/features/analytics/hooks/useDashboardKpis';
import { useDepartmentComparison } from '@/features/analytics/hooks/useDepartmentComparison';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useAuthStore } from '@/stores/authStore';
import { pushToast } from '@/stores/toastStore';

const RANGE_OPTIONS = [
  { label: '3 months', months: 3 },
  { label: '6 months', months: 6 },
  { label: '12 months', months: 12 },
];

function monthsAgoIso(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AnalyticsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === 'super_admin' || role === 'hr' || role === 'manager';

  const [months, setMonths] = useState(6);
  const [departmentId, setDepartmentId] = useState('');
  const [exporting, setExporting] = useState<'csv' | 'pdf' | 'excel' | null>(null);

  const { data: departments } = useDepartments();
  const { data: kpis } = useDashboardKpis();
  const { data: trend, isLoading: trendLoading } = useAttendanceTrend(months);
  const { data: comparison } = useDepartmentComparison();
  const { data: anomalies } = useAnomalies();

  const overtimeOutliers = (anomalies ?? []).filter((a) => a.type === 'overtime_outlier');

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    setExporting(format);
    const range = { from: monthsAgoIso(months), to: todayIso(), departmentId: departmentId || undefined };
    try {
      if (format === 'csv') await exportAttendanceCsv(range);
      else if (format === 'pdf') await exportAttendancePdf(range);
      else await exportAttendanceExcel(range);
      pushToast(`${format.toUpperCase()} export started`);
    } catch (err) {
      window.alert(apiErrorMessage(err, 'Export failed.'));
    } finally {
      setExporting(null);
    }
  };

  if (!canView) {
    return (
      <div className="flex flex-col gap-6">
        <Reveal>
          <h1 className="text-[26px] font-extrabold text-balance">Analytics</h1>
        </Reveal>
        <Reveal index={1}>
          <Card className="p-14 text-center text-sm text-text-dim">
            Analytics is visible to HR/Admin/Manager roles.
          </Card>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex items-center gap-3.5">
        <div className="bg-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white">
          <AnalyticsIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="mb-0.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Intelligence
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Analytics</h1>
        </div>
      </Reveal>

      <Reveal index={1}>
        <Card className="flex flex-wrap items-center gap-3 px-5 py-4">
          <span className="text-[11px] font-bold tracking-[0.03em] text-text-dim uppercase">Report</span>
          <Select value={String(months)} onChange={(e) => setMonths(Number(e.target.value))} className="w-auto min-w-[140px]">
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.months} value={opt.months}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-auto min-w-[170px]">
            <option value="">All departments</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <span className="flex-1" />
          <div className="flex gap-2">
            {(['csv', 'pdf', 'excel'] as const).map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => void handleExport(format)}
                disabled={exporting !== null}
                className="rounded-xl bg-ink px-3.5 py-2 text-[11.5px] font-bold text-white hover:bg-ink/90 disabled:opacity-50"
              >
                {exporting === format ? '…' : format.toUpperCase()}
              </button>
            ))}
          </div>
        </Card>
      </Reveal>

      <Reveal index={2}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="px-5 py-4">
            <p className="text-[11px] font-bold tracking-[0.03em] text-text-dim uppercase">Attendance rate</p>
            <p className="mt-2.5 font-mono text-[27px] font-extrabold tabular-nums">
              {kpis ? `${kpis.attendanceRate.toFixed(1)}%` : '—'}
            </p>
          </Card>
          <Card className="px-5 py-4">
            <p className="text-[11px] font-bold tracking-[0.03em] text-text-dim uppercase">Late rate</p>
            <p className="mt-2.5 font-mono text-[27px] font-extrabold tabular-nums text-warning">
              {kpis ? `${kpis.lateRate.toFixed(1)}%` : '—'}
            </p>
          </Card>
          <Card className="px-5 py-4">
            <p className="text-[11px] font-bold tracking-[0.03em] text-text-dim uppercase">Leave rate</p>
            <p className="mt-2.5 font-mono text-[27px] font-extrabold tabular-nums text-accent-2">
              {kpis ? `${kpis.leaveRate.toFixed(1)}%` : '—'}
            </p>
          </Card>
          <Card className="px-5 py-4">
            <p className="text-[11px] font-bold tracking-[0.03em] text-text-dim uppercase">Headcount</p>
            <p className="mt-2.5 font-mono text-[27px] font-extrabold tabular-nums">{kpis?.headcount ?? '—'}</p>
          </Card>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <Reveal index={3}>
          <Card className="px-6 py-5">
            <h2 className="mb-1 text-[15px] font-bold">Attendance Rate</h2>
            <p className="mb-4 text-[12.5px] text-text-dim">Last {months} months, monthly rates</p>
            {trendLoading && !trend ? (
              <p className="py-10 text-center text-sm text-text-dim">Loading…</p>
            ) : (
              <AttendanceTrendChart points={trend ?? []} />
            )}
          </Card>
        </Reveal>

        <div className="flex flex-col gap-4">
          <Reveal index={4}>
            <Card className="p-5">
              <h2 className="text-[15px] font-bold">Punctuality by department</h2>
              <p className="mt-0.5 mb-4 text-[11.5px] text-text-dim">On-time share, today</p>
              <div className="flex flex-col gap-3">
                {(comparison ?? []).length === 0 ? (
                  <p className="py-4 text-center text-[12.5px] text-text-dim">No departments yet.</p>
                ) : (
                  [...(comparison ?? [])]
                    .sort((a, b) => a.lateRate - b.lateRate)
                    .map((row) => {
                      const punctuality = 100 - row.lateRate;
                      return (
                        <div key={row.departmentId}>
                          <div className="mb-1 flex items-baseline gap-2 text-[12px]">
                            <span className="flex-1 truncate font-bold text-text">{row.departmentName}</span>
                            <span className="font-mono tabular-nums text-text-dim">{punctuality.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-pill bg-ink/[0.06]">
                            <div
                              className="h-full rounded-pill bg-gradient-to-r from-accent to-accent-light"
                              style={{ width: `${Math.min(100, Math.max(0, punctuality))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </Card>
          </Reveal>

          <Reveal index={5}>
            <Card className="p-5">
              <h2 className="text-[15px] font-bold">Overtime concentration</h2>
              <p className="mt-0.5 mb-4 text-[11.5px] text-text-dim">Statistical outliers, last 30 days</p>
              {overtimeOutliers.length === 0 ? (
                <p className="py-4 text-center text-[12.5px] text-text-dim">No overtime outliers flagged.</p>
              ) : (
                <div className="flex flex-col divide-y divide-border/60">
                  {overtimeOutliers.slice(0, 6).map((a) => (
                    <div key={`${a.employeeId}-${a.detectedAt}`} className="flex items-center gap-2.5 py-2.5">
                      <span className="flex-1 truncate text-[12.5px] font-bold text-text">{a.employeeName}</span>
                      <span
                        className={`rounded-pill px-2 py-0.5 text-[10px] font-bold ${
                          a.severity === 'high' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {a.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
