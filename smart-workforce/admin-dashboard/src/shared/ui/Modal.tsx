import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '@/shared/ui/Card';

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

  // Portaled to <body> — AppShell's rounded shell (overflow-hidden) sits
  // under a transformed ancestor (the hero slide transition), which makes
  // that shell the containing block for any `position: fixed` descendant
  // that isn't portaled out. Without this, the modal gets cropped to the
  // shell's rounded corners instead of covering the viewport.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(12,12,20,0.42)] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        className="flex max-h-[85vh] w-full max-w-md flex-col p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-5 flex shrink-0 items-center justify-between">
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
        <div className="overflow-y-auto">{children}</div>
      </Card>
    </div>,
    document.body,
  );
}
