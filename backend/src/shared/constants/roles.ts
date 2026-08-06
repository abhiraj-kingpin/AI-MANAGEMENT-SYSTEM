/**
 * Centralized so auth, RBAC middleware, and any model needing a Role type
 * (User, and later services scoping queries by role) all import the same
 * source of truth — see docs/architecture/07-authentication-flow.md §6.
 *
 * Declared as a const tuple (rather than a separate type + array) so the
 * union type is inferred from the single array below, and so it can be
 * passed straight to `z.enum(ROLES)` without a cast.
 */
export const ROLES = ['super_admin', 'hr', 'manager', 'employee'] as const;

export type Role = (typeof ROLES)[number];
