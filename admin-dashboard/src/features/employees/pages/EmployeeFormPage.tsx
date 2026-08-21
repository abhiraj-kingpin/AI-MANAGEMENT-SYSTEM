import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Field, Input, Select } from '@/shared/ui/Field';
import { PhoneInput } from '@/shared/ui/PhoneInput';
import { Reveal } from '@/shared/ui/Reveal';
import {
  EmployeePicker,
  type EmployeeOption,
} from '@/features/employees/components/EmployeePicker';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useEmployee } from '@/features/employees/hooks/useEmployee';
import {
  useCreateEmployee,
  useUpdateEmployee,
} from '@/features/employees/hooks/useEmployeeMutations';
import { apiErrorMessage } from '@/shared/lib/apiError';
import type { Employee, EmploymentStatus, Role } from '@/types/api';

const ASSIGNABLE_ROLES: Exclude<Role, 'super_admin'>[] = ['hr', 'manager', 'employee'];
const EMPLOYMENT_STATUSES: EmploymentStatus[] = ['active', 'on_leave', 'suspended', 'terminated'];

interface FormState {
  email: string;
  role: Exclude<Role, 'super_admin'>;
  firstName: string;
  lastName: string;
  phone: string;
  departmentId: string;
  designation: string;
  dateOfJoining: string;
  employmentStatus: EmploymentStatus;
}

function initialFormState(existing: Employee | null): FormState {
  if (!existing) {
    return {
      email: '',
      role: 'employee',
      firstName: '',
      lastName: '',
      phone: '',
      departmentId: '',
      designation: '',
      dateOfJoining: '',
      employmentStatus: 'active',
    };
  }
  return {
    email: existing.email,
    role: existing.role === 'super_admin' ? 'employee' : existing.role,
    firstName: existing.firstName,
    lastName: existing.lastName,
    phone: existing.phone,
    departmentId: existing.department?.id ?? '',
    designation: existing.designation,
    dateOfJoining: existing.dateOfJoining.slice(0, 10),
    employmentStatus: existing.employmentStatus,
  };
}

function initialManager(existing: Employee | null): EmployeeOption | null {
  if (!existing?.manager) return null;
  return {
    id: existing.manager.id,
    label: `${existing.manager.firstName} ${existing.manager.lastName} (${existing.manager.employeeCode})`,
  };
}

/**
 * Route-level shell: resolves whether this is create or edit, and — for
 * edit — waits for the existing employee to load before ever mounting the
 * form. `EmployeeFormBody` below then initializes its state once, via a
 * lazy `useState` initializer, from data it already has in hand — no
 * effect syncing a query result into local state after the fact needed.
 */
export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { data: existing, isLoading, isError } = useEmployee(id);

  if (isEdit && isLoading) {
    return <p className="p-8 text-center text-text-dim">Loading…</p>;
  }
  if (isEdit && isError) {
    return <p className="p-8 text-center text-sm text-danger">Couldn't load this employee.</p>;
  }

  return <EmployeeFormBody isEdit={isEdit} id={id} existing={existing ?? null} />;
}

function EmployeeFormBody({
  isEdit,
  id,
  existing,
}: {
  isEdit: boolean;
  id: string | undefined;
  existing: Employee | null;
}) {
  const navigate = useNavigate();
  const { data: departments } = useDepartments();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee(id ?? '');

  const [form, setForm] = useState<FormState>(() => initialFormState(existing));
  const [manager, setManager] = useState<EmployeeOption | null>(() => initialManager(existing));
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isEdit) {
      updateMutation.mutate(
        {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          departmentId: form.departmentId,
          designation: form.designation,
          managerId: manager?.id ?? null,
          dateOfJoining: form.dateOfJoining,
          employmentStatus: form.employmentStatus,
        },
        {
          onSuccess: () => navigate(`/employees/${id}`),
          onError: (err) => setFormError(apiErrorMessage(err)),
        },
      );
    } else {
      createMutation.mutate(
        {
          email: form.email,
          role: form.role,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          departmentId: form.departmentId,
          designation: form.designation,
          managerId: manager?.id,
          dateOfJoining: form.dateOfJoining,
        },
        {
          onSuccess: (employee) => navigate(`/employees/${employee.id}`),
          onError: (err) => setFormError(apiErrorMessage(err)),
        },
      );
    }
  };

  const backTo = isEdit ? `/employees/${id}` : '/employees';

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <Link to={backTo} className="text-[12.5px] text-text-dim hover:text-accent-light">
          ← {isEdit ? 'Back' : 'Employees'}
        </Link>
        <h1 className="mt-1 text-[26px] font-extrabold text-balance">
          {isEdit ? 'Edit Employee' : 'Add Employee'}
        </h1>
      </Reveal>

      <Reveal index={1}>
        <Card className="max-w-2xl p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!isEdit && (
              <div className="sm:col-span-2">
                <Field label="Email" htmlFor="email">
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="jane@company.com"
                  />
                </Field>
              </div>
            )}

            <Field label="First Name" htmlFor="firstName">
              <Input
                id="firstName"
                required
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </Field>
            <Field label="Last Name" htmlFor="lastName">
              <Input
                id="lastName"
                required
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </Field>

            <Field label="Phone" htmlFor="phone">
              <PhoneInput
                id="phone"
                required
                value={form.phone}
                onChange={(phone) => setForm((f) => ({ ...f, phone }))}
              />
            </Field>
            <Field label="Date of Joining" htmlFor="dateOfJoining">
              <Input
                id="dateOfJoining"
                type="date"
                required
                value={form.dateOfJoining}
                onChange={(e) => setForm((f) => ({ ...f, dateOfJoining: e.target.value }))}
              />
            </Field>

            <Field label="Department" htmlFor="departmentId">
              <Select
                id="departmentId"
                required
                value={form.departmentId}
                onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
              >
                <option value="" disabled>
                  Select a department
                </option>
                {departments?.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Designation" htmlFor="designation">
              <Input
                id="designation"
                required
                value={form.designation}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                placeholder="Software Engineer"
              />
            </Field>

            {!isEdit && (
              <Field label="Role" htmlFor="role">
                <Select
                  id="role"
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value as Exclude<Role, 'super_admin'> }))
                  }
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {isEdit && (
              <Field label="Employment Status" htmlFor="employmentStatus">
                <Select
                  id="employmentStatus"
                  value={form.employmentStatus}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, employmentStatus: e.target.value as EmploymentStatus }))
                  }
                >
                  {EMPLOYMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <div className="sm:col-span-2">
              <Field label="Manager (optional)" htmlFor="manager">
                <EmployeePicker value={manager} onChange={setManager} />
              </Field>
            </div>

            {formError && (
              <p className="text-sm text-danger sm:col-span-2" role="alert">
                {formError}
              </p>
            )}

            <div className="flex gap-3 sm:col-span-2">
              <Button type="submit" isLoading={mutation.isPending}>
                {isEdit ? 'Save Changes' : 'Create Employee'}
              </Button>
              <Link
                to={backTo}
                className="flex items-center px-4 text-sm text-text-dim hover:text-text"
              >
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      </Reveal>
    </div>
  );
}
