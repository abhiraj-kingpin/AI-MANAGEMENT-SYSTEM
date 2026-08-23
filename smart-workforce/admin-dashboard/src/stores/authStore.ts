import { create } from 'zustand';
import type { AuthUser, EmployeeSummary } from '@/types/api';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  employee: EmployeeSummary | null;
  isHydrating: boolean;
  setAuth: (payload: { accessToken: string | null; user: AuthUser; employee?: EmployeeSummary }) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
  setHydrating: (value: boolean) => void;
}

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
