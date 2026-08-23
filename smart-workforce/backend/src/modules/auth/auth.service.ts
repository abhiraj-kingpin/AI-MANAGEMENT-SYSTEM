import { logger } from '../../config/logger';
import { AppError } from '../../shared/errors/AppError';
import type { Role } from '../../shared/constants/roles';
import { assertRoleAssignable } from '../../shared/utils/roleAssignment';
import {
  generateRandomToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../shared/utils/tokens';
import { Employee } from '../employees/employee.model';
import { type EmployeeSummaryDTO, toEmployeeSummaryDTO } from '../employees/employee.types';
import { sendPasswordResetEmail } from '../notifications/email.service';
import { type IUser, User } from '../users/user.model';
import type { AuthUserDTO, LoginResultDTO, SessionTokensDTO } from './auth.types';

const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function assertNotLocked(user: IUser | null): void {
  if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    throw AppError.locked(
      `Too many failed login attempts. Try again in ${minutesLeft} minute(s).`,
      'ACCOUNT_LOCKED',
    );
  }
}

async function registerFailedLogin(user: IUser): Promise<void> {
  const hadExpiredLock = !!user.lockedUntil;
  user.failedLoginAttempts = hadExpiredLock ? 1 : user.failedLoginAttempts + 1;
  user.lockedUntil = null;

  if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    logger.warn(`Account locked after ${user.failedLoginAttempts} failed login attempts`, {
      userId: user.id,
    });
  }

  await user.save();
}

function toAuthUserDTO(user: IUser): AuthUserDTO {
  return {
    id: user.id as string,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

async function findEmployeeSummary(userId: string): Promise<EmployeeSummaryDTO | undefined> {
  const employee = await Employee.findOne({ userId }).select('employeeCode firstName lastName');
  return employee
    ? toEmployeeSummaryDTO({
        id: employee.id as string,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
      })
    : undefined;
}

function issueSession(user: IUser, employeeId?: string): SessionTokensDTO {
  const accessToken = signAccessToken({ sub: user.id as string, role: user.role, employeeId });
  const { token: refreshToken, expiresAt } = signRefreshToken(user.id as string);

  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = expiresAt;

  return { accessToken, refreshToken, refreshTokenExpiresAt: expiresAt };
}

export const authService = {
  async register(
    input: { email: string; password: string; role: Role },
    createdByRole: Role,
  ): Promise<AuthUserDTO> {
    assertRoleAssignable(createdByRole, input.role);

    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw AppError.conflict('An account with this email already exists.', 'EMAIL_TAKEN');
    }

    const passwordHash = await User.hashPassword(input.password);
    const user = await User.create({
      email: input.email,
      passwordHash,
      role: input.role,
      mustChangePassword: true,
    });

    return toAuthUserDTO(user);
  },

  async login(email: string, password: string): Promise<LoginResultDTO> {
    const user = await User.findOne({ email }).select('+passwordHash');
    assertNotLocked(user);

    if (user && !user.accountClaimed) {
      throw AppError.unauthorized(
        "This account hasn't been set up yet. Register with your work email to set a password.",
        'ACCOUNT_NOT_CLAIMED',
      );
    }

    if (!user || !user.isActive || !(await user.comparePassword(password))) {
      if (user) await registerFailedLogin(user);
      throw AppError.unauthorized('Email or password is incorrect.', 'INVALID_CREDENTIALS');
    }

    const employee = await findEmployeeSummary(user.id as string);
    const session = issueSession(user, employee?.id);

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    return { ...session, user: toAuthUserDTO(user), employee };
  },

  async claimAccount(email: string, password: string): Promise<LoginResultDTO> {
    const user = await User.findOne({ email });
    if (!user) {
      throw AppError.notFound(
        'No pending account found for this email. Ask HR to add you as an employee first.',
        'ACCOUNT_NOT_FOUND',
      );
    }
    if (user.accountClaimed) {
      throw AppError.conflict(
        'This account is already active — sign in instead.',
        'ALREADY_CLAIMED',
      );
    }

    user.passwordHash = await User.hashPassword(password);
    user.accountClaimed = true;

    const employee = await findEmployeeSummary(user.id as string);
    const session = issueSession(user, employee?.id);
    user.lastLoginAt = new Date();
    await user.save();

    return { ...session, user: toAuthUserDTO(user), employee };
  },

  async refresh(refreshToken: string): Promise<SessionTokensDTO> {
    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized('Session expired. Please log in again.', 'INVALID_REFRESH_TOKEN');
    }

    const user = await User.findById(payload.sub).select(
      '+refreshTokenHash +refreshTokenExpiresAt',
    );
    const incomingHash = hashToken(refreshToken);
    const isCurrentSession =
      !!user &&
      user.refreshTokenHash === incomingHash &&
      !!user.refreshTokenExpiresAt &&
      user.refreshTokenExpiresAt.getTime() > Date.now();

    if (!user || !isCurrentSession) {
      if (user) {
        user.refreshTokenHash = null;
        user.refreshTokenExpiresAt = null;
        await user.save();
      }
      throw AppError.unauthorized('Session expired. Please log in again.', 'SESSION_REVOKED');
    }

    const employee = await findEmployeeSummary(user.id as string);
    const session = issueSession(user, employee?.id);
    await user.save();

    return session;
  },

  async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: null, refreshTokenExpiresAt: null });
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email });
    if (!user) {
      logger.info('Password reset requested for an unknown email (ignored).');
      return;
    }

    const rawToken = generateRandomToken();
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await user.save();
    await sendPasswordResetEmail(user.email, rawToken);
  },

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      throw AppError.badRequest(
        'This reset link is invalid or has expired.',
        'INVALID_RESET_TOKEN',
      );
    }

    user.passwordHash = await User.hashPassword(newPassword);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    user.mustChangePassword = false;
    await user.save();
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw AppError.notFound('User not found.');
    }
    if (!(await user.comparePassword(currentPassword))) {
      throw AppError.badRequest('Current password is incorrect.', 'INVALID_CURRENT_PASSWORD');
    }

    user.passwordHash = await User.hashPassword(newPassword);
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    user.mustChangePassword = false;
    await user.save();
  },

  async me(userId: string): Promise<{ user: AuthUserDTO; employee?: EmployeeSummaryDTO }> {
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found.');
    }

    const employee = await findEmployeeSummary(user.id as string);
    return { user: toAuthUserDTO(user), employee };
  },
};
