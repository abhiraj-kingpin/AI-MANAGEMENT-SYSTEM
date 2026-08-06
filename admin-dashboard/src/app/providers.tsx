import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { useAuthHydration } from '@/features/auth/hooks/useAuthHydration';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthHydrationGate>{children}</AuthHydrationGate>
    </QueryClientProvider>
  );
}

/** Kicks off the silent session-restore check; components can read `isHydrating` from the auth store. */
function AuthHydrationGate({ children }: { children: ReactNode }) {
  useAuthHydration();
  return children;
}
