import { useNavigate } from 'react-router-dom';
import { NotificationsIcon, SearchIcon } from '@/shared/ui/icons';
import { useUnreadNotificationCount } from '@/features/notifications/hooks/useNotifications';
import { useSearchStore } from '@/stores/searchStore';

export function Topbar() {
  const navigate = useNavigate();
  const { data: unreadCount } = useUnreadNotificationCount();
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);

  return (
    <header className="relative flex items-center justify-between border-b border-border bg-[rgba(244,244,247,0.92)] px-7 py-4 backdrop-blur-md">
      <div className="flex w-[300px] items-center gap-2 rounded-pill border border-border bg-white px-4 py-2.5 text-[13.5px] text-text-faint focus-within:border-accent-light">
        <SearchIcon className="shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          aria-label="Search this section"
          className="w-full bg-transparent text-text placeholder:text-text-faint outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="shrink-0 text-text-faint hover:text-text"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="relative grid h-9 w-9 place-items-center rounded-full text-text-dim hover:bg-ink/[0.05] hover:text-text"
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
