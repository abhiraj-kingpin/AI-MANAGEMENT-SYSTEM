import { renderHook } from '@testing-library/react';
import { useCountUp } from './useCountUp';

/** jsdom has no real `matchMedia` — stub it to control the reduced-motion branch each test needs. */
function mockPrefersReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('useCountUp', () => {
  it('renders the target value immediately under reduced motion, never animating', () => {
    mockPrefersReducedMotion(true);
    const { result } = renderHook(() => useCountUp(42, true, 0));
    expect(result.current).toBe('42');
  });

  it('formats the reduced-motion target to the given decimal places', () => {
    mockPrefersReducedMotion(true);
    const { result } = renderHook(() => useCountUp(42.567, true, 1));
    expect(result.current).toBe('42.6');
  });

  it('renders "0" before the animation is told to start', () => {
    mockPrefersReducedMotion(false);
    const { result } = renderHook(() => useCountUp(100, false, 0));
    expect(result.current).toBe('0');
  });
});
