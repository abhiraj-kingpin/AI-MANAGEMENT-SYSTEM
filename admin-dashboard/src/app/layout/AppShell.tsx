import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Atmosphere } from './Atmosphere';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { LandingHero } from '@/features/landing/components/LandingHero';

type Phase = 'hero' | 'animating' | 'dashboard';

/**
 * Gates the whole authenticated app behind a one-shot landing hero, per the
 * design handoff's "premium animated entrance": every fresh mount of
 * `AppShell` (a login, or a hard page reload while already signed in)
 * starts in `'hero'` and shows `LandingHero` full-screen instead of the
 * sidebar/topbar/page. Reaching `'dashboard'` is permanent for the rest of
 * that mount — because this state lives on the *layout* route rather than
 * the page route, it survives in-app navigation (AppShell itself never
 * remounts as the user moves between pages, only its `<Outlet>` swaps), so
 * the hero genuinely never comes back until the next full reload. Nothing
 * here is persisted (no localStorage/sessionStorage flag) — that's
 * deliberate, matching the handoff's "ephemeral, resets on reload" spec.
 *
 * The sidebar/topbar/page block below is only ever mounted once `phase`
 * leaves `'hero'` — so its own entrance animations (Sidebar/StatCard/chart
 * `Reveal`s, which fire as soon as their element exists in the viewport)
 * naturally play "at transition time" rather than needing a second,
 * separate trigger.
 */
export function AppShell() {
  const [phase, setPhase] = useState<Phase>('hero');
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enterDashboard = () => {
    if (phase !== 'hero') return;
    setPhase('animating');
    transitionTimeout.current = setTimeout(() => setPhase('dashboard'), 900);
  };

  // Wheel-down/Arrow-down/Page-down also trigger the transition, matching
  // the design handoff — not just the CTA/scroll-cue click.
  useEffect(() => {
    if (phase !== 'hero') return;

    function onWheel(e: WheelEvent) {
      if (e.deltaY > 8) enterDashboard();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') enterDashboard();
    }

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enterDashboard closes over `phase` fresh each render; re-running this effect on it (not on the function identity) is exactly what's wanted.
  }, [phase]);

  useEffect(() => {
    return () => {
      if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      {phase !== 'dashboard' && <LandingHero phase={phase} onEnter={enterDashboard} />}

      {/* Kept as its own opacity-only wrapper, sibling to (not inside) the
          translateY wrapper below — a CSS `transform` on an ancestor turns
          it into the containing block for any `position: fixed` descendant,
          which would silently break Atmosphere's fixed-to-viewport glow
          (it'd start tracking this wrapper's box instead, e.g. scrolling
          away with a tall page instead of staying put). Opacity alone
          doesn't have that side effect. */}
      <div
        style={{
          opacity: phase === 'hero' ? 0 : 1,
          transition: 'opacity 0.8s ease 50ms',
        }}
      >
        <Atmosphere />
      </div>

      <div
        style={{
          transform: phase === 'hero' ? 'translateY(4%)' : 'translateY(0)',
          opacity: phase === 'hero' ? 0 : 1,
          pointerEvents: phase === 'hero' ? 'none' : 'auto',
          transition: 'transform 0.9s var(--ease-out-smooth) 50ms, opacity 0.8s ease 50ms',
        }}
      >
        {phase !== 'hero' && (
          <div className="relative flex min-h-screen">
            <Sidebar />
            <div className="relative flex flex-1 flex-col">
              <Topbar />
              <main className="flex-1 p-7">
                <Outlet />
              </main>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
