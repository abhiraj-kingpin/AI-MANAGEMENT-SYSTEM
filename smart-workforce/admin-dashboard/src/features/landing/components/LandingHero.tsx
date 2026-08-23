import { Button } from '@/shared/ui/Button';
import { buttonClassName } from '@/shared/ui/buttonStyles';
import { ChevronDownIcon } from '@/shared/ui/icons';
import { Reveal } from '@/shared/ui/Reveal';

// Bottom-anchored bar heights (as % of the row) — a fixed pattern rather
// than random so the reveal is stable across renders/screenshots. Each bar
// gets its own duration/delay below so the row reads as a live attendance
// chart, not one uniform pulse.
const BAR_HEIGHTS = [
  34, 52, 44, 66, 56, 72, 48, 80, 60, 68, 42, 76, 54, 64, 46, 70, 58, 84, 50, 62, 74, 40,
];

interface LandingHeroProps {
  phase: 'hero' | 'animating';
  onEnter: () => void;
}

export function LandingHero({ phase, onEnter }: LandingHeroProps) {
  return (
    <div
      className="fixed inset-0 z-50 p-[18px]"
      style={{
        transform: phase === 'animating' ? 'translateY(-6%)' : 'translateY(0)',
        opacity: phase === 'animating' ? 0 : 1,
        pointerEvents: phase === 'animating' ? 'none' : 'auto',
        transition: 'transform 0.9s var(--ease-out-smooth), opacity 0.7s ease',
      }}
    >
      <div className="bg-bg-raised relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[20px] px-8 shadow-[0_18px_50px_rgba(16,16,40,0.16)]">
        {/* Decorative background: radial accent glow, an attendance-style
            bar row and a travelling pulse waveform. Purely presentational —
            it never re-renders on any clock/data tick, so its CSS
            animations never restart. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-[34%] h-[1000px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                'radial-gradient(50% 50% at 50% 50%, rgba(20,48,79,.10), rgba(20,48,79,0))',
            }}
          />
          <div className="absolute right-[-10px] bottom-0 left-[-10px] flex items-end gap-3">
            {BAR_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="hero-bar flex-1 origin-bottom rounded-t-[10px]"
                style={{
                  height: h * 3,
                  background: 'linear-gradient(180deg, rgba(20,48,79,.15), rgba(20,48,79,.03))',
                  animation: `hero-bar ${3.4 + (i % 5) * 0.5}s ease-in-out ${i * 0.17}s infinite`,
                }}
              />
            ))}
          </div>
          <div
            className="absolute right-0 bottom-0 left-0 h-[300px]"
            style={{
              background: 'linear-gradient(180deg, rgba(244,244,247,0), rgba(244,244,247,.72))',
            }}
          />
          <svg
            width="100%"
            height="150"
            viewBox="0 0 1200 150"
            preserveAspectRatio="none"
            className="absolute right-0 bottom-[26%] left-0"
          >
            <path
              d="M0 92h258l56-54 60 104 52-70h148l56-38 60 88 52-30h380"
              fill="none"
              stroke="rgba(20,20,40,.06)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M0 92h258l56-54 60 104 52-70h148l56-38 60 88 52-30h380"
              fill="none"
              stroke="rgba(20,48,79,.55)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="240 1500"
              className="hero-sweep"
              style={{ animation: 'hero-sweep 7s linear infinite' }}
            />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-7 py-14 text-center">
          <Reveal index={1}>
            <h1 className="mx-auto max-w-[820px] text-[clamp(32px,4.6vw,64px)] leading-[1.1] font-extrabold tracking-[-1.6px] text-text text-balance">
              Next-gen workforce management with AI Agents
            </h1>
          </Reveal>

          <Reveal index={3}>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={onEnter} className="px-9 py-4 text-[15px]">
                Get Started
              </Button>
              <button type="button" onClick={onEnter} className={buttonClassName('ghost')}>
                View live attendance
              </button>
            </div>
          </Reveal>

        </div>

        {phase === 'hero' && (
          <Reveal index={5} className="absolute bottom-0 left-0 z-10 w-full">
            <button
              type="button"
              onClick={onEnter}
              className="flex w-full cursor-pointer flex-col items-center gap-2 pb-[26px] text-text-faint transition-colors hover:text-text-dim"
            >
              <span className="font-mono text-[11px] tracking-[2px] uppercase">
                Scroll to view dashboard
              </span>
              <ChevronDownIcon className="landing-pulse [animation:bounce-y_1.8s_ease-in-out_infinite]" />
            </button>
          </Reveal>
        )}
      </div>
    </div>
  );
}
