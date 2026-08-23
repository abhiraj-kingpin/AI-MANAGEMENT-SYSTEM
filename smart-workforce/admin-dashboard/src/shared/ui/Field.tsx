import type { InputHTMLAttributes, ReactNode } from 'react';

// The custom listbox-based dropdown lives in Select.tsx (portaled, styled to
// match the app rather than the browser's native <select> popup) — re-exported
// here so every existing `import { Select } from '@/shared/ui/Field'` call
// site keeps working unchanged.
export { Select } from '@/shared/ui/Select';

const CONTROL_CLASSES =
  'w-full rounded-xl border border-border-strong bg-card-subtle px-3.5 py-2.5 text-[14.5px] text-text placeholder:text-text-faint focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[12.5px] font-bold text-text-dim">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL_CLASSES} ${className}`} {...props} />;
}
