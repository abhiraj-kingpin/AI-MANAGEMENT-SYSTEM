import { api } from '@/shared/lib/axios';
import type { ApiSuccess, UpdateSettingsInput, WorkspaceSettings } from '@/types/api';

export async function fetchSettings(): Promise<WorkspaceSettings> {
  const res = await api.get<ApiSuccess<WorkspaceSettings>>('/settings');
  return res.data.data;
}

export async function updateSettings(input: UpdateSettingsInput): Promise<WorkspaceSettings> {
  const res = await api.patch<ApiSuccess<WorkspaceSettings>>('/settings', input);
  return res.data.data;
}
