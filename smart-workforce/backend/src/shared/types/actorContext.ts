import type { Role } from '../constants/roles';

export interface ActorContext {
  id: string;
  role: Role;
  employeeId?: string;
}
