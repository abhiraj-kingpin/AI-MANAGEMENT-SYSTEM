import { useNavigate } from 'react-router-dom';
import { NotificationsIcon, SearchIcon } from '@/shared/ui/icons';
import { useUnreadNotificationCount } from '@/features/notifications/hooks/useNotifications';

export function Topbar() {
  const navigate = useNavigate();
  const { data: unreadCount } = useUnreadNotificationCount();

  return (
    <header className="relative flex items-center justify-between border-b border-border px-7 py-4">
      <div className="flex w-[300px] items-center gap-2 rounded-pill border border-border bg-white/[0.03] px-4 py-2.5 text-[13.5px] text-text-dim">
        <SearchIcon />
        Search…
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="relative grid h-9 w-9 place-items-center rounded-full text-text-dim hover:bg-white/[0.06] hover:text-text"
          aria-label={unreadCount ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        >
          <NotificationsIcon />
          {!!unreadCount && unreadCount > 0 && (
            <span className="absolute top-1 right-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9.5px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
