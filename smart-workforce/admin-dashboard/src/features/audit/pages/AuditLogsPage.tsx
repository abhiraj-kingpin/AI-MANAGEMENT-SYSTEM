import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Reveal } from '@/shared/ui/Reveal';
import { useAuditLogs } from '@/features/audit/hooks/useAuditLogs';
import type { AuditLog, AuditResult } from '@/types/api';

const TABS: Array<{ label: string; entityType?: string }> = [
  { label: 'All' },
  { label: 'Attendance', entityType: 'Attendance' },
  { label: 'Employees', entityType: 'Employee' },
  { label: 'Leave', entityType: 'Leave' },
  { label: 'Payroll', entityType: 'Payslip' },
  { label: 'Users', entityType: 'User' },
  { label: 'Offices', entityType: 'Geofence' },
];

const RESULT_TONE: Record<AuditResult, 'success' | 'warning' | 'danger'> = {
  success: 'success',
  failed: 'danger',
  blocked: 'warning',
};

const PAGE_SIZE = 25;

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function humanizeAction(action: string): string {
  return action
    .split('.')
    .join(' · ')
    .replace(/_/g, ' ');
}

function DiffValue({ before, after }: { before: unknown; after: unknown }) {
  const beforeText = before == null ? '—' : typeof before === 'object' ? JSON.stringify(before) : String(before);
  const afterText = after == null ? '—' : typeof after === 'object' ? JSON.stringify(after) : String(after);
  if (beforeText === afterText) return <span className="text-text-dim">{afterText}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-text-faint line-through">{beforeText}</span>
      <span aria-hidden="true">→</span>
      <span className="font-semibold text-text">{afterText}</span>
    </span>
  );
}

function AuditRowDetail({ log }: { log: AuditLog }) {
  const keys = new Set([...Object.keys(log.before ?? {}), ...Object.keys(log.after ?? {})]);
  if (keys.size === 0) return <span className="text-text-faint">—</span>;

  return (
    <div className="flex flex-col gap-0.5">
      {[...keys].slice(0, 3).map((key) => (
        <div key={key} className="text-[11.5px]">
          <span className="text-text-faint">{key}: </span>
          <DiffValue before={log.before?.[key]} after={log.after?.[key]} />
        </div>
      ))}
    </div>
  );
}

export function AuditLogsPage() {
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useAuditLogs({
    entityType: TABS[tab].entityType,
    page,
    limit: PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
          System
        </p>
        <h1 className="text-[26px] font-extrabold text-balance">Audit Logs</h1>
        <p className="mt-1 text-[12.5px] font-medium text-text-dim">Immutable trail of every recorded change</p>
      </Reveal>

      <Reveal index={1}>
        <div className="flex flex-wrap gap-2">
          {TABS.map((t, i) => (
            <button
              key={t.label}
              type="button"
              onClick={() => {
                setTab(i);
                setPage(1);
              }}
              className={`rounded-xl px-3.5 py-2 text-[12px] font-bold transition-colors ${
                tab === i ? 'bg-ink text-white' : 'bg-card-subtle text-text-dim hover:bg-ink/[0.06]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal index={2}>
        <Card className="overflow-hidden">
          {isError ? (
            <p className="p-8 text-center text-sm text-danger">Couldn't load the audit trail. Try refreshing.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
                    <th className="px-5 py-3.5 font-bold">Timestamp</th>
                    <th className="px-5 py-3.5 font-bold">Actor</th>
                    <th className="px-5 py-3.5 font-bold">Action</th>
                    <th className="px-5 py-3.5 font-bold">Target</th>
                    <th className="px-5 py-3.5 font-bold">Source</th>
                    <th className="px-5 py-3.5 font-bold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && !data ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-text-dim">
                        Loading…
                      </td>
                    </tr>
                  ) : !data || data.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-text-dim">
                        No audit entries for this filter yet.
                      </td>
                    </tr>
                  ) : (
                    data.items.map((log) => (
                      <tr key={log.id} className="border-b border-border/60 align-top transition-colors last:border-0 hover:bg-ink/[0.025]">
                        <td className="px-5 py-3.5 font-mono text-[11.5px] tabular-nums text-text-dim whitespace-nowrap">
                          {formatTimestamp(log.createdAt)}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-text">{log.actorEmail}</td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-text capitalize">{humanizeAction(log.action)}</div>
                          <AuditRowDetail log={log} />
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] tabular-nums text-text-dim">
                          {log.entityType} · {log.entityId.slice(-6)}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] tabular-nums text-text-faint">{log.source}</td>
                        <td className="px-5 py-3.5">
                          <Chip tone={RESULT_TONE[log.result]}>{log.result}</Chip>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3.5 text-[13px] text-text-dim">
              <span>
                Page {data.page} of {data.pages} — {data.total} entries
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold hover:bg-ink/[0.05] disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={data.page >= data.pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold hover:bg-ink/[0.05] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      </Reveal>
    </div>
  );
}
