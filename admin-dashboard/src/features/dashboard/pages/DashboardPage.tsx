import { Card } from '@/shared/ui/Card';
import { Reveal } from '@/shared/ui/Reveal';
import { StatCard } from '@/shared/ui/StatCard';
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

export function DashboardPage() {
  const employee = useAuthStore((s) => s.employee);
  const { data: headcount } = useHeadcount();

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
          pendingNote={employee ? 'Loading…' : 'HR/Admin only'}
        />
        <StatCard label="Attendance Today" index={2} pendingNote="Phase 14" />
        <StatCard label="Late Arrivals" index={3} pendingNote="Phase 14" />
        <StatCard label="On Leave" index={4} pendingNote="Phase 14" />
      </div>

      <Reveal index={5}>
        <Card className="flex flex-col items-center gap-2 px-8 py-14 text-center">
          <span className="text-2xl" aria-hidden="true">
            ◈
          </span>
          <h2 className="text-base font-bold">Analytics dashboard is coming in Phase 14</h2>
          <p className="max-w-md text-sm text-text-dim">
            Attendance rate, late trends, and leave utilization will appear here once the reporting
            API ships — see{' '}
            <span className="font-mono text-[12.5px]">
              docs/architecture/04-api-documentation.md#analytics-analytics
            </span>
            .
          </p>
        </Card>
      </Reveal>
    </div>
  );
}
