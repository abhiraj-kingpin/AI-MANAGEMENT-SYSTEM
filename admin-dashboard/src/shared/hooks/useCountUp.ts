import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** Animates from 0 to `target` once `start` flips true (pair with useReveal). Renders the final value immediately under reduced motion, without ever animating. */
export function useCountUp(target: number, start: boolean, decimals = 0, duration = 1100): string {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start || reduced) return;

    let frame: number;
    const startedAt = performance.now();

    function tick(now: number) {
      const progress = Math.min(1, (now - startedAt) / duration);
      setValue(target * easeOutExpo(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setValue(target);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [start, target, reduced, duration]);

  if (reduced) return target.toFixed(decimals);
  if (!start) return (0).toFixed(decimals);
  return value.toFixed(decimals);
}
