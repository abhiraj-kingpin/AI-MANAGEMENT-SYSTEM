import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { useMagneticHover } from '@/shared/hooks/useMagneticHover';
import { type ButtonVariant, buttonClassName } from '@/shared/ui/buttonStyles';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
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
        className={buttonClassName(variant, className)}
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
