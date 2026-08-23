import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Generic portaled floating panel — anchored to a trigger element, escapes
 * any ancestor's `overflow: hidden` or `transform` (AppShell's rounded
 * shell and hero slide-transition both use these, which silently clip or
 * mis-position anything positioned the normal `absolute`/`fixed` way — see
 * Modal.tsx and Select.tsx, the two things this backs).
 *
 * Renders into `document.body` via a portal, so it always paints above
 * cards/modals and is never cropped by a scrolling/rounded container.
 */
export function Popover({
  anchorRef,
  open,
  onClose,
  children,
  className = '',
  sameWidthAsAnchor = false,
  gap = 6,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** Match the panel's width to the anchor's (e.g. a Select's menu). */
  sameWidthAsAnchor?: boolean;
  gap?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [openUp, setOpenUp] = useState(false);

  const reposition = () => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor) return;
    const anchorBox = anchor.getBoundingClientRect();
    const panelHeight = panel?.offsetHeight ?? 0;
    const spaceBelow = window.innerHeight - anchorBox.bottom;
    const spaceAbove = anchorBox.top;
    const flip = spaceBelow < panelHeight + gap && spaceAbove > spaceBelow;
    setOpenUp(flip);
    setRect({
      top: flip ? anchorBox.top - gap : anchorBox.bottom + gap,
      left: anchorBox.left,
      width: anchorBox.width,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    // Reposition once more after the panel has its real height (first
    // pass above uses panelHeight=0 before it's mounted/measured).
    const id = requestAnimationFrame(reposition);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onReflow = () => reposition();
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onPointerDown, true);
    return () => document.removeEventListener('mousedown', onPointerDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !rect) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        width: sameWidthAsAnchor ? rect.width : undefined,
        transform: openUp ? 'translateY(-100%)' : undefined,
        zIndex: 1000,
      }}
      className={className}
    >
      {children}
    </div>,
    document.body,
  );
}
