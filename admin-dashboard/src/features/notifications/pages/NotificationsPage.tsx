import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Reveal } from '@/shared/ui/Reveal';
import { apiErrorMessage } from '@/shared/lib/apiError';
import { BroadcastModal } from '@/features/notifications/components/BroadcastModal';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/features/notifications/hooks/useNotificationMutations';
import { useMyNotifications } from '@/features/notifications/hooks/useNotifications';
import { useAuthStore } from '@/stores/authStore';
import type { ListMyNotificationsQuery, Notification, NotificationType } from '@/types/api';

const TYPE_LABEL: Record<NotificationType, string> = {
  attendance: 'Attendance',
  leave: 'Leave',
  salary: 'Salary',
  shift: 'Shift',
  holiday: 'Holiday',
  birthday: 'Birthday',
  announcement: 'Announcement',
};

const PAGE_SIZE = 20;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canBroadcast = role === 'super_admin' || role === 'hr';

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [query, setQuery] = useState<ListMyNotificationsQuery>({ page: 1, limit: PAGE_SIZE });

  const { data, isLoading, isError } = useMyNotifications(query);
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const handleMarkRead = (notification: Notification) => {
    markReadMutation.mutate(notification.id, {
      onError: (err) => window.alert(apiErrorMessage(err)),
    });
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate(undefined, {
      onError: (err) => window.alert(apiErrorMessage(err)),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Reveal className="flex items-end justify-between">
        <div>
          <p className="mb-1.5 font-mono text-[11.5px] tracking-[0.14em] text-accent-light uppercase">
            Inbox
          </p>
          <h1 className="text-[26px] font-extrabold text-balance">Notifications</h1>
        </div>
        {canBroadcast && <Button onClick={() => setIsBroadcasting(true)}>Send Broadcast</Button>}
      </Reveal>

      <Reveal index={1}>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <label className="flex items-center gap-2 text-[13.5px] text-text-dim">
              <input
                type="checkbox"
                checked={query.unread ?? false}
                onChange={(e) =>
                  setQuery((q) => ({ ...q, unread: e.target.checked || undefined, page: 1 }))
                }
                className="h-4 w-4 rounded border-border accent-accent"
              />
              Unread only
            </label>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[12.5px] font-semibold text-accent-light hover:underline"
            >
              Mark all as read
            </button>
          </div>

          {isError ? (
            <p className="p-8 text-center text-sm text-danger">
              Couldn't load notifications. Try refreshing.
            </p>
          ) : (
            <div className="flex flex-col">
              {isLoading && !data ? (
                <p className="px-5 py-10 text-center text-sm text-text-dim">Loading…</p>
              ) : data && data.items.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-text-dim">
                  Nothing here{query.unread ? " — you're all caught up." : '.'}
                </p>
              ) : (
                data?.items.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 border-b border-border/60 px-5 py-4 last:border-0 ${
                      notification.isRead ? '' : 'bg-accent/[0.04]'
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        notification.isRead ? 'bg-transparent' : 'bg-accent-light'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-text">{notification.title}</p>
                        <span className="rounded-pill bg-white/5 px-2 py-0.5 text-[10.5px] font-bold text-text-dim uppercase">
                          {TYPE_LABEL[notification.type]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[13.5px] text-text-dim">{notification.body}</p>
                      <p className="mt-1 font-mono text-[11.5px] text-text-faint">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notification)}
                        className="shrink-0 text-[12.5px] font-semibold text-accent-light hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3.5 text-[13px] text-text-dim">
              <span>
                Page {data.page} of {data.pages} — {data.total} notification(s)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="px-3.5 py-1.5 text-[12.5px]"
                  disabled={data.page <= 1}
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  className="px-3.5 py-1.5 text-[12.5px]"
                  disabled={data.page >= data.pages}
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </Reveal>

      {isBroadcasting && <BroadcastModal onClose={() => setIsBroadcasting(false)} />}
    </div>
  );
}
