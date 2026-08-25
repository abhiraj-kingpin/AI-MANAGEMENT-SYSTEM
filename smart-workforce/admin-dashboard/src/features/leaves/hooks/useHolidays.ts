import { useQuery } from '@tanstack/react-query';
import { fetchHolidays } from '@/features/leaves/api/holidaysApi';

export function useHolidays(year?: number) {
  return useQuery({
    queryKey: ['holidays', year ?? 'all'],
    queryFn: () => fetchHolidays(year),
  });
}
