import { AppError } from '../../shared/errors/AppError';
import type { ActorContext } from '../../shared/types/actorContext';
import { assertRoleAssignable } from '../../shared/utils/roleAssignment';
import { generateRandomToken, hashToken } from '../../shared/utils/tokens';
import { recordAudit } from '../audit/audit.service';
import { Employee } from '../employees/employee.model';
import { sendPasswordResetEmail } from '../notifications/email.service';
import { User } from './user.model';
import type { ConsoleUserDTO } from './user.types';
import type { InviteUserInput, ListUsersQuery } from './user.validators';

// Longer than the 15-minute self-serve "forgot password" window — an
// invited person may not open the email right away.
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const userService = {
  async list(query: ListUsersQuery): Promise<ConsoleUserDTO[]> {
    const filter: Record<string, unknown> = {};
    if (query.role) filter.role = query.role;

    const users = await User.find(filter).sort({ createdAt: -1 });
    const employees = await Employee.find({ userId: { $in: users.map((u) => u._id) } }).select(
      'userId firstName lastName',
    );
    const nameByUserId = new Map(
      employees.map((e) => [String(e.userId), `${e.firstName} ${e.lastName}`]),
    );

    return users.map((user) => ({
      id: user.id as string,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      accountClaimed: user.accountClaimed,
      lastLoginAt: user.lastLoginAt,
      employeeName: nameByUserId.get(String(user._id)) ?? null,
      createdAt: user.createdAt,
    }));
  },

  // Console-only access (no Employee record) — for someone who needs to
  // sign into the admin console but isn't themselves on the roster. An HR
  // account's own login already comes from employeeService.createEmployee;
  // this is the other path in, gated the same way (assertRoleAssignable).
  async invite(input: InviteUserInput, actor: ActorContext): Promise<ConsoleUserDTO> {
    assertRoleAssignable(actor.role, input.role);

    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw AppError.conflict('An account with this email already exists.', 'EMAIL_TAKEN');
    }

    const passwordHash = await User.hashPassword(generateRandomToken(24));
    const user = await User.create({
      email: input.email,
      passwordHash,
      role: input.role,
      accountClaimed: false,
      mustChangePassword: true,
    });

    const rawToken = generateRandomToken();
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await user.save();
    await sendPasswordResetEmail(user.email, rawToken);

    await recordAudit({
      actorId: actor.id,
      action: 'user.invite',
      entityType: 'User',
      entityId: user.id as string,
      before: null,
      after: { email: user.email, role: user.role },
    });

    return {
      id: user.id as string,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      accountClaimed: user.accountClaimed,
      lastLoginAt: user.lastLoginAt,
      employeeName: null,
      createdAt: user.createdAt,
    };
  },
};
