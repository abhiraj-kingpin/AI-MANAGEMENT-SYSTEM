import { create } from 'zustand';

/** Bottom-centre toast used by every mutating action across the console —
 *  approve, decline, release, export, invite, publish, regenerate, ... — so
 *  one action always confirms the same way regardless of which page it's
 *  on. Auto-dismisses; see Toast.tsx for the timer. */
interface ToastState {
  message: string | null;
  push: (message: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  push: (message) => set({ message }),
  clear: () => set({ message: null }),
}));

export function pushToast(message: string): void {
  useToastStore.getState().push(message);
}
