import { create } from "zustand";

type GetTokenFn = () => Promise<string | null>;

interface AuthState {
  token: string | null;
  isOnboarded: boolean;
  getTokenFn: GetTokenFn | null;
  setToken: (token: string | null) => void;
  setOnboarded: (onboarded: boolean) => void;
  setGetTokenFn: (fn: GetTokenFn) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isOnboarded: false,
  getTokenFn: null,
  setToken: (token) => set({ token }),
  setOnboarded: (isOnboarded) => set({ isOnboarded }),
  setGetTokenFn: (getTokenFn) => set({ getTokenFn }),
  reset: () => set({ token: null, isOnboarded: false }),
}));

/**
 * Get a fresh Clerk token — tries the stored getToken() from Clerk first,
 * falls back to the cached token in the store.
 */
export async function getFreshToken(): Promise<string | null> {
  const { getTokenFn, token } = useAuthStore.getState();
  if (getTokenFn) {
    try {
      const fresh = await getTokenFn();
      if (fresh) {
        useAuthStore.getState().setToken(fresh);
        return fresh;
      }
    } catch {}
  }
  return token;
}
