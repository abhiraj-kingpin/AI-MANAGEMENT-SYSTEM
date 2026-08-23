import { useQuery } from '@tanstack/react-query';
import { fetchEmployeeCount } from '@/features/employees/api/employeesApi';
import { useAuthStore } from '@/stores/authStore';

export function useHeadcount() {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === 'super_admin' || role === 'hr' || role === 'manager';

  return useQuery({
    queryKey: ['employees', 'count'],
    queryFn: fetchEmployeeCount,
    enabled: canView,
  });
}
