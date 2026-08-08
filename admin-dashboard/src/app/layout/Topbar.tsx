import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { logout as logoutRequest } from '@/features/auth/api/authApi';
import { useUnreadNotificationCount } from '@/features/notifications/hooks/useNotifications';

export function Topbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const employee = useAuthStore((s) => s.employee);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { data: unreadCount } = useUnreadNotificationCount();

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
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="relative grid h-9 w-9 place-items-center rounded-full text-text-dim hover:bg-white/[0.06] hover:text-text"
          aria-label={unreadCount ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        >
          <span aria-hidden="true">🔔</span>
          {!!unreadCount && unreadCount > 0 && (
            <span className="absolute top-1 right-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9.5px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
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
