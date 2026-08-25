import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </Icon>
  );
}

export function AiInsightsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l1.9 4.3L18 9l-4.1 1.7L12 15l-1.9-4.3L6 9l4.1-1.7L12 3z" />
      <path d="M19 15l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9.9-2z" />
    </Icon>
  );
}

export function EmployeesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
      <path d="M17 8l3 3 3-3" />
    </Icon>
  );
}

export function AttendanceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

export function LeaveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
    </Icon>
  );
}

export function ShiftsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="18" rx="1" />
      <rect x="14" y="3" width="7" height="10" rx="1" />
    </Icon>
  );
}

export function PayrollIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Icon>
  );
}

export function NotificationsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 01-3.4 0" />
    </Icon>
  );
}

export function DepartmentsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 21V7l8-4 8 4v14" />
      <path d="M4 21h16M9 21v-6h6v6M9 11h.01M15 11h.01M12 11h.01" />
    </Icon>
  );
}

export function GeofencesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" />
    </Icon>
  );
}

export function QrCodesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon width={16} height={16} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon width={16} height={16} {...props}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

export function LiveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 7v5l3.5 2" />
      <circle cx="12" cy="12" r="8.5" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v3M16 3v3" />
    </Icon>
  );
}

export function PayslipsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 4h14v16l-3.5-2-3.5 2-3.5-2L5 20z" />
      <path d="M9 9h6M9 13h4" />
    </Icon>
  );
}

export function AnalyticsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20h16" />
      <path d="M7 20v-6M12 20V7M17 20v-9" />
    </Icon>
  );
}

export function AlertsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 21 20H3z" />
      <path d="M12 10v4M12 17h.01" />
    </Icon>
  );
}

export function FaceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <path d="M9.5 15c1.5 1.2 3.5 1.2 5 0M9.5 11h.01M14.5 11h.01" />
    </Icon>
  );
}

export function AuditIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3.5h9l4 4v13H6z" />
      <path d="M9 11h7M9 15h5" />
    </Icon>
  );
}

export function UsersRolesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c.9-3.4 3.2-4.8 6-4.8s5.1 1.4 6 4.8M16.5 6.5a2.6 2.6 0 0 1 0 5M18.5 20c-.3-1.7-.9-3-1.8-3.9" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.6M12 18.9v2.6M5 5l1.8 1.8M17.2 17.2 19 19M2.5 12h2.6M18.9 12h2.6M5 19l1.8-1.8M17.2 6.8 19 5" />
    </Icon>
  );
}

export function OfficesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 21V7l8-4 8 4v14" />
      <path d="M4 21h16M9 21v-6h6v6M9 11h.01M15 11h.01M12 11h.01" />
    </Icon>
  );
}

export function ImportIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 20h14" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function ExportIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 20h14" />
    </Icon>
  );
}
