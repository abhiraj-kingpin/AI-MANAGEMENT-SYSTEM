import type { ReactNode } from 'react';

type ChipTone = 'success' | 'warning' | 'neutral';

// Semantic state colors — deliberately separate from the blue accent, so
// status reads at a glance without competing with it.
const TONE_CLASSES: Record<ChipTone, string> = {
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  neutral: 'text-text-dim bg-text-dim/10',
};

export function Chip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-bold ${TONE_CLASSES[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}
