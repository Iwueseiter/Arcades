import { create } from 'zustand';

export type Toast = { id: number; tone: 'success' | 'error' | 'info'; title: string; body?: string };

type ToastState = {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-2), { ...toast, id }] });
    setTimeout(() => get().dismiss(id), toast.tone === 'error' ? 6000 : 3800);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));

export const toast = {
  success: (title: string, body?: string) => useToastStore.getState().push({ tone: 'success', title, body }),
  error: (title: string, body?: string) => useToastStore.getState().push({ tone: 'error', title, body }),
  info: (title: string, body?: string) => useToastStore.getState().push({ tone: 'info', title, body }),
};
