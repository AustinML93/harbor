import { create } from "zustand";
import type { ContainerSummary, SystemStats } from "../types";

interface AuthState {
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
}

interface LiveState {
  stats: SystemStats | null;
  containers: ContainerSummary[];
  wsConnected: boolean;
  setStats: (stats: SystemStats) => void;
  setContainers: (containers: ContainerSummary[]) => void;
  setWsConnected: (connected: boolean) => void;
}

interface ThemeState {
  theme: "dark" | "light";
  toggleTheme: () => void;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

function loadTheme(): "dark" | "light" {
  const stored = localStorage.getItem("harbor_theme");
  return stored === "light" ? "light" : "dark";
}

function applyTheme(theme: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("harbor_theme", theme);
}

const initialTheme = loadTheme();
applyTheme(initialTheme);

export const useStore = create<AuthState & LiveState & ThemeState & ToastState>((set) => ({
  // Auth
  isAuthenticated: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),

  // Live data from WebSocket
  stats: null,
  containers: [],
  wsConnected: false,
  setStats: (stats) => set({ stats }),
  setContainers: (containers) => set({ containers }),
  setWsConnected: (connected) => set({ wsConnected: connected }),

  // Theme
  theme: initialTheme,
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      return { theme: next };
    }),

  // Toasts
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
