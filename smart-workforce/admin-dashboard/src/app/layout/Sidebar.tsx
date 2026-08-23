import { type ComponentType, type SVGProps } from 'react';
import { NavLink } from 'react-router-dom';
import { Logo } from '@/shared/ui/Logo';
import {
  AiInsightsIcon,
  AttendanceIcon,
  DashboardIcon,
  DepartmentsIcon,
  EmployeesIcon,
  GeofencesIcon,
  LeaveIcon,
  NotificationsIcon,
  PayrollIcon,
  QrCodesIcon,
  ShiftsIcon,
} from '@/shared/ui/icons';
import { useAuthStore } from '@/stores/authStore';
import type { Role } from '@/types/api';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  end: boolean;
  roles?: Role[];
}

const liveItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  {
    to: '/ai-insights',
    label: 'AI Insights',
    icon: AiInsightsIcon,
    end: false,
    roles: ['super_admin', 'hr', 'manager'],
  },
  {
    to: '/employees',
    label: 'Employees',
    icon: EmployeesIcon,
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
  { to: '/shifts', label: 'Shifts', icon: ShiftsIcon, end: false },
  { to: '/payroll', label: 'Payroll', icon: PayrollIcon, end: false },
  { to: '/notifications', label: 'Notifications', icon: NotificationsIcon, end: false },
];

const configItems: NavItem[] = [
  {
    to: '/departments',
    label: 'Departments',
    icon: DepartmentsIcon,
    end: false,
    roles: ['super_admin', 'hr'],
  },
  {
    to: '/geofences',
    label: 'Geofences',
    icon: GeofencesIcon,
    end: false,
    roles: ['super_admin', 'hr'],
  },
  {
    to: '/qr-codes',
    label: 'QR Codes',
    icon: QrCodesIcon,
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
    <aside className="bg-ink hidden w-[236px] shrink-0 flex-col gap-6 p-4 sm:flex">
      <div className="flex items-center gap-2.5 px-2">
        <Logo size={32} />
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-extrabold text-white">Office App</div>
          <div className="truncate text-[10px] font-medium text-white/40">
            AI Management System
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {visibleLiveItems.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}

        {visibleConfigItems.length > 0 && (
          <>
            <div className="mt-2.5 mb-1 px-3 text-[9.5px] font-bold tracking-[0.08em] text-white/30 uppercase">
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
      {item.label}
    </NavLink>
  );
}
