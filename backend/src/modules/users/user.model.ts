import bcrypt from 'bcryptjs';
import { type Document, type Model, Schema, model } from 'mongoose';
import { ROLES, type Role } from '../../shared/constants/roles';

const BCRYPT_COST = 12;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  refreshTokenHash: string | null;
  refreshTokenExpiresAt: Date | null;
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | null;
  lastLoginAt: Date | null;
  mustChangePassword: boolean;
  // Account lockout (Phase 16) — see auth.service.ts. The original plan
  // (docs/architecture/07-authentication-flow.md §7) named Redis as the
  // failed-attempt counter store; no phase has ever wired Redis into any
  // code (it sits unused in docker-compose, same documented gap as Phase
  // 11's payroll job queue), so this uses plain User fields instead. Same
  // security guarantee, no new infrastructure dependency.
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  // Not in the original docs/architecture/03-database-schema.md#users —
  // added in Phase 12 to back POST /notifications/device-token (listed in
  // the API doc, but the schema doc predates it / has a gap, same kind of
  // documented addition as attendance's request-correction in Phase 5).
  // A plain array (not a sub-schema) since FCM tokens are opaque strings;
  // `$addToSet` in notification.service.ts keeps it deduplicated across a
  // user's devices.
  deviceTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUser> {
  hashPassword(plain: string): Promise<string>;
}

const userSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, index: true },
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String, select: false, default: null },
    refreshTokenExpiresAt: { type: Date, select: false, default: null },
    passwordResetTokenHash: { type: String, select: false, default: null },
    passwordResetExpiresAt: { type: Date, select: false, default: null },
    lastLoginAt: { type: Date, default: null },
    mustChangePassword: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    deviceTokens: { type: [String], default: [] },
  },
  { timestamps: true },
);

// Instance/static helpers live on the model rather than the (future) auth
// service so the "never store a plaintext password" invariant holds no
// matter which code path writes a User.
userSchema.methods.comparePassword = function comparePassword(
  this: IUser,
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
};

export const User = model<IUser, IUserModel>('User', userSchema);
