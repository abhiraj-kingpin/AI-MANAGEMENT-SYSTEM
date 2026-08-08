import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchAttendance } from '@/features/attendance/api/attendanceApi';
import type { ListAttendanceQuery } from '@/types/api';

/** `GET /attendance` is Super Admin/HR/Manager only server-side — this screen is only reachable by those roles (see Sidebar/router), so no client-side `enabled` gate is needed here. */
export function useAttendance(query: ListAttendanceQuery) {
  return useQuery({
    queryKey: ['attendance', 'list', query],
    queryFn: () => fetchAttendance(query),
    placeholderData: keepPreviousData,
  });
}
