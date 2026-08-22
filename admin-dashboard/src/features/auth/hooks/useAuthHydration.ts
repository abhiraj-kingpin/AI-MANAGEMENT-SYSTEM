import { useEffect } from 'react';
import { fetchMe } from '@/features/auth/api/authApi';
import { refreshAccessToken } from '@/shared/lib/axios';
import { useAuthStore } from '@/stores/authStore';

// Mirrors the backend's AUTH_DISABLED bypass (auth.middleware.ts) — when on,
// skip the real refresh/login flow and hand the app a fixed super_admin
// session directly, matching the fixed actor the backend now accepts every
// request as. ON by default (no env var needed); set VITE_AUTH_DISABLED=false
// explicitly to restore real login (and flip AUTH_DISABLED=false to match on
// the backend too).
const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED !== 'false';

export function useAuthHydration() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    if (AUTH_DISABLED) {
      setAuth({
        accessToken: 'auth-disabled',
        user: { id: '6a89776861f6ab6e21c9d56b', email: 'admin@example.com', role: 'super_admin' },
      });
      return;
    }

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
  }, []);
}
