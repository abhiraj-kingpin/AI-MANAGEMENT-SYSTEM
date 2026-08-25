import { Card } from '@/shared/ui/Card';
import { Reveal } from '@/shared/ui/Reveal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { useSettings, useUpdateSettings } from '@/features/settings/hooks/useSettings';
import { pushToast } from '@/stores/toastStore';
import type { UpdateSettingsInput, WorkspaceSettings } from '@/types/api';

type Group = keyof WorkspaceSettings extends infer K
  ? K extends 'updatedAt'
    ? never
    : K
  : never;

interface ToggleRow {
  kind: 'toggle';
  group: Exclude<Group, never>;
  field: string;
  label: string;
  note: string;
}

interface ValueRow {
  kind: 'value';
  group: Exclude<Group, never>;
  field: string;
  label: string;
  note: string;
  suffix: string;
  min: number;
  max: number;
}

type Row = ToggleRow | ValueRow;

const GROUPS: Array<{ key: Exclude<Group, never>; title: string; note: string; rows: Row[] }> = [
  {
    key: 'attendanceRules',
    title: 'Attendance rules',
    note: 'How check-ins are graded and enforced',
    rows: [
      {
        kind: 'value',
        group: 'attendanceRules',
        field: 'lateGraceMinutes',
        label: 'Late grace period',
        note: 'Minutes after shift start before a check-in counts as late',
        suffix: 'min',
        min: 0,
        max: 120,
      },
      {
        kind: 'toggle',
        group: 'attendanceRules',
        field: 'autoMarkAbsentEnabled',
        label: 'Auto-mark absent overnight',
        note: 'The nightly absence sweep flags anyone with no punch and no leave on file',
      },
      {
        kind: 'toggle',
        group: 'attendanceRules',
        field: 'requireGeofenceForGps',
        label: 'Require geofence for GPS check-in',
        note: 'GPS check-ins must land inside a registered office radius',
      },
      {
        kind: 'toggle',
        group: 'attendanceRules',
        field: 'allowManualCheckIn',
        label: 'Allow manual check-in by HR/Admin',
        note: 'Lets HR/Admin backfill or correct a punch directly',
      },
    ],
  },
  {
    key: 'leaveApprovals',
    title: 'Leave & approvals',
    note: 'How time-off requests are routed and settled',
    rows: [
      {
        kind: 'value',
        group: 'leaveApprovals',
        field: 'autoApproveUnderDays',
        label: 'Auto-approve threshold',
        note: 'Requests at or under this many days skip manual review (0 disables)',
        suffix: 'days',
        min: 0,
        max: 30,
      },
      {
        kind: 'toggle',
        group: 'leaveApprovals',
        field: 'requireManagerApproval',
        label: 'Require manager approval',
        note: "A request must clear the employee's manager before HR sees it",
      },
      {
        kind: 'toggle',
        group: 'leaveApprovals',
        field: 'carryForwardEnabled',
        label: 'Allow leave carry-forward',
        note: 'Unused annual leave rolls into the next year, up to each leave type\'s cap',
      },
    ],
  },
  {
    key: 'aiAnalytics',
    title: 'AI & analytics',
    note: 'Which rule-based signals run in the background',
    rows: [
      {
        kind: 'toggle',
        group: 'aiAnalytics',
        field: 'anomalyDetectionEnabled',
        label: 'Anomaly detection',
        note: 'GPS travel-speed, overtime outlier, and duplicate-face checks',
      },
      {
        kind: 'toggle',
        group: 'aiAnalytics',
        field: 'absenteeismForecastingEnabled',
        label: 'Absenteeism forecasting',
        note: 'Monthly least-squares forecast on the AI Insights page',
      },
      {
        kind: 'toggle',
        group: 'aiAnalytics',
        field: 'lateRiskAlertsEnabled',
        label: 'Late-risk alerts',
        note: 'Surfaces employees trending later into the Alerts Center',
      },
    ],
  },
  {
    key: 'dataPayroll',
    title: 'Data & payroll',
    note: 'Cut-offs and retention',
    rows: [
      {
        kind: 'value',
        group: 'dataPayroll',
        field: 'payrollCutoffDay',
        label: 'Payroll cut-off day',
        note: 'Day of the month timesheets lock for payroll processing',
        suffix: 'of month',
        min: 1,
        max: 28,
      },
      {
        kind: 'value',
        group: 'dataPayroll',
        field: 'dataRetentionMonths',
        label: 'Data retention',
        note: 'How long attendance and payroll records are kept',
        suffix: 'months',
        min: 1,
        max: 240,
      },
      {
        kind: 'toggle',
        group: 'dataPayroll',
        field: 'weeklyDigestEmail',
        label: 'Weekly digest email',
        note: 'A weekly attendance/payroll summary to HR and Admin',
      },
    ],
  },
];

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();

  const submit = (patch: UpdateSettingsInput) => {
    updateMutation.mutate(patch, {
      onSuccess: () => pushToast('Settings updated'),
      onError: (err) => window.alert(apiErrorMessage(err)),
    });
  };

  const handleToggle = (row: ToggleRow) => {
    if (!settings) return;
    const current = (settings[row.group] as Record<string, unknown>)[row.field] as boolean;
    submit({ [row.group]: { [row.field]: !current } } as UpdateSettingsInput);
  };

  const handleValue = (row: ValueRow) => {
    if (!settings) return;
    const current = (settings[row.group] as Record<string, unknown>)[row.field] as number;
    const raw = window.prompt(`${row.label} (${row.min}–${row.max} ${row.suffix})`, String(current));
    if (raw === null) return;
    const next = Number(raw);
    if (!Number.isFinite(next) || next < row.min || next > row.max) {
      window.alert(`Enter a number between ${row.min} and ${row.max}.`);
      return;
    }
    submit({ [row.group]: { [row.field]: next } } as UpdateSettingsInput);
  };

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
          System
        </p>
        <h1 className="text-[26px] font-extrabold text-balance">Settings</h1>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {GROUPS.map((group, i) => (
          <Reveal key={group.key} index={i + 1}>
            <Card className="p-5">
              <h2 className="text-[15px] font-bold">{group.title}</h2>
              <p className="mt-0.5 mb-1 text-[11.5px] font-medium text-text-dim">{group.note}</p>
              <div className="flex flex-col divide-y divide-border">
                {group.rows.map((row) => {
                  const value = settings ? (settings[row.group] as Record<string, unknown>)[row.field] : undefined;
                  return (
                    <div key={row.field} className="flex items-center gap-3 py-3.5">
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-text">{row.label}</p>
                        <p className="mt-0.5 text-[11.5px] text-text-dim">{row.note}</p>
                      </div>
                      {isLoading || !settings ? (
                        <span className="text-[12px] text-text-faint">…</span>
                      ) : row.kind === 'toggle' ? (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!!value}
                          onClick={() => handleToggle(row)}
                          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                            value ? 'bg-accent' : 'bg-text-dim/25'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              value ? 'translate-x-[22px]' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleValue(row)}
                          className="shrink-0 rounded-lg bg-card-subtle px-2.5 py-1.5 font-mono text-[12px] font-semibold tabular-nums text-text hover:bg-ink/[0.06]"
                        >
                          {String(value)} {row.suffix}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
