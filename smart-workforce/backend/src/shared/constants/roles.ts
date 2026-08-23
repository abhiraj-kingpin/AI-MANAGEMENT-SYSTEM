export const ROLES = ['super_admin', 'hr', 'manager', 'employee'] as const;

export type Role = (typeof ROLES)[number];
