import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { Role } from '@/types/api';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end: boolean;
  roles?: Role[];
}

const liveItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '◆', end: true },
  // GET /employees is Super Admin/HR/Manager-only server-side — hidden for a
  // plain employee rather than shown and then 403ing (see EmployeesListPage's
  // error state for what happens if the backend ever disagrees with this).
  {
    to: '/employees',
    label: 'Employees',
    icon: '◇',
    end: false,
    roles: ['super_admin', 'hr', 'manager'],
  },
  // GET /attendance (the report this screen reads) is Super Admin/HR/Manager
  // only server-side too — same reasoning as Employees above.
  {
    to: '/attendance',
    label: 'Attendance',
    icon: '◷',
    end: false,
    roles: ['super_admin', 'hr', 'manager'],
  },
  // GET /leaves/me, /leaves/balance, POST /leaves are open to every role —
  // unlike Employees/Attendance, this screen isn't role-gated: an `employee`
  // sees only the self-service section, while the review queue inside the
  // same page is itself gated by role (see LeavePage's `canReview`).
  { to: '/leaves', label: 'Leave', icon: '▤', end: false },
  // Same shape as Leave: GET /shifts/me is open to every role (a "My Shift"
  // card), while shift definitions/assignment inside the same page are
  // gated to Super Admin/HR (see ShiftsPage's `canManage`).
  { to: '/shifts', label: 'Shifts', icon: '◫', end: false },
  // Same shape again: GET /payslips/me is open to every role (a "My
  // Payslips" section), while salaries and the HR payslip queue inside the
  // same page are gated to Super Admin/HR (see PayrollPage's `canManage`).
  { to: '/payroll', label: 'Payroll', icon: '◈', end: false },
  // GET /notifications/me is every role's own feed; only the Broadcast
  // button inside the page is gated to Super Admin/HR.
  { to: '/notifications', label: 'Notifications', icon: '◎', end: false },
];

// Setup/configuration screens, kept visually separate from the day-to-day
// modules above. Both are Super Admin/HR only, full stop — unlike
// Leave/Shifts/Payroll/Notifications there's no self-service half here (an
// employee checks in *against* a geofence/QR code, they never manage one),
// so the nav item itself is hidden rather than showing a page that's just
// the role-gated section with nothing above it.
const configItems: NavItem[] = [
  {
    to: '/geofences',
    label: 'Geofences',
    icon: '◍',
    end: false,
    roles: ['super_admin', 'hr'],
  },
  {
    to: '/qr-codes',
    label: 'QR Codes',
    icon: '▣',
    end: false,
    roles: ['super_admin', 'hr'],
  },
];

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  const isVisible = (item: NavItem) => !item.roles || (role && item.roles.includes(role));
  const visibleLiveItems = liveItems.filter(isVisible);
  const visibleConfigItems = configItems.filter(isVisible);

  return (
    <aside className="hidden w-[248px] shrink-0 flex-col gap-6 border-r border-border bg-white/[0.015] p-4 sm:flex">
      <div className="flex items-center gap-2.5 px-2">
        <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-accent to-accent-light text-[13px] font-extrabold">
          AI
        </div>
        <span className="truncate text-[15px] font-extrabold">AI Management System</span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {visibleLiveItems.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}

        {visibleConfigItems.length > 0 && (
          <>
            <div className="mt-2.5 mb-1 px-3 font-mono text-[10.5px] tracking-[0.12em] text-text-faint uppercase">
              Configuration
            </div>
            {visibleConfigItems.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-colors ${
          isActive
            ? 'bg-gradient-to-r from-accent/20 to-accent/5 text-white before:absolute before:-left-4 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-accent before:to-accent-light before:shadow-[0_0_12px_1px_rgba(111,143,255,0.7)]'
            : 'text-text-dim hover:bg-white/[0.04] hover:text-text'
        }`
      }
    >
      <span className="w-[18px] text-center text-[15px]">{item.icon}</span>
      {item.label}
    </NavLink>
  );
}
