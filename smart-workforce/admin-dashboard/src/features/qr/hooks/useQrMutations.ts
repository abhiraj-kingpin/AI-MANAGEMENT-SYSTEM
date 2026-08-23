import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateQr, revokeQr } from '@/features/qr/api/qrApi';
import type { GenerateQrInput } from '@/types/api';

export function useGenerateQr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateQrInput) => generateQr(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qr'] }),
  });
}

export function useRevokeQr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeQr(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qr'] }),
  });
}
