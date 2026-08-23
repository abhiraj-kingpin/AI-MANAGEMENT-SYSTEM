import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { login, type LoginPayload } from '@/features/auth/api/authApi';
import { useAuthStore } from '@/stores/authStore';

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (data) => {
      setAuth({ accessToken: data.accessToken, user: data.user, employee: data.employee });
      navigate('/', { replace: true });
    },
  });
}
