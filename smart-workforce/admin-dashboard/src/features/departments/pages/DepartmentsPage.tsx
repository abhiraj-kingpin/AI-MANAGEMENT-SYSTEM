import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Reveal } from '@/shared/ui/Reveal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { matchesQuery } from '@/shared/lib/searchFilter';
import { DepartmentFormModal } from '@/features/departments/components/DepartmentFormModal';
import { useUpdateDepartment } from '@/features/departments/hooks/useDepartmentMutations';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useSearchStore } from '@/stores/searchStore';
import type { Department } from '@/types/api';

export function DepartmentsPage() {
  const [editingDepartment, setEditingDepartment] = useState<Department | 'new' | null>(null);
  const { data: departments, isLoading, isError } = useDepartments(true);
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

  const handleDeactivate = (dept: Department) => {
    if (!window.confirm(`Deactivate "${dept.name}"? It stays selectable for existing employees.`))
      return;
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

      <Reveal index={1}>
        <Card className="overflow-hidden">
          {isError ? (
            <p className="p-8 text-center text-sm text-danger">
              Couldn't load departments. Try refreshing.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
                    <th className="px-5 py-3.5 font-bold">Department</th>
                    <th className="px-5 py-3.5 font-bold">Code</th>
                    <th className="px-5 py-3.5 font-bold">Head</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && !departments ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-text-dim">
                        Loading…
                      </td>
                    </tr>
                  ) : visibleDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-text-dim">
                        {searchQuery
                          ? `No departments match "${searchQuery}".`
                          : 'No departments defined yet — add the first one to unlock it on the Add Employee form.'}
                      </td>
                    </tr>
                  ) : (
                    visibleDepartments.map((dept) => (
                      <tr
                        key={dept.id}
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-ink/[0.025]"
                      >
                        <td className="px-5 py-3.5 font-semibold text-text">{dept.name}</td>
                        <td className="px-5 py-3.5 font-mono text-[12.5px] text-text-dim">
                          {dept.code}
                        </td>
                        <td className="px-5 py-3.5 text-text-dim">
                          {dept.headOfDepartment
                            ? `${dept.headOfDepartment.firstName} ${dept.headOfDepartment.lastName}`
                            : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <Chip tone={dept.isActive ? 'success' : 'neutral'}>
                            {dept.isActive ? 'Active' : 'Inactive'}
                          </Chip>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setEditingDepartment(dept)}
                              className="text-[12.5px] font-semibold text-accent-light hover:underline"
                            >
                              Edit
                            </button>
                            {dept.isActive ? (
                              <button
                                type="button"
                                onClick={() => handleDeactivate(dept)}
                                className="text-[12.5px] font-semibold text-danger hover:underline"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReactivate(dept)}
                                className="text-[12.5px] font-semibold text-success hover:underline"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
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

      {editingDepartment && (
        <DepartmentFormModal
          department={editingDepartment === 'new' ? undefined : editingDepartment}
          onClose={() => setEditingDepartment(null)}
        />
      )}
    </div>
  );
}
