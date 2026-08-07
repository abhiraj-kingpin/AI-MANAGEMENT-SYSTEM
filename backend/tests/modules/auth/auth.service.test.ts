import { hashToken, signRefreshToken } from '../../../src/shared/utils/tokens';
import { mockQuery } from '../../utils/mockQuery';

// Service-layer unit tests: the Mongoose models are mocked so this suite
// runs with no live database, per docs/architecture/01-software-architecture.md
// §4 ("services can be unit-tested without spinning up ... a real DB").
// Schema-level correctness (required fields, indexes, validators) is already
// covered separately in tests/models/*.test.ts against the real schemas.
jest.mock('../../../src/modules/users/user.model', () => ({
  User: {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    hashPassword: jest.fn((plain: string) => Promise.resolve(`hashed:${plain}`)),
  },
}));

jest.mock('../../../src/modules/employees/employee.model', () => ({
  Employee: { findOne: jest.fn() },
}));

jest.mock('../../../src/modules/notifications/email.service', () => ({
  sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
}));

import { authService } from '../../../src/modules/auth/auth.service';
import { Employee } from '../../../src/modules/employees/employee.model';
import { sendPasswordResetEmail } from '../../../src/modules/notifications/email.service';
import { User } from '../../../src/modules/users/user.model';

const mockedUserFindOne = User.findOne as unknown as jest.Mock;
const mockedUserFindById = User.findById as unknown as jest.Mock;
const mockedUserCreate = User.create as unknown as jest.Mock;
const mockedEmployeeFindOne = Employee.findOne as unknown as jest.Mock;
const mockedSendPasswordResetEmail = sendPasswordResetEmail as unknown as jest.Mock;

interface FakeUserOverrides {
  id?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  passwordHash?: string;
  refreshTokenHash?: string | null;
  refreshTokenExpiresAt?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
  mustChangePassword?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
}

function createFakeUser(overrides: FakeUserOverrides = {}) {
  return {
    id: 'user-1',
    email: 'jane@acme.com',
    role: 'employee',
    isActive: true,
    passwordHash: 'hashed:correct-password',
    refreshTokenHash: null as string | null,
    refreshTokenExpiresAt: null as Date | null,
    passwordResetTokenHash: null as string | null,
    passwordResetExpiresAt: null as Date | null,
    mustChangePassword: false,
    lastLoginAt: null as Date | null,
    failedLoginAttempts: 0,
    lockedUntil: null as Date | null,
    comparePassword: jest.fn((candidate: string) =>
      Promise.resolve(candidate === 'correct-password'),
    ),
    save: jest.fn(function save(this: unknown) {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

const fakeEmployee = {
  id: 'emp-1',
  employeeCode: 'EMP-0001',
  firstName: 'Jane',
  lastName: 'Doe',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authService.login', () => {
  it('returns tokens + DTOs and persists a new session hash on success', async () => {
    const fakeUser = createFakeUser();
    mockedUserFindOne.mockReturnValue(mockQuery(fakeUser));
    mockedEmployeeFindOne.mockReturnValue(mockQuery(fakeEmployee));

    const result = await authService.login('jane@acme.com', 'correct-password');

    expect(result.user).toEqual({
      id: 'user-1',
      email: 'jane@acme.com',
      role: 'employee',
      mustChangePassword: false,
    });
    expect(result.employee?.employeeCode).toBe('EMP-0001');
    expect(result.accessToken).toEqual(expect.any(String));
    expect(fakeUser.refreshTokenHash).toBe(hashToken(result.refreshToken));
    expect(fakeUser.save).toHaveBeenCalledTimes(1);
  });

  it('rejects a wrong password', async () => {
    mockedUserFindOne.mockReturnValue(mockQuery(createFakeUser()));

    await expect(authService.login('jane@acme.com', 'wrong-password')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      statusCode: 401,
    });
  });

  it('rejects a deactivated account', async () => {
    mockedUserFindOne.mockReturnValue(mockQuery(createFakeUser({ isActive: false })));

    await expect(authService.login('jane@acme.com', 'correct-password')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('rejects an unknown email without revealing that it is unknown', async () => {
    mockedUserFindOne.mockReturnValue(mockQuery(null));

    await expect(authService.login('nobody@acme.com', 'x')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('increments the failed-attempt counter on a wrong password without locking under the threshold', async () => {
    const fakeUser = createFakeUser({ failedLoginAttempts: 2 });
    mockedUserFindOne.mockReturnValue(mockQuery(fakeUser));

    await expect(authService.login('jane@acme.com', 'wrong-password')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });

    expect(fakeUser.failedLoginAttempts).toBe(3);
    expect(fakeUser.lockedUntil).toBeNull();
    expect(fakeUser.save).toHaveBeenCalledTimes(1);
  });

  it('locks the account once failed attempts reach the threshold', async () => {
    const fakeUser = createFakeUser({ failedLoginAttempts: 4 }); // one more tips it over
    mockedUserFindOne.mockReturnValue(mockQuery(fakeUser));

    await expect(authService.login('jane@acme.com', 'wrong-password')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });

    expect(fakeUser.failedLoginAttempts).toBe(5);
    expect(fakeUser.lockedUntil).toBeInstanceOf(Date);
    expect(fakeUser.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects an already-locked account before ever checking the password — and does not consume another attempt', async () => {
    const fakeUser = createFakeUser({
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 10 * 60_000),
    });
    mockedUserFindOne.mockReturnValue(mockQuery(fakeUser));

    await expect(authService.login('jane@acme.com', 'correct-password')).rejects.toMatchObject({
      code: 'ACCOUNT_LOCKED',
      statusCode: 423,
    });

    expect(fakeUser.comparePassword).not.toHaveBeenCalled();
    expect(fakeUser.failedLoginAttempts).toBe(5); // unchanged
    expect(fakeUser.save).not.toHaveBeenCalled();
  });

  it('treats an expired lock as fully reset, not resumed, on the next failure', async () => {
    const fakeUser = createFakeUser({
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() - 1000), // expired a second ago
    });
    mockedUserFindOne.mockReturnValue(mockQuery(fakeUser));

    await expect(authService.login('jane@acme.com', 'wrong-password')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });

    expect(fakeUser.failedLoginAttempts).toBe(1); // restarted, not 6
    expect(fakeUser.lockedUntil).toBeNull();
  });

  it('clears the failed-attempt counter on a successful login', async () => {
    const fakeUser = createFakeUser({ failedLoginAttempts: 3 });
    mockedUserFindOne.mockReturnValue(mockQuery(fakeUser));
    mockedEmployeeFindOne.mockReturnValue(mockQuery(fakeEmployee));

    await authService.login('jane@acme.com', 'correct-password');

    expect(fakeUser.failedLoginAttempts).toBe(0);
    expect(fakeUser.lockedUntil).toBeNull();
  });
});

describe('authService.register', () => {
  it('creates a user that must change its password on first login', async () => {
    mockedUserFindOne.mockReturnValue(mockQuery(null));
    mockedUserCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: 'new-user-id', ...data }),
    );

    const dto = await authService.register(
      { email: 'new@acme.com', password: 'whatever123', role: 'employee' },
      'super_admin',
    );

    expect(dto).toEqual({
      id: 'new-user-id',
      email: 'new@acme.com',
      role: 'employee',
      mustChangePassword: true,
    });
  });

  it('rejects a duplicate email', async () => {
    mockedUserFindOne.mockReturnValue(mockQuery(createFakeUser()));

    await expect(
      authService.register(
        { email: 'jane@acme.com', password: 'x', role: 'employee' },
        'super_admin',
      ),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('blocks HR from creating hr/super_admin accounts (privilege-escalation guard)', async () => {
    await expect(
      authService.register({ email: 'x@acme.com', password: 'x', role: 'hr' }, 'hr'),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_ASSIGNABLE' });

    expect(mockedUserFindOne).not.toHaveBeenCalled(); // rejected before ever touching the DB
  });

  it('lets HR create manager/employee accounts', async () => {
    mockedUserFindOne.mockReturnValue(mockQuery(null));
    mockedUserCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: 'x', ...data }),
    );

    await expect(
      authService.register({ email: 'x@acme.com', password: 'x', role: 'manager' }, 'hr'),
    ).resolves.toMatchObject({ role: 'manager' });
  });
});

describe('authService.refresh', () => {
  it('rotates the session when the incoming token matches the stored hash', async () => {
    const { token: oldRefreshToken, expiresAt } = signRefreshToken('user-1');
    const fakeUser = createFakeUser({
      refreshTokenHash: hashToken(oldRefreshToken),
      refreshTokenExpiresAt: expiresAt,
    });
    mockedUserFindById.mockReturnValue(mockQuery(fakeUser));
    mockedEmployeeFindOne.mockReturnValue(mockQuery(null));

    const result = await authService.refresh(oldRefreshToken);

    expect(result.refreshToken).not.toBe(oldRefreshToken);
    expect(fakeUser.refreshTokenHash).toBe(hashToken(result.refreshToken));
    expect(fakeUser.save).toHaveBeenCalledTimes(1);
  });

  it('revokes the session on reuse of an already-rotated token', async () => {
    const { token: staleToken } = signRefreshToken('user-1');
    const fakeUser = createFakeUser({
      refreshTokenHash: 'hash-from-a-later-rotation', // doesn't match staleToken's hash
      refreshTokenExpiresAt: new Date(Date.now() + 60_000),
    });
    mockedUserFindById.mockReturnValue(mockQuery(fakeUser));

    await expect(authService.refresh(staleToken)).rejects.toMatchObject({
      code: 'SESSION_REVOKED',
    });
    expect(fakeUser.refreshTokenHash).toBeNull();
    expect(fakeUser.save).toHaveBeenCalledTimes(1);
  });

  it('rejects a forged/invalid token before ever touching the database', async () => {
    await expect(authService.refresh('not-a-real-jwt')).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    });
    expect(mockedUserFindById).not.toHaveBeenCalled();
  });

  it('rejects an expired-but-otherwise-matching session', async () => {
    const { token } = signRefreshToken('user-1');
    const fakeUser = createFakeUser({
      refreshTokenHash: hashToken(token),
      refreshTokenExpiresAt: new Date(Date.now() - 1000),
    });
    mockedUserFindById.mockReturnValue(mockQuery(fakeUser));

    await expect(authService.refresh(token)).rejects.toMatchObject({ code: 'SESSION_REVOKED' });
  });
});

describe('authService.forgotPassword', () => {
  it('stores a hashed reset token and sends the email', async () => {
    const fakeUser = createFakeUser();
    mockedUserFindOne.mockReturnValue(mockQuery(fakeUser));

    await authService.forgotPassword('jane@acme.com');

    expect(fakeUser.passwordResetTokenHash).toEqual(expect.any(String));
    expect(fakeUser.passwordResetExpiresAt).toBeInstanceOf(Date);
    expect(mockedSendPasswordResetEmail).toHaveBeenCalledWith('jane@acme.com', expect.any(String));
  });

  it('resolves silently for an unknown email (no user enumeration)', async () => {
    mockedUserFindOne.mockReturnValue(mockQuery(null));

    await expect(authService.forgotPassword('nobody@acme.com')).resolves.toBeUndefined();
    expect(mockedSendPasswordResetEmail).not.toHaveBeenCalled();
  });
});

describe('authService.resetPassword', () => {
  it('accepts a valid token and clears reset + session state', async () => {
    const fakeUser = createFakeUser({
      passwordResetTokenHash: hashToken('raw-reset-token'),
      passwordResetExpiresAt: new Date(Date.now() + 60_000),
      refreshTokenHash: 'stale-session',
    });
    mockedUserFindOne.mockReturnValue(mockQuery(fakeUser));

    await authService.resetPassword('raw-reset-token', 'new-password-123');

    expect(fakeUser.passwordHash).toBe('hashed:new-password-123');
    expect(fakeUser.passwordResetTokenHash).toBeNull();
    expect(fakeUser.refreshTokenHash).toBeNull(); // forces re-login everywhere
  });

  it('rejects an unknown or expired token', async () => {
    mockedUserFindOne.mockReturnValue(mockQuery(null));

    await expect(authService.resetPassword('bad-token', 'new-password-123')).rejects.toMatchObject({
      code: 'INVALID_RESET_TOKEN',
    });
  });
});

describe('authService.changePassword', () => {
  it('updates the password and invalidates the current session on success', async () => {
    const fakeUser = createFakeUser({ refreshTokenHash: 'existing-session' });
    mockedUserFindById.mockReturnValue(mockQuery(fakeUser));

    await authService.changePassword('user-1', 'correct-password', 'brand-new-password');

    expect(fakeUser.passwordHash).toBe('hashed:brand-new-password');
    expect(fakeUser.refreshTokenHash).toBeNull();
  });

  it('rejects an incorrect current password', async () => {
    mockedUserFindById.mockReturnValue(mockQuery(createFakeUser()));

    await expect(
      authService.changePassword('user-1', 'wrong-current', 'brand-new-password'),
    ).rejects.toMatchObject({ code: 'INVALID_CURRENT_PASSWORD' });
  });
});

describe('authService.me', () => {
  it('returns the user plus employee summary', async () => {
    mockedUserFindById.mockReturnValue(mockQuery(createFakeUser()));
    mockedEmployeeFindOne.mockReturnValue(mockQuery(fakeEmployee));

    const result = await authService.me('user-1');

    expect(result.user.email).toBe('jane@acme.com');
    expect(result.employee?.employeeCode).toBe('EMP-0001');
  });

  it('throws NOT_FOUND if the user no longer exists', async () => {
    mockedUserFindById.mockReturnValue(mockQuery(null));

    await expect(authService.me('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
