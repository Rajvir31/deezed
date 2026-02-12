import { create } from "zustand";

interface AuthState {
  token: string | null;
  isOnboarded: boolean;
  setToken: (token: string | null) => void;
  setOnboarded: (onboarded: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isOnboarded: false,
  setToken: (token) => set({ token }),
  setOnboarded: (isOnboarded) => set({ isOnboarded }),
  reset: () => set({ token: null, isOnboarded: false }),
}));
