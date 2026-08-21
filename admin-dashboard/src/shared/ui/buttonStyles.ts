export type ButtonVariant = 'primary' | 'ghost';

// A hover lift + stronger glow, not the old diagonal light-sweep
// (`.btn-shine`, retired from index.css) — kept understated rather than
// busy, per the design handoff's interaction spec.
const BASE =
  'relative inline-flex items-center justify-center gap-2 rounded-pill px-6 py-3 text-sm font-bold transition-[transform,box-shadow,background-color,border-color] duration-300 ease-out hover:-translate-y-[2px] disabled:pointer-events-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light';

// Arbitrary box-shadow values are the exact glow spec (orange, matching the
// primary variant's brand-gradient fill), not approximated.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'text-white brand-gradient shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_26px_-8px_rgba(255,138,61,0.55)] hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_12px_34px_-8px_rgba(255,138,61,0.7)]',
  ghost:
    'text-text bg-white/[0.04] border border-border backdrop-blur-md hover:bg-white/[0.07] hover:border-border-strong',
};

/** Shared between `<Button>` and any react-router `<Link>` that needs to look like one (e.g. an "Add" action that's really a navigation, not a submit — a `<Link>` inside a `<button>` would be invalid, nested-interactive HTML). Kept in its own module so Button.tsx only exports the component (Fast Refresh requirement). */
export function buttonClassName(variant: ButtonVariant = 'primary', className = ''): string {
  return `${BASE} ${VARIANT_CLASSES[variant]} ${className}`;
}
