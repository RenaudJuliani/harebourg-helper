import type { StateCreator } from 'zustand';

export type ToastSeverity = 'info' | 'error';

export type Toast = {
  id: string;
  message: string;
  severity: ToastSeverity;
  cta?: { label: string; onClick: () => void };
};

export type ToastSlice = {
  toasts: Toast[];
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
};

let toastCounter = 0;

export const createToastSlice: StateCreator<ToastSlice, [], [], ToastSlice> = (set) => ({
  toasts: [],
  pushToast: (t) =>
    set((s) => ({ toasts: [...s.toasts, { ...t, id: `t${++toastCounter}` }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
});
