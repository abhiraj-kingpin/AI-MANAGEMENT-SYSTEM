import { Button } from '@/shared/ui/Button';
import { ChevronDownIcon } from '@/shared/ui/icons';
import { Reveal } from '@/shared/ui/Reveal';

/**
 * The ten vertical light rays behind the hero panel, sweeping orange (left)
 * through pink/violet transition tones to blue (right) — the same
 * left-to-right hue sweep as the brand's orange→blue gradient, just spread
 * across ten bars instead of two gradient stops. Data-driven rather than
 * ten hand-written near-identical divs, per-ray only in position, color,
 * height, opacity, and pulse timing (all lifted from the design handoff's
 * reference file, not approximated).
 */
const RAYS = [
  { left: '6%', height: '58%', color: '#ff8a3d', opacity: 0.7, duration: '4s', delay: '0s' },
  { left: '16%', height: '52%', color: '#ff9a4a', opacity: 0.65, duration: '3.6s', delay: '.4s' },
  { left: '26%', height: '60%', color: '#ffab5e', opacity: 0.7, duration: '4.4s', delay: '.8s' },
  { left: '36%', height: '50%', color: '#e8916f', opacity: 0.6, duration: '3.8s', delay: '1.2s' },
  { left: '46%', height: '56%', color: '#c98a95', opacity: 0.6, duration: '4.2s', delay: '1.6s' },
  { left: '56%', height: '54%', color: '#a087b8', opacity: 0.62, duration: '3.6s', delay: '.2s' },
  { left: '66%', height: '60%', color: '#7f93d8', opacity: 0.68, duration: '4s', delay: '.6s' },
  { left: '76%', height: '50%', color: '#5f9eea', opacity: 0.62, duration: '3.8s', delay: '1s' },
  { left: '86%', height: '58%', color: '#4a95f5', opacity: 0.7, duration: '4.4s', delay: '1.4s' },
  { left: '94%', height: '52%', color: '#3d8bff', opacity: 0.65, duration: '4s', delay: '.3s' },
] as const;

interface LandingHeroProps {
  /** Only ever rendered while the app is showing (or leaving) the hero — see AppShell, which unmounts this entirely once the transition into the dashboard completes. */
  phase: 'hero' | 'animating';
  onEnter: () => void;
}

/**
 * The full-screen marketing entrance shown once per session, before the
 * authenticated dashboard — see AppShell for the phase state machine
 * (hero → animating → dashboard) this reads and the wheel/key/click
 * triggers that drive it. This component is purely presentational: it
 * renders the current phase's look and calls `onEnter` when the user
 * clicks through, but owns no state itself.
 */
export function LandingHero({ phase, onEnter }: LandingHeroProps) {
  return (
    <div
      className="fixed inset-0 z-50 p-[26px]"
      style={{
        transform: phase === 'animating' ? 'translateY(-6%)' : 'translateY(0)',
        opacity: phase === 'animating' ? 0 : 1,
        pointerEvents: phase === 'animating' ? 'none' : 'auto',
        transition: 'transform 0.9s var(--ease-out-smooth), opacity 0.7s ease',
      }}
    >
      <div className="bg-bg-raised relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/[0.12] shadow-[0_50px_140px_rgba(0,0,0,0.65)]">
        {/* Background: rays + horizon glow, clipped to the panel's rounded corners. */}
        <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden">
          {RAYS.map((ray) => (
            <div
              key={ray.left}
              className="landing-pulse absolute bottom-0 w-[3px] blur-[6px]"
              style={{
                left: ray.left,
                height: ray.height,
                opacity: ray.opacity,
                backgroundImage: `linear-gradient(to top, ${ray.color}, transparent)`,
                animation: `glow-pulse ${ray.duration} ease-in-out ${ray.delay} infinite alternate`,
              }}
            />
          ))}
          <div
            className="landing-pulse absolute left-1/2 -bottom-[22%] h-[55%] w-[150%] -translate-x-1/2 rounded-full blur-[60px] [animation:glow-pulse_7s_ease-in-out_infinite]"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at center, rgba(255,154,74,.4) 0%, rgba(160,110,190,.26) 38%, rgba(61,139,255,.34) 72%, transparent 100%)',
            }}
          />
          <div
            className="absolute right-[8%] bottom-[19%] left-[8%] h-[2px] opacity-75 blur-[1px]"
            style={{
              backgroundImage:
                'linear-gradient(90deg, transparent, #ffcf9a, #ffffff, #9ec8ff, transparent)',
              boxShadow: '0 0 24px rgba(255,255,255,.45)',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-7 px-6 py-14 text-center">
          <Reveal index={0}>
            <span className="inline-flex items-center gap-2.5 rounded-pill border border-white/[0.12] bg-white/[0.05] px-[18px] py-[7px] text-[13px] whitespace-nowrap text-text-dim">
              <span className="landing-pulse inline-block h-1.5 w-1.5 rounded-full bg-accent [animation:glow-pulse_2s_ease-in-out_infinite]" />
              AI Insights Agent — now available
            </span>
          </Reveal>

          <Reveal index={1}>
            <h1 className="mx-auto max-w-[820px] text-[clamp(32px,4.6vw,54px)] leading-[1.3] font-extrabold tracking-[-1.2px] text-balance">
              <span className="block">Next-gen workforce</span>
              <span className="block">management with AI Agents</span>
            </h1>
          </Reveal>

          <Reveal index={2}>
            <p className="mx-auto max-w-[560px] text-[16.5px] leading-[1.6] text-text-dim">
              Run attendance, payroll, and HR operations at the speed of AI — one platform built for
              modern workforce teams.
            </p>
          </Reveal>

          <Reveal index={3}>
            <Button onClick={onEnter} className="px-9 py-4 text-[15px]">
              Get Started
            </Button>
          </Reveal>
        </div>

        {phase === 'hero' && (
          <Reveal index={4}>
            <button
              type="button"
              onClick={onEnter}
              className="relative z-10 flex w-full cursor-pointer flex-col items-center gap-2 pb-[26px] text-text-faint transition-colors hover:text-text-dim"
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
