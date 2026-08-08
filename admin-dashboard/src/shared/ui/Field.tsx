import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

const CONTROL_CLASSES =
  'w-full rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-[14.5px] text-text placeholder:text-text-faint focus:border-accent-light focus:bg-accent/[0.06] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

/** Label + control wrapper — every form field in the app is built from this, so spacing/label style never drifts between screens. */
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

export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${CONTROL_CLASSES} ${className}`} {...props}>
      {children}
    </select>
  );
}
