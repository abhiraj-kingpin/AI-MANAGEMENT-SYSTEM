import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Reveal } from '@/shared/ui/Reveal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { matchesQuery } from '@/shared/lib/searchFilter';
import { useDepartmentComparison } from '@/features/analytics/hooks/useDepartmentComparison';
import { DepartmentFormModal } from '@/features/departments/components/DepartmentFormModal';
import { useUpdateDepartment } from '@/features/departments/hooks/useDepartmentMutations';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useEmployees } from '@/features/employees/hooks/useEmployees';
import { useSearchStore } from '@/stores/searchStore';
import type { Department } from '@/types/api';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function DepartmentsPage() {
  const navigate = useNavigate();
  const [editingDepartment, setEditingDepartment] = useState<Department | 'new' | null>(null);

  const { data: departments, isLoading, isError } = useDepartments(true);
  const { data: comparison } = useDepartmentComparison();
  const { data: employees } = useEmployees({ page: 1, limit: 200 });
  const updateMutation = useUpdateDepartment();

  const searchQuery = useSearchStore((s) => s.query);
  const visibleDepartments = (departments ?? []).filter((dept) =>
    matchesQuery(
      searchQuery,
      dept.name,
      dept.code,
      dept.headOfDepartment ? `${dept.headOfDepartment.firstName} ${dept.headOfDepartment.lastName}` : null,
    ),
  );

  const comparisonByDept = useMemo(
    () => new Map((comparison ?? []).map((row) => [row.departmentId, row])),
    [comparison],
  );
  const onLeaveByDept = useMemo(() => {
    const map = new Map<string, number>();
    for (const employee of employees?.items ?? []) {
      if (employee.employmentStatus !== 'on_leave' || !employee.department) continue;
      map.set(employee.department.id, (map.get(employee.department.id) ?? 0) + 1);
    }
    return map;
  }, [employees]);

  const handleDeactivate = (dept: Department) => {
    if (!window.confirm(`Deactivate "${dept.name}"? It stays selectable for existing employees.`)) return;
    updateMutation.mutate(
      { id: dept.id, input: { isActive: false } },
      { onError: (err) => window.alert(apiErrorMessage(err)) },
    );
  };

  const handleReactivate = (dept: Department) => {
    updateMutation.mutate(
      { id: dept.id, input: { isActive: true } },
      { onError: (err) => window.alert(apiErrorMessage(err)) },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex items-end justify-between">
        <div>
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Organization
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Departments</h1>
        </div>
        <Button onClick={() => setEditingDepartment('new')}>New Department</Button>
      </Reveal>

      {isError ? (
        <Reveal index={1}>
          <Card className="p-8 text-center text-sm text-danger">Couldn't load departments. Try refreshing.</Card>
        </Reveal>
      ) : isLoading && !departments ? (
        <Reveal index={1}>
          <Card className="p-10 text-center text-sm text-text-dim">Loading…</Card>
        </Reveal>
      ) : visibleDepartments.length === 0 ? (
        <Reveal index={1}>
          <Card className="flex flex-col items-center gap-2 p-14 text-center">
            <p className="text-sm text-text-dim">
              {searchQuery
                ? `No departments match "${searchQuery}".`
                : 'No departments defined yet — add the first one to unlock it on the Add Employee form.'}
            </p>
          </Card>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleDepartments.map((dept, i) => {
            const stats = comparisonByDept.get(dept.id);
            const onLeave = onLeaveByDept.get(dept.id) ?? 0;
            const lateCount = stats ? Math.round((stats.lateRate / 100) * stats.headcount) : null;

            return (
              <Reveal key={dept.id} index={i + 1}>
                <Card className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/10 text-[13px] font-extrabold text-accent">
                      {initialsOf(dept.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14.5px] font-extrabold tracking-tight">{dept.name}</div>
                      <div className="mt-0.5 truncate text-[11px] font-medium text-text-dim">
                        Head ·{' '}
                        {dept.headOfDepartment
                          ? `${dept.headOfDepartment.firstName} ${dept.headOfDepartment.lastName}`
                          : 'Unassigned'}
                      </div>
                    </div>
                    {!dept.isActive && (
                      <span className="shrink-0 rounded-pill bg-text-dim/10 px-2 py-0.5 text-[10px] font-bold text-text-dim uppercase">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-[13px] border border-border bg-card-subtle p-2.5">
                      <div className="font-mono text-[18px] font-extrabold tabular-nums">
                        {stats?.headcount ?? '—'}
                      </div>
                      <div className="mt-0.5 text-[10px] font-semibold text-text-dim">People</div>
                    </div>
                    <div className="rounded-[13px] border border-border bg-card-subtle p-2.5">
                      <div
                        className={`font-mono text-[18px] font-extrabold tabular-nums ${
                          stats && stats.attendanceRate < 85 ? 'text-warning' : 'text-success'
                        }`}
                      >
                        {stats ? `${stats.attendanceRate.toFixed(0)}%` : '—'}
                      </div>
                      <div className="mt-0.5 text-[10px] font-semibold text-text-dim">Attendance</div>
                    </div>
                    <div className="rounded-[13px] border border-border bg-card-subtle p-2.5">
                      <div className="font-mono text-[18px] font-extrabold tabular-nums">{onLeave}</div>
                      <div className="mt-0.5 text-[10px] font-semibold text-text-dim">On leave</div>
                    </div>
                  </div>

                  <div className="mt-3.5">
                    <div className="flex items-center justify-between text-[10.5px] font-semibold text-text-dim">
                      <span>Coverage</span>
                      <span className="font-mono tabular-nums">
                        {stats ? `${stats.attendanceRate.toFixed(0)}%` : '—'} · {lateCount ?? '—'} late
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-ink/[0.06]">
                      <div
                        className="h-full rounded-pill bg-gradient-to-r from-accent to-accent-light"
                        style={{ width: `${Math.min(100, Math.max(0, stats?.attendanceRate ?? 0))}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/employees?department=${dept.id}`)}
                      className="flex-1 rounded-xl bg-card-subtle px-3 py-2.5 text-center text-[12px] font-bold text-text-dim transition-colors hover:bg-ink/[0.06]"
                    >
                      View team
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingDepartment(dept)}
                      className="flex-1 rounded-xl bg-card-subtle px-3 py-2.5 text-center text-[12px] font-bold text-accent-light transition-colors hover:bg-ink/[0.06]"
                    >
                      Edit
                    </button>
                    {dept.isActive ? (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(dept)}
                        className="rounded-xl bg-card-subtle px-3 py-2.5 text-center text-[12px] font-bold text-danger transition-colors hover:bg-danger/10"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReactivate(dept)}
                        className="rounded-xl bg-card-subtle px-3 py-2.5 text-center text-[12px] font-bold text-success transition-colors hover:bg-success/10"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>
      )}

      {editingDepartment && (
        <DepartmentFormModal
          department={editingDepartment === 'new' ? undefined : editingDepartment}
          onClose={() => setEditingDepartment(null)}
        />
      )}
    </div>
  );
}
