import { create } from 'zustand';
import type { AuthUser, EmployeeSummary } from '@/types/api';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  employee: EmployeeSummary | null;
  isHydrating: boolean; // true while the silent-refresh-on-load check is in flight
  setAuth: (payload: { accessToken: string; user: AuthUser; employee?: EmployeeSummary }) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
  setHydrating: (value: boolean) => void;
}

/**
 * Session state only — deliberately NOT persisted to localStorage/sessionStorage.
 * See docs/architecture/07-authentication-flow.md §1: the access token lives in
 * memory only (XSS mitigation); the refresh token lives in an httpOnly cookie the
 * browser manages and this store never touches. On page reload, `isHydrating`
 * gates the UI while shared/lib/axios.ts silently calls /auth/refresh to restore
 * the session from that cookie.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  employee: null,
  isHydrating: true,
  setAuth: ({ accessToken, user, employee }) =>
    set({ accessToken, user, employee: employee ?? null, isHydrating: false }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ accessToken: null, user: null, employee: null, isHydrating: false }),
  setHydrating: (value) => set({ isHydrating: value }),
}));

export function hasRole(user: AuthUser | null, ...roles: AuthUser['role'][]): boolean {
  return !!user && roles.includes(user.role);
}
