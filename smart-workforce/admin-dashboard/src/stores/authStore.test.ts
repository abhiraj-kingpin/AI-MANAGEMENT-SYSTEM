import { hasRole, useAuthStore } from './authStore';
import type { AuthUser } from '@/types/api';

const hrUser: AuthUser = { id: 'u1', email: 'hr@acme.com', role: 'hr' };

describe('hasRole', () => {
  it('is true when the user has one of the given roles', () => {
    expect(hasRole(hrUser, 'super_admin', 'hr')).toBe(true);
  });

  it('is false when the user has none of the given roles', () => {
    expect(hasRole(hrUser, 'super_admin', 'manager')).toBe(false);
  });

  it('is false for a null user, regardless of the roles list', () => {
    expect(hasRole(null, 'super_admin', 'hr', 'manager', 'employee')).toBe(false);
  });

  it('is false when called with no roles at all', () => {
    expect(hasRole(hrUser)).toBe(false);
  });
});

describe('useAuthStore', () => {
  const initialState = useAuthStore.getState();
  afterEach(() => useAuthStore.setState(initialState, true));

  it('defaults to a hydrating, unauthenticated session', () => {
    const state = useAuthStore.getState();
    expect(state.isHydrating).toBe(true);
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('setAuth stores the session and clears isHydrating, defaulting employee to null when omitted', () => {
    useAuthStore.getState().setAuth({ accessToken: 'token-1', user: hrUser });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('token-1');
    expect(state.user).toEqual(hrUser);
    expect(state.employee).toBeNull();
    expect(state.isHydrating).toBe(false);
  });

  it('setAccessToken updates only the token, leaving user/employee untouched', () => {
    useAuthStore.getState().setAuth({ accessToken: 'token-1', user: hrUser });
    useAuthStore.getState().setAccessToken('token-2');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('token-2');
    expect(state.user).toEqual(hrUser);
  });

  it('clearAuth wipes the session and resolves hydration (a logged-out state is never "still hydrating")', () => {
    useAuthStore.getState().setAuth({ accessToken: 'token-1', user: hrUser });
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.employee).toBeNull();
    expect(state.isHydrating).toBe(false);
  });
});
