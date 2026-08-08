import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import {
  EmployeePicker,
  type EmployeeOption,
} from '@/features/employees/components/EmployeePicker';
import { useCreateSalary, useUpdateSalary } from '@/features/payroll/hooks/useSalaryMutations';
import type { Salary } from '@/types/api';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** `POST /salaries` / `PATCH /salaries/:employeeId` — one form for both. The employee picker only appears on create; an existing salary's `employeeId` can't be changed (there's no route for it — a new employee gets a new salary record instead). */
export function SalaryFormModal({ salary, onClose }: { salary?: Salary; onClose: () => void }) {
  const [employee, setEmployee] = useState<EmployeeOption | null>(null);
  const [baseSalary, setBaseSalary] = useState(String(salary?.baseSalary ?? ''));
  const [currency, setCurrency] = useState(salary?.currency ?? 'INR');
  const [effectiveFrom, setEffectiveFrom] = useState(salary?.effectiveFrom.slice(0, 10) ?? today());
  const [hra, setHra] = useState(String(salary?.allowances.hra ?? ''));
  const [transport, setTransport] = useState(String(salary?.allowances.transport ?? ''));
  const [medical, setMedical] = useState(String(salary?.allowances.medical ?? ''));
  const [otherAllowance, setOtherAllowance] = useState(String(salary?.allowances.other ?? ''));
  const [pf, setPf] = useState(String(salary?.deductions.pf ?? ''));
  const [tax, setTax] = useState(String(salary?.deductions.tax ?? ''));
  const [otherDeduction, setOtherDeduction] = useState(String(salary?.deductions.other ?? ''));
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateSalary();
  const updateMutation = useUpdateSalary();
  const mutation = salary ? updateMutation : createMutation;

  const toNumber = (value: string): number | undefined =>
    value.trim() === '' ? undefined : Number(value);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const allowances = {
      hra: toNumber(hra),
      transport: toNumber(transport),
      medical: toNumber(medical),
      other: toNumber(otherAllowance),
    };
    const deductions = { pf: toNumber(pf), tax: toNumber(tax), other: toNumber(otherDeduction) };
    const onSettled = {
      onSuccess: onClose,
      onError: (err: unknown) => setError(apiErrorMessage(err)),
    };

    if (salary) {
      updateMutation.mutate(
        {
          employeeId: salary.employeeId,
          input: {
            baseSalary: Number(baseSalary),
            allowances,
            deductions,
            currency,
            effectiveFrom,
          },
        },
        onSettled,
      );
      return;
    }

    if (!employee) {
      setError('Select an employee first.');
      return;
    }
    createMutation.mutate(
      {
        employeeId: employee.id,
        baseSalary: Number(baseSalary),
        allowances,
        deductions,
        currency,
        effectiveFrom,
      },
      onSettled,
    );
  };

  return (
    <Modal title={salary ? 'Edit Salary' : 'New Salary'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!salary && (
          <Field label="Employee" htmlFor="salaryEmployee">
            <EmployeePicker value={employee} onChange={setEmployee} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Base Salary" htmlFor="salaryBase">
            <Input
              id="salaryBase"
              type="number"
              min={0}
              required
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
            />
          </Field>
          <Field label="Currency" htmlFor="salaryCurrency">
            <Input
              id="salaryCurrency"
              required
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            />
          </Field>
        </div>
        <Field label="Effective From" htmlFor="salaryFrom">
          <Input
            id="salaryFrom"
            type="date"
            required
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </Field>

        <p className="text-[12.5px] font-bold text-text-dim">Allowances</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="HRA" htmlFor="salaryHra">
            <Input
              id="salaryHra"
              type="number"
              min={0}
              value={hra}
              onChange={(e) => setHra(e.target.value)}
            />
          </Field>
          <Field label="Transport" htmlFor="salaryTransport">
            <Input
              id="salaryTransport"
              type="number"
              min={0}
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
            />
          </Field>
          <Field label="Medical" htmlFor="salaryMedical">
            <Input
              id="salaryMedical"
              type="number"
              min={0}
              value={medical}
              onChange={(e) => setMedical(e.target.value)}
            />
          </Field>
          <Field label="Other" htmlFor="salaryOtherAllowance">
            <Input
              id="salaryOtherAllowance"
              type="number"
              min={0}
              value={otherAllowance}
              onChange={(e) => setOtherAllowance(e.target.value)}
            />
          </Field>
        </div>

        <p className="text-[12.5px] font-bold text-text-dim">Deductions</p>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Provident Fund" htmlFor="salaryPf">
            <Input
              id="salaryPf"
              type="number"
              min={0}
              value={pf}
              onChange={(e) => setPf(e.target.value)}
            />
          </Field>
          <Field label="Tax" htmlFor="salaryTax">
            <Input
              id="salaryTax"
              type="number"
              min={0}
              value={tax}
              onChange={(e) => setTax(e.target.value)}
            />
          </Field>
          <Field label="Other" htmlFor="salaryOtherDeduction">
            <Input
              id="salaryOtherDeduction"
              type="number"
              min={0}
              value={otherDeduction}
              onChange={(e) => setOtherDeduction(e.target.value)}
            />
          </Field>
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" isLoading={mutation.isPending}>
            {salary ? 'Save Changes' : 'Create Salary'}
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
