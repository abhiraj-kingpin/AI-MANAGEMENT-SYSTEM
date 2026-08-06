import { useQuery } from '@tanstack/react-query';
import { fetchEmployeeCount } from '@/features/employees/api/employeesApi';
import { useAuthStore } from '@/stores/authStore';

/** `GET /employees` is Super Admin/HR/Manager-only server-side — only fire the request for roles that can actually see it, rather than let a plain employee's dashboard 403 in the background. */
export function useHeadcount() {
  const role = useAuthStore((s) => s.user?.role);
  const canView = role === 'super_admin' || role === 'hr' || role === 'manager';

  return useQuery({
    queryKey: ['employees', 'count'],
    queryFn: fetchEmployeeCount,
    enabled: canView,
  });
}
