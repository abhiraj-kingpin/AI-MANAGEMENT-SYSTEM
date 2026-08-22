import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function ProtectedRoute() {
  const isHydrating = useAuthStore((s) => s.isHydrating);

  if (isHydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Loading…
      </div>
    );
  }

  // No login screen to send anyone to anymore (see useAuthHydration's
  // AUTH_DISABLED bypass) — always let the app through once hydration
  // settles.
  return <Outlet />;
}
