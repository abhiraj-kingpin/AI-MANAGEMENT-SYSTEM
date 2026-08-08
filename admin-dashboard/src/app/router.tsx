import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { AttendancePage } from '@/features/attendance/pages/AttendancePage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { EmployeeDetailPage } from '@/features/employees/pages/EmployeeDetailPage';
import { EmployeeFormPage } from '@/features/employees/pages/EmployeeFormPage';
import { EmployeesListPage } from '@/features/employees/pages/EmployeesListPage';
import { LeavePage } from '@/features/leaves/pages/LeavePage';
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
          // Payroll, Geofence, QR, and Notifications routes are added
          // phase by phase — see
          // docs/architecture/05-folder-structure.md for the target layout.
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
