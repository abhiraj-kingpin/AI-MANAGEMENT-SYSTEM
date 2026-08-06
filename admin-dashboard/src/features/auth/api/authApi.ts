import { api } from '@/shared/lib/axios';
import type { ApiSuccess, LoginResponse } from '@/types/api';

export interface LoginPayload {
  email: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await api.post<ApiSuccess<LoginResponse>>('/auth/login', payload);
  return res.data.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function fetchMe(): Promise<LoginResponse> {
  const res = await api.get<ApiSuccess<LoginResponse>>('/auth/me');
  return res.data.data;
}
