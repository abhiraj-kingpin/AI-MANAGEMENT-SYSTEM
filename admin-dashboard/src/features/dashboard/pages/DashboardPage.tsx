import { Card } from '@/shared/ui/Card';
import { Reveal } from '@/shared/ui/Reveal';
import { StatCard } from '@/shared/ui/StatCard';
import { AttendanceTrendChart } from '@/features/analytics/components/AttendanceTrendChart';
import { DepartmentComparisonTable } from '@/features/analytics/components/DepartmentComparisonTable';
import { useAttendanceTrend } from '@/features/analytics/hooks/useAttendanceTrend';
import { useDashboardKpis } from '@/features/analytics/hooks/useDashboardKpis';
import { useDepartmentComparison } from '@/features/analytics/hooks/useDepartmentComparison';
import { useHeadcount } from '@/features/employees/hooks/useHeadcount';
import { useAuthStore } from '@/stores/authStore';

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Every StatCard here reports a single day's snapshot, not a real
// change-over-time trend — there's no prior-period comparison wired in yet.
// The up-arrow/"today" pairing is a "this is live data" indicator, exactly
// like Headcount's pre-existing 'up'/'live' pairing, not a claim that the
// number is trending in any direction.
const SNAPSHOT_TREND = { direction: 'up' as const, label: 'today' };

export function DashboardPage() {
  const employee = useAuthStore((s) => s.employee);
  const role = useAuthStore((s) => s.user?.role);
  const canViewAnalytics = role === 'super_admin' || role === 'hr' || role === 'manager';

  const canViewComparison = role === 'super_admin' || role === 'hr';

  const { data: headcount } = useHeadcount();
  const { data: kpis } = useDashboardKpis();
  const { data: trend, isLoading: trendLoading } = useAttendanceTrend();
  const { data: comparison, isLoading: comparisonLoading } = useDepartmentComparison();

  const pendingNote = canViewAnalytics ? 'Loading…' : 'HR/Admin only';

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex items-end justify-between">
        <div>
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Overview
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">
            {greeting()}
            {employee ? `, ${employee.firstName}` : ''}
          </h1>
        </div>
        <div className="font-mono text-[12.5px] text-text-dim">{TODAY}</div>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Headcount"
          index={1}
          data={
            headcount === undefined
              ? undefined
              : {
                  value: headcount,
                  trend: { direction: 'up', label: 'live' },
                  spark: [headcount, headcount, headcount, headcount, headcount, headcount],
                  sparkColor: 'accent',
                }
          }
          pendingNote={pendingNote}
        />
        <StatCard
          label="Attendance Today"
          index={2}
          data={
            kpis === undefined
              ? undefined
              : {
                  value: kpis.attendanceRate,
                  decimals: 1,
                  unit: '%',
                  trend: SNAPSHOT_TREND,
                  spark: Array(6).fill(kpis.attendanceRate) as number[],
                  sparkColor: 'success',
                }
          }
          pendingNote={pendingNote}
        />
        <StatCard
          label="Late Arrivals"
          index={3}
          data={
            kpis === undefined
              ? undefined
              : {
                  value: kpis.lateCount,
                  trend: SNAPSHOT_TREND,
                  spark: Array(6).fill(kpis.lateCount) as number[],
                  sparkColor: 'warning',
                }
          }
          pendingNote={pendingNote}
        />
        <StatCard
          label="On Leave"
          index={4}
          data={
            kpis === undefined
              ? undefined
              : {
                  value: kpis.onLeaveCount,
                  trend: SNAPSHOT_TREND,
                  spark: Array(6).fill(kpis.onLeaveCount) as number[],
                  sparkColor: 'dim',
                }
          }
          pendingNote={pendingNote}
        />
      </div>

      {canViewAnalytics ? (
        <Reveal index={5}>
          <Card className="px-6 py-5">
            <h2 className="mb-1 text-[15px] font-bold">Attendance Trend</h2>
            <p className="mb-4 text-[12.5px] text-text-dim">Last 6 months, monthly rates</p>
            {trendLoading && !trend ? (
              <p className="py-10 text-center text-sm text-text-dim">Loading…</p>
            ) : (
              <AttendanceTrendChart points={trend ?? []} />
            )}
          </Card>
        </Reveal>
      ) : (
        <Reveal index={5}>
          <Card className="flex flex-col items-center gap-2 px-8 py-14 text-center">
            <span className="text-2xl" aria-hidden="true">
              ◈
            </span>
            <p className="text-sm text-text-dim">
              Attendance trends and department comparisons are visible to HR/Admin/Manager roles.
            </p>
          </Card>
        </Reveal>
      )}

      {canViewComparison && (
        <Reveal index={6}>
          <Card className="px-6 py-5">
            <h2 className="mb-1 text-[15px] font-bold">Department Comparison</h2>
            <p className="mb-4 text-[12.5px] text-text-dim">
              Today's attendance rate by department, ranked
            </p>
            {comparisonLoading && !comparison ? (
              <p className="py-10 text-center text-sm text-text-dim">Loading…</p>
            ) : (
              <DepartmentComparisonTable rows={comparison ?? []} />
            )}
          </Card>
        </Reveal>
      )}
    </div>
  );
}
