import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Reveal } from '@/shared/ui/Reveal';
import { Select } from '@/shared/ui/Field';
import { ImportIcon } from '@/shared/ui/icons';
import { AddEmployeeModal } from '@/features/employees/components/AddEmployeeModal';
import { BulkImportModal } from '@/features/employees/components/BulkImportModal';
import { EmployeeDrawer } from '@/features/employees/components/EmployeeDrawer';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useEmployees } from '@/features/employees/hooks/useEmployees';
import { useAuthStore } from '@/stores/authStore';
import { useSearchStore } from '@/stores/searchStore';
import type { Employee, EmploymentStatus, ListEmployeesQuery } from '@/types/api';

const STATUS_TONE: Record<EmploymentStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  on_leave: 'warning',
  suspended: 'warning',
  terminated: 'neutral',
};

const STATUS_LABEL: Record<EmploymentStatus, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  suspended: 'Suspended',
  terminated: 'Terminated',
};

const PAGE_SIZE = 20;

export function EmployeesListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'super_admin' || role === 'hr';

  // Driven by the Topbar's global search box, not a local input — see
  // searchStore.ts. Debounced into the server-side `search` query param,
  // which covers the full dataset (name/email/employee ID/department/
  // designation — see backend employee.service.ts) rather than just
  // whatever page of results happens to be on screen.
  const searchInput = useSearchStore((s) => s.query);
  // Deep link from Departments' "View team" — reads once on mount, then
  // this page's own filter controls take over (no round-trip back to the
  // URL on every change).
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState<ListEmployeesQuery>({
    page: 1,
    limit: PAGE_SIZE,
    sortBy: 'firstName',
    order: 'asc',
    department: searchParams.get('department') ?? undefined,
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery((q) => ({ ...q, search: searchInput || undefined, page: 1 }));
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data: departments } = useDepartments();
  const { data, isLoading, isError } = useEmployees(query);
  const [adding, setAdding] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex items-end justify-between">
        <div>
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            People
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Employees</h1>
        </div>
        {canManage && (
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setBulkImporting(true)}
              className="flex items-center gap-1.5 rounded-pill border border-border bg-white px-4 py-2.5 text-[13px] font-bold text-text-dim hover:bg-ink/[0.03]"
            >
              <ImportIcon className="h-4 w-4" />
              Bulk import
            </button>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="rounded-pill px-5 py-3 text-[13px] font-bold text-white brand-gradient shadow-[0_8px_20px_-8px_rgba(20,48,79,0.55)]"
            >
              + Add Employee
            </button>
          </div>
        )}
      </Reveal>

      <Reveal index={1}>
        <Card className="flex flex-wrap items-center gap-3 px-5 py-4">
          <p className="min-w-[220px] flex-1 text-[12.5px] font-semibold text-text-dim">
            {searchInput ? (
              <>
                Matching <span className="text-text">"{searchInput}"</span> — name, email,
                employee ID, department, or designation
              </>
            ) : (
              'Use the search bar above to find anyone by name, email, employee ID, department, or designation'
            )}
          </p>
          <Select
            value={query.department ?? ''}
            onChange={(e) =>
              setQuery((q) => ({ ...q, department: e.target.value || undefined, page: 1 }))
            }
            className="w-auto min-w-[160px]"
          >
            <option value="">All departments</option>
            {departments?.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </Select>
          <Select
            value={query.status ?? ''}
            onChange={(e) =>
              setQuery((q) => ({
                ...q,
                status: (e.target.value || undefined) as EmploymentStatus | undefined,
                page: 1,
              }))
            }
            className="w-auto min-w-[150px]"
          >
            <option value="">All statuses</option>
            {(Object.keys(STATUS_LABEL) as EmploymentStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </Card>
      </Reveal>

      <Reveal index={2}>
        <Card className="overflow-hidden">
          {isError ? (
            <p className="p-8 text-center text-sm text-danger">
              Couldn't load employees. Try refreshing.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
                    <th className="px-5 py-3.5 font-bold">Employee</th>
                    <th className="px-5 py-3.5 font-bold">Department</th>
                    <th className="px-5 py-3.5 font-bold">Designation</th>
                    <th className="px-5 py-3.5 font-bold">Manager</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && !data ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-text-dim">
                        Loading…
                      </td>
                    </tr>
                  ) : data && data.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-text-dim">
                        No employees match these filters.
                      </td>
                    </tr>
                  ) : (
                    data?.items.map((employee) => (
                      <tr
                        key={employee.id}
                        onClick={() => setSelected(employee)}
                        className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-ink/[0.025]"
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-text">
                            {employee.firstName} {employee.lastName}
                          </span>
                          <div className="font-mono text-[12px] tabular-nums text-text-dim">
                            {employee.employeeCode}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-text-dim">
                          {employee.department?.name ?? '—'}
                        </td>
                        <td className="px-5 py-3.5 text-text-dim">{employee.designation}</td>
                        <td className="px-5 py-3.5 text-text-dim">
                          {employee.manager
                            ? `${employee.manager.firstName} ${employee.manager.lastName}`
                            : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Chip tone={STATUS_TONE[employee.employmentStatus]}>
                              {STATUS_LABEL[employee.employmentStatus]}
                            </Chip>
                            {!employee.accountClaimed && <Chip tone="warning">Invited</Chip>}
                          </div>
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
                Page {data.page} of {data.pages} — {data.total} employee(s)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="px-3.5 py-1.5 text-[12.5px]"
                  disabled={data.page <= 1}
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  className="px-3.5 py-1.5 text-[12.5px]"
                  disabled={data.page >= data.pages}
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </Reveal>

      {adding && <AddEmployeeModal onClose={() => setAdding(false)} />}
      {bulkImporting && <BulkImportModal onClose={() => setBulkImporting(false)} />}
      {selected && <EmployeeDrawer employee={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
