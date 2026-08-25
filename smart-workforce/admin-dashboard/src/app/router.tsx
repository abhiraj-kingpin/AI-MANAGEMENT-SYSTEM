import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { AiInsightsPage } from '@/features/analytics/pages/AiInsightsPage';
import { AnalyticsPage } from '@/features/analytics/pages/AnalyticsPage';
import { AlertsCenterPage } from '@/features/alerts/pages/AlertsCenterPage';
import { AttendancePage } from '@/features/attendance/pages/AttendancePage';
import { AuditLogsPage } from '@/features/audit/pages/AuditLogsPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { DepartmentsPage } from '@/features/departments/pages/DepartmentsPage';
import { EmployeeDetailPage } from '@/features/employees/pages/EmployeeDetailPage';
import { EmployeeFormPage } from '@/features/employees/pages/EmployeeFormPage';
import { EmployeesListPage } from '@/features/employees/pages/EmployeesListPage';
import { FaceManagementPage } from '@/features/face/pages/FaceManagementPage';
import { GeofencesPage } from '@/features/geofences/pages/GeofencesPage';
import { LeaveCalendarPage } from '@/features/leaves/pages/LeaveCalendarPage';
import { LeavePage } from '@/features/leaves/pages/LeavePage';
import { LiveAttendancePage } from '@/features/live/pages/LiveAttendancePage';
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage';
import { PayrollPage } from '@/features/payroll/pages/PayrollPage';
import { PayslipsPage } from '@/features/payroll/pages/PayslipsPage';
import { QrCodesPage } from '@/features/qr/pages/QrCodesPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { ShiftsPage } from '@/features/shifts/pages/ShiftsPage';
import { UsersRolesPage } from '@/features/users/pages/UsersRolesPage';

export const router = createBrowserRouter([
  { path: '/login', element: <Navigate to="/" replace /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'live', element: <LiveAttendancePage /> },
          { path: 'ai-insights', element: <AiInsightsPage /> },
          { path: 'analytics', element: <AnalyticsPage /> },
          { path: 'alerts', element: <AlertsCenterPage /> },
          { path: 'employees', element: <EmployeesListPage /> },
          { path: 'employees/new', element: <EmployeeFormPage /> },
          { path: 'employees/:id', element: <EmployeeDetailPage /> },
          { path: 'employees/:id/edit', element: <EmployeeFormPage /> },
          { path: 'departments', element: <DepartmentsPage /> },
          { path: 'attendance', element: <AttendancePage /> },
          { path: 'leaves', element: <LeavePage /> },
          { path: 'leave-calendar', element: <LeaveCalendarPage /> },
          { path: 'shifts', element: <ShiftsPage /> },
          { path: 'payroll', element: <PayrollPage /> },
          { path: 'payslips', element: <PayslipsPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'geofences', element: <GeofencesPage /> },
          { path: 'qr-codes', element: <QrCodesPage /> },
          { path: 'face', element: <FaceManagementPage /> },
          { path: 'audit-logs', element: <AuditLogsPage /> },
          { path: 'users', element: <UsersRolesPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
