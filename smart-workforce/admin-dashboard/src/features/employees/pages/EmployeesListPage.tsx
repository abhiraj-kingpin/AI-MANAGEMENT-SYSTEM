import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { buttonClassName } from '@/shared/ui/buttonStyles';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Reveal } from '@/shared/ui/Reveal';
import { Select } from '@/shared/ui/Field';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useEmployees } from '@/features/employees/hooks/useEmployees';
import { useAuthStore } from '@/stores/authStore';
import { useSearchStore } from '@/stores/searchStore';
import type { EmploymentStatus, ListEmployeesQuery } from '@/types/api';

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
  const [query, setQuery] = useState<ListEmployeesQuery>({
    page: 1,
    limit: PAGE_SIZE,
    sortBy: 'firstName',
    order: 'asc',
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery((q) => ({ ...q, search: searchInput || undefined, page: 1 }));
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data: departments } = useDepartments();
  const { data, isLoading, isError } = useEmployees(query);

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
          <Link to="/employees/new" className={buttonClassName()}>
            + Add Employee
          </Link>
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
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-ink/[0.025]"
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/employees/${employee.id}`}
                            className="font-semibold text-text hover:text-accent-light"
                          >
                            {employee.firstName} {employee.lastName}
                          </Link>
                          <div className="font-mono text-[12px] text-text-dim">
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
                          <Chip tone={STATUS_TONE[employee.employmentStatus]}>
                            {STATUS_LABEL[employee.employmentStatus]}
                          </Chip>
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
    </div>
  );
}
