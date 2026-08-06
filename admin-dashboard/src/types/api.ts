/**
 * Shared API contract types — hand-maintained mirror of
 * docs/architecture/04-api-documentation.md until an OpenAPI codegen step
 * (docs/api/openapi.yaml) replaces this file with generated types.
 */

export type Role = 'super_admin' | 'hr' | 'manager' | 'employee';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { page?: number; limit?: number; total?: number; pages?: number };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface EmployeeSummary {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  employee?: EmployeeSummary;
}
