import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import {
  EmployeePicker,
  type EmployeeOption,
} from '@/features/employees/components/EmployeePicker';
import {
  useCreateDepartment,
  useUpdateDepartment,
} from '@/features/departments/hooks/useDepartmentMutations';
import type { Department } from '@/types/api';

export function DepartmentFormModal({
  department,
  onClose,
}: {
  department?: Department;
  onClose: () => void;
}) {
  const [name, setName] = useState(department?.name ?? '');
  const [code, setCode] = useState(department?.code ?? '');
  const [head, setHead] = useState<EmployeeOption | null>(
    department?.headOfDepartment
      ? {
          id: department.headOfDepartment.id,
          label: `${department.headOfDepartment.firstName} ${department.headOfDepartment.lastName} (${department.headOfDepartment.employeeCode})`,
        }
      : null,
  );
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const mutation = department ? updateMutation : createMutation;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !code.trim()) {
      setError('Name and code are both required.');
      return;
    }
    const onSettled = {
      onSuccess: onClose,
      onError: (err: unknown) => setError(apiErrorMessage(err)),
    };
    if (department) {
      updateMutation.mutate(
        { id: department.id, input: { name, code, headOfDepartment: head?.id ?? null } },
        onSettled,
      );
    } else {
      createMutation.mutate({ name, code, headOfDepartment: head?.id }, onSettled);
    }
  };

  return (
    <Modal title={department ? 'Edit Department' : 'New Department'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Department Name" htmlFor="deptName">
          <Input
            id="deptName"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Engineering"
          />
        </Field>
        <Field label="Code" htmlFor="deptCode">
          <Input
            id="deptCode"
            required
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ENG"
          />
        </Field>
        <p className="-mt-2 text-[12px] text-text-faint">
          Prefixes every employee code created in this department, e.g. {code || 'ENG'}-0001.
        </p>
        <Field label="Head of Department (optional)" htmlFor="deptHead">
          <EmployeePicker value={head} onChange={setHead} />
        </Field>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" isLoading={mutation.isPending}>
            {department ? 'Save Changes' : 'Create Department'}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 text-sm text-text-dim hover:text-text"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
