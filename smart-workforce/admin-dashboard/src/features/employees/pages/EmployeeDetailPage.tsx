import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { buttonClassName } from '@/shared/ui/buttonStyles';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Reveal } from '@/shared/ui/Reveal';
import { useEmployee } from '@/features/employees/hooks/useEmployee';
import { useDeleteEmployee } from '@/features/employees/hooks/useEmployeeMutations';
import { useAuthStore } from '@/stores/authStore';
import { apiErrorMessage } from '@/shared/lib/apiError';
import type { EmploymentStatus } from '@/types/api';

const STATUS_TONE: Record<EmploymentStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  on_leave: 'warning',
  suspended: 'warning',
  terminated: 'neutral',
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-3 text-sm last:border-0">
      <span className="text-text-dim">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'super_admin' || role === 'hr';

  const { data: employee, isLoading, isError, error } = useEmployee(id);
  const deleteMutation = useDeleteEmployee();

  if (isLoading) {
    return <p className="p-8 text-center text-text-dim">Loading…</p>;
  }

  if (isError || !employee) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-danger">{apiErrorMessage(error, 'Employee not found.')}</p>
        <Link to="/employees" className="mt-3 inline-block text-sm text-accent-light">
          ← Back to Employees
        </Link>
      </Card>
    );
  }

  const handleDelete = () => {
    if (
      !window.confirm(
        `Deactivate ${employee.firstName} ${employee.lastName}? This soft-deletes their record and disables login.`,
      )
    ) {
      return;
    }
    deleteMutation.mutate(employee.id, { onSuccess: () => navigate('/employees') });
  };

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex items-center justify-between">
        <div>
          <Link to="/employees" className="text-[12.5px] text-text-dim hover:text-accent-light">
            ← Employees
          </Link>
          <h1 className="mt-1 text-[26px] font-extrabold text-balance">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="font-mono text-[13px] text-text-dim">{employee.employeeCode}</p>
        </div>
        {canManage && (
          <div className="flex gap-2.5">
            <Link to={`/employees/${employee.id}/edit`} className={buttonClassName('ghost')}>
              Edit
            </Link>
            <Button
              variant="ghost"
              className="text-danger hover:bg-danger/10"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
            >
              Deactivate
            </Button>
          </div>
        )}
      </Reveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Reveal index={1} className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-4 text-base font-bold">Profile</h2>
            <DetailRow label="Email" value={employee.email} />
            <DetailRow label="Phone" value={employee.phone} />
            <DetailRow label="Department" value={employee.department?.name ?? '—'} />
            <DetailRow label="Designation" value={employee.designation} />
            <DetailRow
              label="Manager"
              value={
                employee.manager
                  ? `${employee.manager.firstName} ${employee.manager.lastName}`
                  : '—'
              }
            />
            <DetailRow
              label="Date of Joining"
              value={new Date(employee.dateOfJoining).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            />
            <DetailRow label="Role" value={employee.role} />
          </Card>
        </Reveal>

        <Reveal index={2}>
          <Card className="p-6">
            <h2 className="mb-4 text-base font-bold">Status</h2>
            <div className="flex flex-col gap-3">
              <Chip tone={STATUS_TONE[employee.employmentStatus]}>
                {employee.employmentStatus.replace('_', ' ')}
              </Chip>
              <Chip tone={employee.isActive ? 'success' : 'neutral'}>
                {employee.isActive ? 'Login active' : 'Login disabled'}
              </Chip>
            </div>

            {(employee.emergencyContact?.name || employee.emergencyContact?.phone) && (
              <>
                <h2 className="mt-6 mb-3 text-base font-bold">Emergency Contact</h2>
                <DetailRow label="Name" value={employee.emergencyContact.name ?? '—'} />
                <DetailRow
                  label="Relationship"
                  value={employee.emergencyContact.relationship ?? '—'}
                />
                <DetailRow label="Phone" value={employee.emergencyContact.phone ?? '—'} />
              </>
            )}
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
