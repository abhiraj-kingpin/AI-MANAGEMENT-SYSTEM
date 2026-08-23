import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchAttendance } from '@/features/attendance/api/attendanceApi';
import type { ListAttendanceQuery } from '@/types/api';

export function useAttendance(query: ListAttendanceQuery) {
  return useQuery({
    queryKey: ['attendance', 'list', query],
    queryFn: () => fetchAttendance(query),
    placeholderData: keepPreviousData,
  });
}
