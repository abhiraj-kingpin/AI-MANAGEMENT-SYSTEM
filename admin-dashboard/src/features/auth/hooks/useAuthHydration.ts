import { useEffect } from 'react';
import { fetchMe } from '@/features/auth/api/authApi';
import { refreshAccessToken } from '@/shared/lib/axios';
import { useAuthStore } from '@/stores/authStore';

/**
 * Runs once on app load. The refresh token lives in an httpOnly cookie the
 * browser sends automatically, so a page reload can silently restore the
 * session — or land the user on /login if there is no valid cookie.
 */
export function useAuthHydration() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const accessToken = await refreshAccessToken();
        const me = await fetchMe();
        if (!cancelled) {
          setAuth({ accessToken, user: me.user, employee: me.employee });
        }
      } catch {
        if (!cancelled) clearAuth();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);
}
