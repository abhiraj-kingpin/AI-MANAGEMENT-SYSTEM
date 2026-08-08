import { type ReactNode, useEffect } from 'react';
import { Card } from '@/shared/ui/Card';

/** A single reusable overlay — every dialog in the app (attendance corrections today, more later) is built from this rather than each feature rolling its own backdrop/escape-key handling. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-dim hover:text-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </Card>
    </div>
  );
}
