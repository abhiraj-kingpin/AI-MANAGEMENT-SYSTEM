import type { Role } from '../../shared/constants/roles';
import type { EmployeeSummaryDTO } from '../employees/employee.types';

/**
 * Mirrors admin-dashboard/src/types/api.ts and mobile-app's
 * UserEntity/AuthSessionEntity — the response shapes documented in
 * docs/architecture/04-api-documentation.md#auth-auth.
 */
export interface AuthUserDTO {
  id: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
}

export type { EmployeeSummaryDTO };

export interface SessionTokensDTO {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface LoginResultDTO extends SessionTokensDTO {
  user: AuthUserDTO;
  employee?: EmployeeSummaryDTO;
}
