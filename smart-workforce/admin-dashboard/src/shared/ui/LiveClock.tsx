import { useEffect, useState } from 'react';

/** Its own component with its own interval — isolated from whatever page
 *  mounts it, so a once-a-second re-render never bubbles up into a parent
 *  that has CSS entrance animations or memoised subtrees (a re-render of an
 *  ancestor can restart a child's `animation`, and — for a side panel with
 *  a transform-based entrance — park it off-screen). See Live Attendance
 *  and the sidebar's "Sync healthy" style call sites. */
export function LiveClock({ className = '' }: { className?: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}
