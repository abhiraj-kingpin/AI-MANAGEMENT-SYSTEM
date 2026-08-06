import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          // Employees, Attendance, Leaves, Shifts, Payroll, Geofence, QR,
          // Notifications, and Analytics routes are added phase by phase —
          // see docs/architecture/05-folder-structure.md for the target feature layout.
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
