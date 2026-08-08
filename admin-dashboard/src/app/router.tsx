import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { AttendancePage } from '@/features/attendance/pages/AttendancePage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { EmployeeDetailPage } from '@/features/employees/pages/EmployeeDetailPage';
import { EmployeeFormPage } from '@/features/employees/pages/EmployeeFormPage';
import { EmployeesListPage } from '@/features/employees/pages/EmployeesListPage';
import { GeofencesPage } from '@/features/geofences/pages/GeofencesPage';
import { LeavePage } from '@/features/leaves/pages/LeavePage';
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage';
import { PayrollPage } from '@/features/payroll/pages/PayrollPage';
import { QrCodesPage } from '@/features/qr/pages/QrCodesPage';
import { ShiftsPage } from '@/features/shifts/pages/ShiftsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'employees', element: <EmployeesListPage /> },
          { path: 'employees/new', element: <EmployeeFormPage /> },
          { path: 'employees/:id', element: <EmployeeDetailPage /> },
          { path: 'employees/:id/edit', element: <EmployeeFormPage /> },
          { path: 'attendance', element: <AttendancePage /> },
          { path: 'leaves', element: <LeavePage /> },
          { path: 'shifts', element: <ShiftsPage /> },
          { path: 'payroll', element: <PayrollPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'geofences', element: <GeofencesPage /> },
          { path: 'qr-codes', element: <QrCodesPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
