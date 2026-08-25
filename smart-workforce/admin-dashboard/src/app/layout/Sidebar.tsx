import { type ComponentType, type SVGProps } from 'react';
import { NavLink } from 'react-router-dom';
import { Logo } from '@/shared/ui/Logo';
import {
  AiInsightsIcon,
  AlertsIcon,
  AnalyticsIcon,
  AttendanceIcon,
  AuditIcon,
  CalendarIcon,
  DashboardIcon,
  DepartmentsIcon,
  EmployeesIcon,
  FaceIcon,
  LeaveIcon,
  LiveIcon,
  NotificationsIcon,
  OfficesIcon,
  PayrollIcon,
  PayslipsIcon,
  QrCodesIcon,
  SettingsIcon,
  ShiftsIcon,
  UsersRolesIcon,
} from '@/shared/ui/icons';
import { useUnreadNotificationCount } from '@/features/notifications/hooks/useNotifications';
import { useAuthStore } from '@/stores/authStore';
import type { Role } from '@/types/api';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  end: boolean;
  roles?: Role[];
  count?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  const user = useAuthStore((s) => s.user);
  const employee = useAuthStore((s) => s.employee);
  const { data: unreadCount } = useUnreadNotificationCount();

  const groups: NavGroup[] = [
    {
      title: 'Workforce',
      items: [
        { to: '/', label: 'Overview', icon: DashboardIcon, end: true },
        {
          to: '/employees',
          label: 'Employees',
          icon: EmployeesIcon,
          end: false,
          roles: ['super_admin', 'hr', 'manager'],
        },
        {
          to: '/departments',
          label: 'Departments',
          icon: DepartmentsIcon,
          end: false,
          roles: ['super_admin', 'hr'],
        },
      ],
    },
    {
      title: 'Time & Attendance',
      items: [
        {
          to: '/live',
          label: 'Live Attendance',
          icon: LiveIcon,
          end: false,
          roles: ['super_admin', 'hr', 'manager'],
        },
        {
          to: '/attendance',
          label: 'Attendance',
          icon: AttendanceIcon,
          end: false,
          roles: ['super_admin', 'hr', 'manager'],
        },
        { to: '/leaves', label: 'Leave', icon: LeaveIcon, end: false },
        {
          to: '/leave-calendar',
          label: 'Leave Calendar',
          icon: CalendarIcon,
          end: false,
          roles: ['super_admin', 'hr', 'manager'],
        },
        { to: '/shifts', label: 'Shifts', icon: ShiftsIcon, end: false, roles: ['super_admin', 'hr'] },
      ],
    },
    {
      title: 'Pay',
      items: [
        { to: '/payroll', label: 'Payroll', icon: PayrollIcon, end: false },
        { to: '/payslips', label: 'Payslips', icon: PayslipsIcon, end: false },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        {
          to: '/analytics',
          label: 'Analytics',
          icon: AnalyticsIcon,
          end: false,
          roles: ['super_admin', 'hr', 'manager'],
        },
        {
          to: '/ai-insights',
          label: 'AI Insights',
          icon: AiInsightsIcon,
          end: false,
          roles: ['super_admin', 'hr', 'manager'],
        },
        {
          to: '/alerts',
          label: 'Alerts Center',
          icon: AlertsIcon,
          end: false,
          roles: ['super_admin', 'hr', 'manager'],
        },
      ],
    },
    {
      title: 'System',
      items: [
        {
          to: '/notifications',
          label: 'Notifications',
          icon: NotificationsIcon,
          end: false,
          count: unreadCount,
        },
        { to: '/geofences', label: 'Offices', icon: OfficesIcon, end: false, roles: ['super_admin', 'hr'] },
        { to: '/qr-codes', label: 'QR Attendance', icon: QrCodesIcon, end: false, roles: ['super_admin', 'hr'] },
        { to: '/face', label: 'Face Management', icon: FaceIcon, end: false, roles: ['super_admin', 'hr'] },
        { to: '/audit-logs', label: 'Audit Logs', icon: AuditIcon, end: false, roles: ['super_admin'] },
        { to: '/users', label: 'Users & Roles', icon: UsersRolesIcon, end: false, roles: ['super_admin'] },
        { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false, roles: ['super_admin', 'hr'] },
      ],
    },
  ];

  const isVisible = (item: NavItem) => !item.roles || (role && item.roles.includes(role));
  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter(isVisible) }))
    .filter((g) => g.items.length > 0);

  const displayName = employee ? `${employee.firstName} ${employee.lastName}` : (user?.email ?? '');
  const initials = employee
    ? `${employee.firstName[0] ?? ''}${employee.lastName[0] ?? ''}`.toUpperCase()
    : (user?.email[0] ?? '?').toUpperCase();

  return (
    <aside className="bg-ink hidden w-[236px] shrink-0 flex-col gap-5 p-4 sm:flex">
      <div className="flex shrink-0 items-center gap-2.5 px-2">
        <Logo size={32} />
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-extrabold text-white">Office App</div>
          <div className="truncate text-[10px] font-medium text-white/40">
            AI Management System
          </div>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
        {visibleGroups.map((group) => (
          <div key={group.title} className="flex shrink-0 flex-col gap-0.5">
            <div className="px-3 pb-1.5 text-[9.5px] font-bold tracking-[0.08em] text-white/30 uppercase">
              {group.title}
            </div>
            {group.items.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}
          </div>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-2.5 border-t border-white/[0.08] px-1 pt-3.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent text-[11.5px] font-extrabold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-bold text-white">{displayName}</div>
          <div className="truncate text-[10.5px] font-medium text-white/42 capitalize">
            {role?.replace('_', ' ')}
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const ItemIcon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12.5px] font-semibold transition-colors ${
          isActive
            ? 'bg-accent text-white'
            : 'text-white/62 hover:bg-white/[0.06] hover:text-white'
        }`
      }
    >
      <span className="w-[17px] shrink-0 text-center">
        <ItemIcon className="mx-auto" />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {!!item.count && (
        <span className="rounded-pill bg-white/[0.14] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-white/85">
          {item.count > 9 ? '9+' : item.count}
        </span>
      )}
    </NavLink>
  );
}
