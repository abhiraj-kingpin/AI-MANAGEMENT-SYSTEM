export type ButtonVariant = 'primary' | 'ghost';

const BASE =
  'relative inline-flex items-center justify-center gap-2 rounded-pill px-6 py-3 text-sm font-bold transition-[transform,box-shadow,background-color,border-color] duration-300 ease-out hover:-translate-y-[2px] disabled:pointer-events-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'text-white brand-gradient shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_20px_-8px_rgba(106,76,240,0.55)] hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_12px_28px_-8px_rgba(106,76,240,0.65)]',
  ghost:
    'text-text bg-white border border-border shadow-[0_1px_3px_rgba(20,20,50,0.04)] hover:bg-ink/[0.03] hover:border-border-strong',
};

export function buttonClassName(variant: ButtonVariant = 'primary', className = ''): string {
  return `${BASE} ${VARIANT_CLASSES[variant]} ${className}`;
}
