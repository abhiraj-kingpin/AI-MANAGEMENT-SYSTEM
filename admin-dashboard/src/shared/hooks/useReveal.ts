import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/** Fires once when the returned ref's element first scrolls into view — drives the `.reveal`/`.in-view` CSS pair in index.css. Immediately "in view" when reduced motion is on. */
export function useReveal<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>;
  inView: boolean;
} {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();
  const [inView, setInView] = useState(reduced);

  useEffect(() => {
    if (reduced) return; // already true via the initial state above
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  return { ref, inView };
}
