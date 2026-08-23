import type { CSSProperties, ReactNode } from 'react';
import { useReveal } from '@/shared/hooks/useReveal';

interface RevealProps {
  children: ReactNode;
  index?: number;
  className?: string;
}

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
