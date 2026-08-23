import type { HTMLAttributes } from 'react';

export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`card-edge relative rounded-card border border-border bg-surface shadow-[0_1px_3px_rgba(20,20,50,0.04)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
