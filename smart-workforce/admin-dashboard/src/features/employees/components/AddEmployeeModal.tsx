import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Field, Input, Select } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { PhoneInput } from '@/shared/ui/PhoneInput';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { EmployeePicker, type EmployeeOption } from '@/features/employees/components/EmployeePicker';
import { useCreateEmployee } from '@/features/employees/hooks/useEmployeeMutations';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { useGeofences } from '@/features/geofences/hooks/useGeofences';
import { useAssignShift } from '@/features/shifts/hooks/useShiftMutations';
import { useShifts } from '@/features/shifts/hooks/useShifts';
import { pushToast } from '@/stores/toastStore';
import type { Role } from '@/types/api';

const ASSIGNABLE_ROLES: Exclude<Role, 'super_admin'>[] = ['hr', 'manager', 'employee'];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddEmployeeModal({ onClose }: { onClose: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Exclude<Role, 'super_admin'>>('employee');
  const [designation, setDesignation] = useState('');
  const [manager, setManager] = useState<EmployeeOption | null>(null);
  const [departmentId, setDepartmentId] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState(today());
  const [shiftId, setShiftId] = useState('');
  const [primaryOfficeId, setPrimaryOfficeId] = useState('');
  const [requireFace, setRequireFace] = useState(true);
  const [sendWelcome, setSendWelcome] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: departments, isLoading: departmentsLoading } = useDepartments();
  const { data: shifts } = useShifts(false);
  const { data: offices } = useGeofences();

  const createMutation = useCreateEmployee();
  const assignShiftMutation = useAssignShift();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!departmentId) {
      setError('Select a department.');
      return;
    }

    createMutation.mutate(
      {
        email,
        role,
        firstName,
        lastName,
        phone,
        departmentId,
        designation,
        managerId: manager?.id,
        primaryOfficeId: primaryOfficeId || undefined,
        dateOfJoining,
      },
      {
        onSuccess: (employee) => {
          // Effective-from must be today or later (backend rejects a past
          // date), regardless of the joining date entered above.
          if (shiftId) {
            assignShiftMutation.mutate({ employeeId: employee.id, shiftId, effectiveFrom: today() });
          }
          pushToast(`${employee.firstName} ${employee.lastName} invited`);
          onClose();
        },
        onError: (err) => setError(apiErrorMessage(err)),
      },
    );
  };

  return (
    <Modal title="Add employee" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-[12px] leading-relaxed text-text-dim">
          The work email you enter here is the only address that can activate the mobile app. The
          account stays inactive until the employee signs in and enrols.
        </p>

        <p className="text-[10.5px] font-bold tracking-[0.06em] text-text-faint uppercase">Identity &amp; contact</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" htmlFor="addFirstName">
            <Input id="addFirstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Last name" htmlFor="addLastName">
            <Input id="addLastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
        </div>
        <Field label="Work email" htmlFor="addEmail">
          <Input id="addEmail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile" htmlFor="addPhone">
            <PhoneInput id="addPhone" required value={phone} onChange={setPhone} />
          </Field>
          <Field label="Employee ID" htmlFor="addEmployeeId">
            <Input id="addEmployeeId" disabled value="Auto-generated" className="text-text-faint" />
          </Field>
        </div>

        <p className="mt-1 text-[10.5px] font-bold tracking-[0.06em] text-text-faint uppercase">Role</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Designation" htmlFor="addDesignation">
            <Input id="addDesignation" required value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Product Designer" />
          </Field>
          <Field label="Reporting manager (optional)" htmlFor="addManager">
            <EmployeePicker value={manager} onChange={setManager} />
          </Field>
          <Field label="Department" htmlFor="addDepartment">
            <Select id="addDepartment" required value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="" disabled>
                {departmentsLoading ? 'Loading…' : 'Select a department'}
              </option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Console role" htmlFor="addRole">
            <Select id="addRole" value={role} onChange={(e) => setRole(e.target.value as Exclude<Role, 'super_admin'>)}>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Joining date" htmlFor="addJoining">
          <Input id="addJoining" type="date" required value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} />
        </Field>

        <p className="mt-1 text-[10.5px] font-bold tracking-[0.06em] text-text-faint uppercase">Attendance setup</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assigned shift (optional)" htmlFor="addShift">
            <Select id="addShift" value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
              <option value="">No shift yet</option>
              {shifts?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.startTime}–{s.endTime})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Primary site (optional)" htmlFor="addOffice">
            <Select id="addOffice" value={primaryOfficeId} onChange={(e) => setPrimaryOfficeId(e.target.value)}>
              <option value="">Unassigned</option>
              {offices?.filter((o) => o.type === 'building').map((o) => (
                <option key={o.id} value={o.id}>
                  {o.branchName}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="rounded-2xl border border-border p-3.5">
          <button
            type="button"
            onClick={() => setRequireFace((v) => !v)}
            className="flex w-full items-center gap-3 py-1.5 text-left"
          >
            <span className="flex-1">
              <span className="block text-[12.5px] font-bold">Require face enrolment</span>
              <span className="block text-[11px] text-text-dim">Prompted on first mobile sign-in</span>
            </span>
            <span className={`relative h-5.5 w-10 shrink-0 rounded-full transition-colors ${requireFace ? 'bg-accent' : 'bg-text-dim/25'}`}>
              <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${requireFace ? 'translate-x-[19px]' : 'translate-x-0.5'}`} />
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSendWelcome((v) => !v)}
            className="flex w-full items-center gap-3 border-t border-border pt-2.5 pb-1 text-left"
          >
            <span className="flex-1">
              <span className="block text-[12.5px] font-bold">Send welcome guide</span>
              <span className="block text-[11px] text-text-dim">Included with the activation email</span>
            </span>
            <span className={`relative h-5.5 w-10 shrink-0 rounded-full transition-colors ${sendWelcome ? 'bg-accent' : 'bg-text-dim/25'}`}>
              <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${sendWelcome ? 'translate-x-[19px]' : 'translate-x-0.5'}`} />
            </span>
          </button>
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-2xl bg-accent px-5 py-3 text-[13px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(20,48,79,0.55)] disabled:opacity-60"
          >
            {createMutation.isPending ? 'Adding…' : 'Add & send invite'}
          </button>
          <button type="button" onClick={onClose} className="rounded-2xl bg-card-subtle px-4.5 py-3 text-[13px] font-bold text-text-dim">
            Cancel
          </button>
          <Link to="/departments" className="ml-auto text-[11.5px] font-semibold text-accent-light hover:underline">
            Manage departments
          </Link>
        </div>
      </form>
    </Modal>
  );
}
