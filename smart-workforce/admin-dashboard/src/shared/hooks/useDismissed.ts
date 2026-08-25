import { useCallback, useEffect, useState } from 'react';

/** Persists a set of dismissed ids to localStorage under `key` — backs
 *  "dismissed insights, alerts and banners stay hidden" across the AI
 *  Insights cards, the Alerts Center (snooze), and the dashboard exception
 *  banner. Per-browser, not synced across admins — acceptable for a
 *  "don't show me this again on this machine" affordance. */
export function useDismissed(key: string) {
  const storageKey = `wf.dismissed.${key}`;
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...dismissed]));
    } catch {
      // Private browsing / storage disabled — dismissals just won't persist.
    }
  }, [storageKey, dismissed]);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  }, []);

  const isDismissed = useCallback((id: string) => dismissed.has(id), [dismissed]);

  return { isDismissed, dismiss };
}
