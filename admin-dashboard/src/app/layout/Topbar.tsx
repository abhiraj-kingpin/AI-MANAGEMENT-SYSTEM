import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { logout as logoutRequest } from '@/features/auth/api/authApi';

export function Topbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const employee = useAuthStore((s) => s.employee);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  const initials = employee
    ? `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()
    : (user?.email[0] ?? '?').toUpperCase();

  return (
    <header className="relative flex items-center justify-between border-b border-border px-7 py-4">
      <div className="flex w-[300px] items-center gap-2 rounded-pill border border-border bg-white/[0.03] px-4 py-2.5 text-[13.5px] text-text-dim">
        <span aria-hidden="true">🔍</span>
        Search…
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden text-sm text-text-dim sm:inline">{user?.email}</span>
        <div
          className="grid h-[34px] w-[34px] place-items-center rounded-full bg-gradient-to-br from-accent to-accent-light text-[12.5px] font-extrabold"
          title={user?.email}
        >
          {initials}
        </div>
        <Button variant="ghost" onClick={handleLogout} className="px-4 py-2 text-[13px]">
          Sign out
        </Button>
      </div>
    </header>
  );
}
