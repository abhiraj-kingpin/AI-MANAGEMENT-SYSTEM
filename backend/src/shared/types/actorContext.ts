import type { Role } from '../constants/roles';

/** The authenticated caller, as every service needs it for RBAC scoping (who is this, and which employee record — if any — is theirs). */
export interface ActorContext {
  id: string; // User id
  role: Role;
  employeeId?: string;
}
