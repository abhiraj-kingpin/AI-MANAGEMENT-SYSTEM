import { api } from '@/shared/lib/axios';
import type { ApiSuccess, Holiday } from '@/types/api';

export async function fetchHolidays(year?: number): Promise<Holiday[]> {
  const res = await api.get<ApiSuccess<Holiday[]>>('/holidays', {
    params: year ? { year } : undefined,
  });
  return res.data.data;
}
