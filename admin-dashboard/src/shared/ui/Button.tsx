import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { useMagneticHover } from '@/shared/hooks/useMagneticHover';

type Variant = 'primary' | 'ghost';

const BASE =
  'relative inline-flex items-center justify-center gap-2 rounded-pill px-6 py-3 text-sm font-bold transition-transform duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light';

// `.btn-shine` (index.css) is the sweep-on-hover pseudo-element — arbitrary
// box-shadow values below are the exact glow spec, not approximated.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'btn-shine overflow-hidden text-white bg-gradient-to-br from-accent to-accent-light shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_24px_-8px_rgba(45,92,255,0.7)] hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_14px_30px_-8px_rgba(45,92,255,0.85)]',
  ghost:
    'text-text bg-white/[0.04] border border-border backdrop-blur-md hover:bg-white/[0.07] hover:border-border-strong',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', isLoading, disabled, className = '', children, ...props },
    forwardedRef,
  ) => {
    const magneticRef = useMagneticHover<HTMLButtonElement>();

    return (
      <button
        ref={(node) => {
          magneticRef.current = node;
          if (typeof forwardedRef === 'function') forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        disabled={disabled || isLoading}
        className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      >
        {isLoading && (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
