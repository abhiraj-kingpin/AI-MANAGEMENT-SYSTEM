import { z } from 'zod';
import { ROLES } from '../../shared/constants/roles';

export const inviteUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(ROLES).exclude(['super_admin']),
  }),
});

export const listUsersQuerySchema = z.object({
  query: z.object({
    role: z.enum(ROLES).optional(),
  }),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>['body'];
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>['query'];
