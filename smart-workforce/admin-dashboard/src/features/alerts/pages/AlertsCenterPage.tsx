import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Reveal } from '@/shared/ui/Reveal';
import { useDismissed } from '@/shared/hooks/useDismissed';
import { pushToast } from '@/stores/toastStore';
import { useAnomalies } from '@/features/analytics/hooks/useAnomalies';
import { useLateRisk } from '@/features/analytics/hooks/useLateRisk';
import { useAttendance } from '@/features/attendance/hooks/useAttendance';
import { usePayslips } from '@/features/payroll/hooks/usePayslips';
import { useLeaveQueue } from '@/features/leaves/hooks/useLeaveQueue';
import { useAuthStore } from '@/stores/authStore';
import type { AnomalySeverity } from '@/types/api';

type Category = 'Attendance' | 'Leave' | 'Payroll' | 'Anomaly';
type Severity = 'low' | 'medium' | 'high';

interface AlertItem {
  id: string;
  category: Category;
  glyph: string;
  chipTone: string;
  title: string;
  severity: Severity;
  when: string;
  body: string;
  facts: Array<{ k: string; v: string }>;
  action: string;
  onAct: () => void;
}

const SEVERITY_TONE: Record<Severity, string> = {
  high: 'bg-danger/10 text-danger',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-text-dim/10 text-text-dim',
};

const CATEGORY_CHIP: Record<Category, string> = {
  Attendance: 'bg-accent/10 text-accent',
  Leave: 'bg-accent-2/10 text-accent-2',
  Payroll: 'bg-warning/10 text-warning',
  Anomaly: 'bg-danger/10 text-danger',
};

function anomalySeverityToAlert(s: AnomalySeverity): Severity {
  return s;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AlertsCenterPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'super_admin' || role === 'hr';
  const [tab, setTab] = useState<Category | 'All'>('All');
  const { isDismissed, dismiss } = useDismissed('alerts-center');

  const { data: anomalies } = useAnomalies();
  const { data: lateRisk } = useLateRisk();
  const { data: pendingCorrections } = useAttendance({ hasPendingCorrection: true, limit: 50 });
  const { data: pendingPayslips } = usePayslips({ status: 'generated', page: 1, limit: 1 }, canManage);
  const { data: pendingLeaves } = useLeaveQueue({ status: 'pending', page: 1, limit: 50 }, canManage);

  const alerts: AlertItem[] = useMemo(() => {
    const items: AlertItem[] = [];

    for (const a of anomalies ?? []) {
      items.push({
        id: `anomaly-${a.type}-${a.employeeId}-${a.detectedAt}`,
        category: 'Anomaly',
        glyph: '!!',
        chipTone: CATEGORY_CHIP.Anomaly,
        title: `${a.employeeName} — ${a.type.replace(/_/g, ' ')}`,
        severity: anomalySeverityToAlert(a.severity),
        when: relativeTime(a.detectedAt),
        body: a.detail,
        facts: [
          { k: 'Type', v: a.type.replace(/_/g, ' ') },
          { k: 'Severity', v: a.severity },
          { k: 'Detected', v: new Date(a.detectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
        ],
        action: 'Review',
        onAct: () => navigate('/ai-insights'),
      });
    }

    for (const r of (lateRisk ?? []).filter((e) => e.riskScore >= 60)) {
      items.push({
        id: `risk-${r.employeeId}`,
        category: 'Attendance',
        glyph: 'LT',
        chipTone: CATEGORY_CHIP.Attendance,
        title: `${r.employeeName} — high late-risk score`,
        severity: r.riskScore >= 80 ? 'high' : 'medium',
        when: 'Ongoing',
        body: `Risk score ${r.riskScore}, trending ${r.trend}, over the observed window.`,
        facts: [
          { k: 'Risk score', v: String(r.riskScore) },
          { k: 'Late rate', v: `${r.lateRate.toFixed(1)}%` },
          { k: 'Trend', v: r.trend },
        ],
        action: 'View attendance',
        onAct: () => navigate('/attendance'),
      });
    }

    for (const record of pendingCorrections?.items ?? []) {
      items.push({
        id: `correction-${record.id}`,
        category: 'Attendance',
        glyph: 'CR',
        chipTone: CATEGORY_CHIP.Attendance,
        title: `${record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : 'Employee'} — correction pending`,
        severity: 'medium',
        when: record.correctionRequest ? relativeTime(record.correctionRequest.requestedAt) : '—',
        body: record.correctionRequest?.reason ?? 'A correction request is waiting on review.',
        facts: [
          { k: 'Date', v: new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
          { k: 'Status', v: record.status },
          { k: 'Method', v: record.method },
        ],
        action: 'Review',
        onAct: () => navigate('/attendance'),
      });
    }

    if (pendingLeaves && pendingLeaves.total > 0) {
      items.push({
        id: 'leave-queue',
        category: 'Leave',
        glyph: 'LV',
        chipTone: CATEGORY_CHIP.Leave,
        title: `${pendingLeaves.total} leave request(s) awaiting review`,
        severity: pendingLeaves.total >= 10 ? 'high' : pendingLeaves.total >= 4 ? 'medium' : 'low',
        when: 'Ongoing',
        body: 'These sit in the Leave queue until a manager or HR approves or declines them.',
        facts: [{ k: 'Pending', v: String(pendingLeaves.total) }],
        action: 'Open queue',
        onAct: () => navigate('/leaves'),
      });
    }

    if (canManage && pendingPayslips && pendingPayslips.total > 0) {
      items.push({
        id: 'payroll-pending-release',
        category: 'Payroll',
        glyph: 'PR',
        chipTone: CATEGORY_CHIP.Payroll,
        title: `${pendingPayslips.total} payslip(s) generated, not yet released`,
        severity: 'medium',
        when: 'Ongoing',
        body: 'Generated payslips stay invisible to employees until released.',
        facts: [{ k: 'Awaiting release', v: String(pendingPayslips.total) }],
        action: 'Open Payslips',
        onAct: () => navigate('/payslips'),
      });
    }

    return items.filter((a) => !isDismissed(a.id));
  }, [anomalies, lateRisk, pendingCorrections, pendingLeaves, pendingPayslips, canManage, isDismissed, navigate]);

  const visible = tab === 'All' ? alerts : alerts.filter((a) => a.category === tab);
  const tabs: Array<Category | 'All'> = ['All', 'Attendance', 'Leave', 'Payroll', 'Anomaly'];

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
          Intelligence
        </p>
        <h1 className="text-[26px] font-extrabold text-balance">Alerts Center</h1>
        <p className="mt-1 text-[12.5px] font-medium text-text-dim">
          Operational alerts, separate from your notification inbox
        </p>
      </Reveal>

      <Reveal index={1}>
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-xl px-3.5 py-2 text-[12px] font-bold transition-colors ${
                tab === t ? 'bg-ink text-white' : 'bg-card-subtle text-text-dim hover:bg-ink/[0.06]'
              }`}
            >
              {t} {t !== 'All' && `(${alerts.filter((a) => a.category === t).length})`}
            </button>
          ))}
        </div>
      </Reveal>

      {visible.length === 0 ? (
        <Reveal index={2}>
          <Card className="flex flex-col items-center gap-2 p-14 text-center">
            <span className="text-2xl" aria-hidden="true">
              ✓
            </span>
            <p className="text-sm text-text-dim">Nothing needs attention in this category.</p>
          </Card>
        </Reveal>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((alert, i) => (
            <Reveal key={alert.id} index={i + 2}>
              <Card className="flex items-start gap-3.5 p-4">
                <div className={`grid h-8.5 w-8.5 shrink-0 place-items-center rounded-xl text-[11px] font-extrabold ${alert.chipTone}`}>
                  {alert.glyph}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[13.5px] font-bold text-text">{alert.title}</span>
                    <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_TONE[alert.severity]}`}>
                      {alert.severity}
                    </span>
                    <span className="flex-1" />
                    <span className="font-mono text-[10.5px] tabular-nums text-text-faint">{alert.when}</span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-text-dim">{alert.body}</p>
                  <div className="mt-2.5 flex flex-wrap gap-4">
                    {alert.facts.map((f) => (
                      <div key={f.k}>
                        <div className="text-[9.5px] font-bold tracking-[0.03em] text-text-faint uppercase">{f.k}</div>
                        <div className="mt-0.5 font-mono text-[12px] tabular-nums font-semibold">{f.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex w-[110px] shrink-0 flex-col gap-1.5">
                  <button type="button" onClick={alert.onAct} className="rounded-xl bg-ink px-3 py-2 text-center text-[11.5px] font-bold text-white">
                    {alert.action}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dismiss(alert.id);
                      pushToast('Alert snoozed');
                    }}
                    className="rounded-xl bg-card-subtle px-3 py-2 text-center text-[11.5px] font-bold text-text-dim"
                  >
                    Snooze
                  </button>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
