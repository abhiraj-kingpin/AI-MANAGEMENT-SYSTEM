import type { CSSProperties, ReactNode } from 'react';
import { useReveal } from '@/shared/hooks/useReveal';

interface RevealProps {
  children: ReactNode;
  /** Position in a group — staggers this block's entrance behind earlier ones (see `--reveal-i` in index.css). */
  index?: number;
  className?: string;
}

/** Fades a block up into place the first time it scrolls into view. Wrap page sections/cards with this rather than animating each one by hand. */
export function Reveal({ children, index = 0, className = '' }: RevealProps) {
  const { ref, inView } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`reveal ${inView ? 'in-view' : ''} ${className}`}
      style={{ '--reveal-i': index } as CSSProperties}
    >
      {children}
    </div>
  );
}
