export type ButtonVariant = 'primary' | 'ghost';

const BASE =
  'relative inline-flex items-center justify-center gap-2 rounded-pill px-6 py-3 text-sm font-bold transition-transform duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light';

// `.btn-shine` (index.css) is the sweep-on-hover pseudo-element — arbitrary
// box-shadow values below are the exact glow spec, not approximated.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'btn-shine overflow-hidden text-white bg-gradient-to-br from-accent to-accent-light shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_24px_-8px_rgba(45,92,255,0.7)] hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_14px_30px_-8px_rgba(45,92,255,0.85)]',
  ghost:
    'text-text bg-white/[0.04] border border-border backdrop-blur-md hover:bg-white/[0.07] hover:border-border-strong',
};

/** Shared between `<Button>` and any react-router `<Link>` that needs to look like one (e.g. an "Add" action that's really a navigation, not a submit — a `<Link>` inside a `<button>` would be invalid, nested-interactive HTML). Kept in its own module so Button.tsx only exports the component (Fast Refresh requirement). */
export function buttonClassName(variant: ButtonVariant = 'primary', className = ''): string {
  return `${BASE} ${VARIANT_CLASSES[variant]} ${className}`;
}
