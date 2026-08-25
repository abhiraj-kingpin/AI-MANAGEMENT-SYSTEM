import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Reveal } from '@/shared/ui/Reveal';
import { InviteUserModal } from '@/features/users/components/InviteUserModal';
import { useConsoleUsers } from '@/features/users/hooks/useUsers';
import type { Role } from '@/types/api';

const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super Admin',
  hr: 'HR',
  manager: 'Manager',
  employee: 'Employee',
};

// Grounded in the actual requireRole(...) gates on each router — see
// employee/department/attendance/leave/payroll/shift/geofence/qr/face/
// audit/users/settings .routes.ts. Kept here as a single readable summary
// rather than introspected at runtime.
const SECTIONS: Array<{ label: string; roles: Role[] }> = [
  { label: 'Employees (manage)', roles: ['super_admin', 'hr'] },
  { label: 'Employees (own team)', roles: ['super_admin', 'hr', 'manager'] },
  { label: 'Departments (manage)', roles: ['super_admin', 'hr'] },
  { label: 'Attendance (review)', roles: ['super_admin', 'hr', 'manager'] },
  { label: 'Attendance (correct)', roles: ['super_admin', 'hr'] },
  { label: 'Leave (review)', roles: ['super_admin', 'hr', 'manager'] },
  { label: 'Payroll & Payslips', roles: ['super_admin', 'hr'] },
  { label: 'Shifts & Roster', roles: ['super_admin', 'hr'] },
  { label: 'Offices & Locations', roles: ['super_admin', 'hr'] },
  { label: 'QR Attendance', roles: ['super_admin', 'hr'] },
  { label: 'Face Management', roles: ['super_admin', 'hr'] },
  { label: 'Analytics & AI Insights', roles: ['super_admin', 'hr', 'manager'] },
  { label: 'Audit Logs', roles: ['super_admin'] },
  { label: 'Users & Roles', roles: ['super_admin'] },
  { label: 'Settings', roles: ['super_admin', 'hr'] },
];

const ALL_ROLES: Role[] = ['super_admin', 'hr', 'manager', 'employee'];

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function UsersRolesPage() {
  const [inviting, setInviting] = useState(false);
  const { data: users, isLoading, isError } = useConsoleUsers();

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex items-end justify-between">
        <div>
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            System
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Users &amp; Roles</h1>
        </div>
        <Button onClick={() => setInviting(true)}>Invite user</Button>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
        <Reveal index={1}>
          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-[15px] font-bold">
                Console users {users ? `· ${users.length}` : ''}
              </h2>
              <p className="mt-0.5 text-[11.5px] font-medium text-text-dim">Who can sign in to this console</p>
            </div>
            {isError ? (
              <p className="p-8 text-center text-sm text-danger">Couldn't load users. Try refreshing.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11.5px] tracking-wide text-text-dim uppercase">
                      <th className="px-5 py-3.5 font-bold">User</th>
                      <th className="px-5 py-3.5 font-bold">Role</th>
                      <th className="px-5 py-3.5 font-bold">Last active</th>
                      <th className="px-5 py-3.5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && !users ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-text-dim">
                          Loading…
                        </td>
                      </tr>
                    ) : !users || users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-text-dim">
                          No console users yet.
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-ink/[0.025]">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-text">{user.employeeName ?? user.email}</div>
                            <div className="text-[12px] text-text-dim">{user.email}</div>
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-text-dim">{ROLE_LABEL[user.role]}</td>
                          <td className="px-5 py-3.5 font-mono text-[12px] tabular-nums text-text-dim">
                            {formatDate(user.lastLoginAt)}
                          </td>
                          <td className="px-5 py-3.5">
                            <Chip tone={!user.isActive ? 'neutral' : user.accountClaimed ? 'success' : 'warning'}>
                              {!user.isActive ? 'Disabled' : user.accountClaimed ? 'Active' : 'Invited'}
                            </Chip>
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

        <Reveal index={2}>
          <Card className="p-5">
            <h2 className="text-[15px] font-bold">Role permissions</h2>
            <p className="mt-0.5 mb-4 text-[11.5px] font-medium text-text-dim">What each role can reach</p>
            <div className="flex flex-col gap-4">
              {ALL_ROLES.map((role) => (
                <div key={role} className="rounded-2xl border border-border p-3.5">
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="flex-1 text-[13px] font-extrabold">{ROLE_LABEL[role]}</span>
                    <span className="font-mono text-[11px] tabular-nums text-text-faint">
                      {SECTIONS.filter((s) => s.roles.includes(role)).length}/{SECTIONS.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SECTIONS.map((section) => {
                      const granted = section.roles.includes(role);
                      return (
                        <span
                          key={section.label}
                          className={`rounded-[7px] px-2 py-1 text-[10.5px] font-bold ${
                            granted ? 'bg-success/10 text-success' : 'bg-text-dim/8 text-text-faint line-through'
                          }`}
                        >
                          {section.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>
      </div>

      {inviting && <InviteUserModal onClose={() => setInviting(false)} />}
    </div>
  );
}
