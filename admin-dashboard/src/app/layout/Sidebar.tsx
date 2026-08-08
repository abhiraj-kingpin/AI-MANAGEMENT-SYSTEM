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
];

// Not wired up yet — the backend has full APIs for all of these (see
// backend/README.md#api-reference), but no admin-dashboard screen exists
// for them yet. Shown, not hidden, so the nav reflects where the product is
// going — but dimmed and inert rather than pretending they work.
const comingSoonItems = [
  { label: 'Shifts', icon: '◫' },
  { label: 'Payroll', icon: '◈' },
  { label: 'Notifications', icon: '◎' },
];

const comingSoonConfig = [
  { label: 'Geofences', icon: '◍' },
  { label: 'QR Codes', icon: '▣' },
];

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  const visibleLiveItems = liveItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );

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
          <NavLink
            key={item.to}
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
        ))}

        {comingSoonItems.map((item) => (
          <ComingSoonNavItem key={item.label} {...item} />
        ))}

        <div className="mt-2.5 mb-1 px-3 font-mono text-[10.5px] tracking-[0.12em] text-text-faint uppercase">
          Configuration
        </div>
        {comingSoonConfig.map((item) => (
          <ComingSoonNavItem key={item.label} {...item} />
        ))}
      </nav>
    </aside>
  );
}

function ComingSoonNavItem({ label, icon }: { label: string; icon: string }) {
  return (
    <div
      className="flex cursor-not-allowed items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold text-text-dim/40"
      title={`${label} — not built yet`}
    >
      <span className="w-[18px] text-center text-[15px]">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="rounded-pill bg-white/5 px-1.5 py-0.5 font-mono text-[9.5px] tracking-wide text-text-dim/70 uppercase">
        Soon
      </span>
    </div>
  );
}
