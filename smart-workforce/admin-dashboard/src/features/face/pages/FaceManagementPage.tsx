import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Reveal } from '@/shared/ui/Reveal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { useFaceEnrollments, useFaceStats, useResetFaceEnrollment } from '@/features/face/hooks/useFace';
import { pushToast } from '@/stores/toastStore';
import type { FaceEnrollmentRow, FaceEnrollmentStatus } from '@/types/api';

const STATUS_TONE: Record<FaceEnrollmentStatus, 'success' | 'warning' | 'neutral'> = {
  registered: 'success',
  re_enrollment_due: 'warning',
  not_registered: 'neutral',
};

const STATUS_LABEL: Record<FaceEnrollmentStatus, string> = {
  registered: 'Enrolled',
  re_enrollment_due: 'Re-enrolment due',
  not_registered: 'Not registered',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function FaceManagementPage() {
  const { data: stats } = useFaceStats();
  const { data: rows, isLoading, isError } = useFaceEnrollments();
  const resetMutation = useResetFaceEnrollment();

  const handleReset = (row: FaceEnrollmentRow) => {
    if (
      !window.confirm(
        `Clear ${row.name}'s enrolled face data? They'll need to re-enrol from the mobile app before Face check-in works again.`,
      )
    )
      return;
    resetMutation.mutate(row.employeeId, {
      onSuccess: () => pushToast(`${row.name}'s face data cleared`),
      onError: (err) => window.alert(apiErrorMessage(err)),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
          System
        </p>
        <h1 className="text-[26px] font-extrabold text-balance">Face Management</h1>
      </Reveal>

      <Reveal index={1}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="px-5 py-4">
            <p className="text-[11px] font-bold tracking-[0.03em] text-text-dim uppercase">Enrolled</p>
            <p className="mt-2.5 font-mono text-[27px] font-extrabold tabular-nums">{stats?.enrolled ?? '—'}</p>
          </Card>
          <Card className="px-5 py-4">
            <p className="text-[11px] font-bold tracking-[0.03em] text-text-dim uppercase">Not registered</p>
            <p className="mt-2.5 font-mono text-[27px] font-extrabold tabular-nums text-text-dim">
              {stats?.notRegistered ?? '—'}
            </p>
          </Card>
          <Card className="px-5 py-4">
            <p className="text-[11px] font-bold tracking-[0.03em] text-text-dim uppercase">Re-enrolment due</p>
            <p className="mt-2.5 font-mono text-[27px] font-extrabold tabular-nums text-warning">
              {stats?.reEnrollmentDue ?? '—'}
            </p>
          </Card>
          <Card className="px-5 py-4">
            <p className="text-[11px] font-bold tracking-[0.03em] text-text-dim uppercase">Verifications today</p>
            <p className="mt-2.5 font-mono text-[27px] font-extrabold tabular-nums text-accent">
              {stats?.verificationsToday ?? '—'}
            </p>
          </Card>
        </div>
      </Reveal>

      <Reveal index={2}>
        <div className="flex items-center gap-2.5 rounded-card border border-accent/20 bg-accent/[0.06] px-4 py-3.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" className="shrink-0 text-accent">
            <path d="M12 8.5v5M12 16.5h.01" />
            <circle cx="12" cy="12" r="8.5" />
          </svg>
          <p className="text-[12.5px] font-semibold text-accent">
            Templates stay encrypted on each device. This console shows enrolment state only — never raw biometric data.
          </p>
        </div>
      </Reveal>

      <Reveal index={3}>
        <Card className="overflow-hidden">
          {isError ? (
            <p className="p-8 text-center text-sm text-danger">Couldn't load enrolment data. Try refreshing.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
                    <th className="px-5 py-3.5 font-bold">Employee</th>
                    <th className="px-5 py-3.5 font-bold">Department</th>
                    <th className="px-5 py-3.5 font-bold">Enrolled</th>
                    <th className="px-5 py-3.5 font-bold">Last verified</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && !rows ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-text-dim">
                        Loading…
                      </td>
                    </tr>
                  ) : !rows || rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-text-dim">
                        No employees yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.employeeId} className="border-b border-border/60 transition-colors last:border-0 hover:bg-ink/[0.025]">
                        <td className="px-5 py-3.5 font-semibold text-text">{row.name}</td>
                        <td className="px-5 py-3.5 text-text-dim">{row.department}</td>
                        <td className="px-5 py-3.5 font-mono text-[12px] tabular-nums text-text-dim">{formatDate(row.enrolledAt)}</td>
                        <td className="px-5 py-3.5 font-mono text-[12px] tabular-nums text-text-dim">{formatDate(row.lastVerifiedAt)}</td>
                        <td className="px-5 py-3.5">
                          <Chip tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Chip>
                        </td>
                        <td className="px-5 py-3.5">
                          {row.status !== 'not_registered' && (
                            <button
                              type="button"
                              onClick={() => handleReset(row)}
                              className="text-[12.5px] font-semibold text-danger hover:underline"
                            >
                              {row.status === 're_enrollment_due' ? 'Prompt re-enrol' : 'Reset enrolment'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Reveal>
    </div>
  );
}
