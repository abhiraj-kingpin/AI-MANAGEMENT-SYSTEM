import type { HTMLAttributes } from 'react';

/** The one glass surface every panel/card in the app is built from — translucent, blurred, soft-lit border. See index.css's `.card-edge` for the highlight. */
export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`card-edge relative rounded-card border border-border bg-surface backdrop-blur-xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
