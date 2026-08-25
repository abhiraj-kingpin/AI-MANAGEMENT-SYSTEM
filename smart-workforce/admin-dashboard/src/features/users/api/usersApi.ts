import { api } from '@/shared/lib/axios';
import type { ApiSuccess, ConsoleUser, InviteUserInput } from '@/types/api';

export async function fetchConsoleUsers(): Promise<ConsoleUser[]> {
  const res = await api.get<ApiSuccess<ConsoleUser[]>>('/users');
  return res.data.data;
}

export async function inviteConsoleUser(input: InviteUserInput): Promise<ConsoleUser> {
  const res = await api.post<ApiSuccess<ConsoleUser>>('/users/invite', input);
  return res.data.data;
}
