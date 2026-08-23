import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Atmosphere } from './Atmosphere';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { LandingHero } from '@/features/landing/components/LandingHero';
import { useSearchStore } from '@/stores/searchStore';

type Phase = 'hero' | 'animating' | 'dashboard';

export function AppShell() {
  const [phase, setPhase] = useState<Phase>('hero');
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const clearSearch = useSearchStore((s) => s.clear);

  // A query typed on one section (e.g. "Jane" on Employees) shouldn't keep
  // silently filtering the next section you navigate to (e.g. Payroll).
  useEffect(() => {
    clearSearch();
  }, [location.pathname, clearSearch]);

  const enterDashboard = () => {
    if (phase !== 'hero') return;
    setPhase('animating');
    transitionTimeout.current = setTimeout(() => setPhase('dashboard'), 900);
  };

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
  }, [phase]);

  useEffect(() => {
    return () => {
      if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      {phase !== 'dashboard' && <LandingHero phase={phase} onEnter={enterDashboard} />}

      {/* The ambient mesh glow belongs to the marketing hero only — the
          console shell itself is a flat, flush surface (see index.css /
          Atmosphere.tsx), so this fades out once the hero has handed off
          rather than sitting behind the dashboard forever. */}
      {phase !== 'dashboard' && (
        <div
          style={{
            opacity: phase === 'hero' ? 0 : 1,
            transition: 'opacity 0.8s ease 50ms',
          }}
        >
          <Atmosphere />
        </div>
      )}

      <div
        style={{
          transform: phase === 'hero' ? 'translateY(4%)' : 'translateY(0)',
          opacity: phase === 'hero' ? 0 : 1,
          pointerEvents: phase === 'hero' ? 'none' : 'auto',
          transition: 'transform 0.9s var(--ease-out-smooth) 50ms, opacity 0.8s ease 50ms',
        }}
      >
        {phase !== 'hero' && (
          <div className="p-[18px]">
            <div className="relative mx-auto flex min-h-[calc(100vh-36px)] max-w-[1600px] overflow-hidden rounded-[20px] bg-bg-raised shadow-[0_18px_50px_rgba(16,16,40,0.16)]">
              <Sidebar />
              <div className="relative flex flex-1 flex-col">
                <Topbar />
                <main className="flex-1 p-7">
                  <Outlet />
                </main>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
