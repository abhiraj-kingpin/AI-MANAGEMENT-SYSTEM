import { api } from '@/shared/lib/axios';
import type {
  ApiSuccess,
  AssignShiftInput,
  CreateShiftInput,
  Shift,
  ShiftAssignment,
  UpdateShiftInput,
} from '@/types/api';

export async function fetchShifts(includeInactive = false): Promise<Shift[]> {
  const res = await api.get<ApiSuccess<Shift[]>>('/shifts', {
    params: includeInactive ? { includeInactive: 'true' } : undefined,
  });
  return res.data.data;
}

export async function createShift(input: CreateShiftInput): Promise<Shift> {
  const res = await api.post<ApiSuccess<{ shift: Shift }>>('/shifts', input);
  return res.data.data.shift;
}

export async function updateShift(id: string, input: UpdateShiftInput): Promise<Shift> {
  const res = await api.patch<ApiSuccess<{ shift: Shift }>>(`/shifts/${id}`, input);
  return res.data.data.shift;
}

export async function deactivateShift(id: string): Promise<void> {
  await api.delete<ApiSuccess<{ status: string }>>(`/shifts/${id}`);
}

export async function fetchMyShift(): Promise<ShiftAssignment | null> {
  const res = await api.get<ApiSuccess<{ assignment: ShiftAssignment | null }>>('/shifts/me');
  return res.data.data.assignment;
}

export async function assignShift(input: AssignShiftInput): Promise<ShiftAssignment> {
  const res = await api.post<ApiSuccess<{ assignment: ShiftAssignment }>>('/shifts/assign', input);
  return res.data.data.assignment;
}
