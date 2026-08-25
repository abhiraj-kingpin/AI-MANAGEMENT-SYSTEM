import { useEffect, useRef } from 'react';
import { useToastStore } from '@/stores/toastStore';

const AUTO_DISMISS_MS = 2600;

/** Mounted once in AppShell. Reads the shared toast store rather than
 *  taking props, so any page can fire one via `pushToast(...)` without
 *  threading a callback down through it. */
export function ToastHost() {
  const message = useToastStore((s) => s.message);
  const clear = useToastStore((s) => s.clear);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(clear, AUTO_DISMISS_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [message, clear]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-11 z-[100] flex justify-center">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-ink px-4.5 py-3.5 shadow-[0_14px_34px_rgba(10,10,30,0.3)]"
        style={{ animation: 'toast-in 0.22s ease' }}
      >
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[7px] bg-success/20">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#29D3A0" strokeWidth={2.8} strokeLinecap="round">
            <path d="M5 13l4.5 4.5L19 7" />
          </svg>
        </span>
        <span className="text-[12.5px] font-semibold text-white">{message}</span>
      </div>
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
