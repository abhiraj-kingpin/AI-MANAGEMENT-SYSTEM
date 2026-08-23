import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/stores/authStore';
import type { AuthUser, Role } from '@/types/api';

function renderAs(role: Role) {
  const user: AuthUser = { id: 'u1', email: `${role}@acme.com`, role };
  useAuthStore.getState().setAuth({ accessToken: 't', user });
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe('Sidebar role-gating', () => {
  const initialState = useAuthStore.getState();
  afterEach(() => useAuthStore.setState(initialState, true));

  it('shows a plain employee only the self-service items, and no Configuration section', () => {
    renderAs('employee');

    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Leave/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Shifts/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Payroll/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Notifications/ })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /AI Insights/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Employees/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Attendance/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Geofences/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /QR Codes/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Configuration')).not.toBeInTheDocument();
  });

  it('shows a Manager the team-scoped views but not HR/Admin-only configuration screens', () => {
    renderAs('manager');

    expect(screen.getByRole('link', { name: /AI Insights/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Employees/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Attendance/ })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /Geofences/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /QR Codes/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Configuration')).not.toBeInTheDocument();
  });

  it('shows HR every nav item, including the Configuration section', () => {
    renderAs('hr');

    expect(screen.getByRole('link', { name: /AI Insights/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Employees/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Attendance/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Geofences/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /QR Codes/ })).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
  });

  it('shows Super Admin the same full set as HR', () => {
    renderAs('super_admin');

    expect(screen.getByRole('link', { name: /Geofences/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /QR Codes/ })).toBeInTheDocument();
  });
});
