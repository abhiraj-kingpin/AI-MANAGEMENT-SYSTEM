import type { Role } from '../../shared/constants/roles';

export interface ConsoleUserDTO {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  accountClaimed: boolean;
  lastLoginAt: Date | null;
  employeeName: string | null;
  createdAt: Date;
}
