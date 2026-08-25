import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/stores/authStore';
import type { AuthUser, Role } from '@/types/api';

// Sidebar shows an unread-count badge on Notifications (useUnreadNotificationCount)
// — give it a QueryClient and a resolved API response rather than letting a
// real axios call fire in a unit test.
vi.mock('@/features/notifications/api/notificationsApi', () => ({
  fetchMyNotifications: vi.fn(() =>
    Promise.resolve({ items: [], page: 1, limit: 1, total: 0, pages: 1 }),
  ),
}));

function renderAs(role: Role) {
  const user: AuthUser = { id: 'u1', email: `${role}@acme.com`, role };
  useAuthStore.getState().setAuth({ accessToken: 't', user });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Sidebar role-gating', () => {
  const initialState = useAuthStore.getState();
  afterEach(() => useAuthStore.setState(initialState, true));

  it('shows a plain employee only the self-service items, and no manager/HR-only screens', () => {
    renderAs('employee');

    expect(screen.getByRole('link', { name: /Overview/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Leave$/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Payroll/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Payslips/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Notifications/ })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /AI Insights/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Employees/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Departments/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Attendance/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Shifts/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Offices/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Users & Roles/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Audit Logs/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Intelligence')).not.toBeInTheDocument();
  });

  it('shows a Manager the team-scoped views but not HR/Admin-only configuration screens', () => {
    renderAs('manager');

    expect(screen.getByRole('link', { name: /Employees/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Live Attendance/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Attendance$/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /AI Insights/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Analytics/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Alerts Center/ })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /Departments/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Shifts/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Offices/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /QR Attendance/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Users & Roles/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Audit Logs/ })).not.toBeInTheDocument();
  });

  it('shows HR every nav item except super-admin-only screens', () => {
    renderAs('hr');

    expect(screen.getByRole('link', { name: /Departments/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Shifts/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Offices/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /QR Attendance/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Face Management/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Settings/ })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /Audit Logs/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Users & Roles/ })).not.toBeInTheDocument();
  });

  it('shows Super Admin the full set, including Audit Logs and Users & Roles', () => {
    renderAs('super_admin');

    expect(screen.getByRole('link', { name: /Offices/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /QR Attendance/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Audit Logs/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Users & Roles/ })).toBeInTheDocument();
  });
});
