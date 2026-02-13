import "../global.css";
import { useEffect, useRef, useCallback } from "react";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/stores/auth";
// Workaround: native-stack's NativeStackView requires PreventRemoveContext (expo-router can mount Stack before provider is ready)
import { PreventRemoveContext } from "@react-navigation/native";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 2 },
  },
});

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

// Clerk JWTs expire after ~60s. Refresh every 45s to keep the token valid.
const TOKEN_REFRESH_INTERVAL_MS = 45_000;

// Syncs Clerk token to Zustand store and refreshes it periodically
function TokenSyncAndSlot() {
  const { isSignedIn, getToken } = useAuth();
  const setToken = useAuthStore((s) => s.setToken);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncToken = useCallback(async () => {
    if (isSignedIn) {
      const token = await getToken();
      setToken(token);
    } else {
      setToken(null);
    }
  }, [isSignedIn, getToken, setToken]);

  useEffect(() => {
    // Sync immediately
    syncToken();

    // Refresh periodically while signed in
    if (isSignedIn) {
      intervalRef.current = setInterval(syncToken, TOKEN_REFRESH_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isSignedIn, syncToken]);

  return <Slot />;
}

const noopPreventRemoveContext = {
  setPreventRemove: () => {},
  preventedRoutes: {} as Record<string, { preventRemove: boolean }>,
};

export default function RootLayout() {
  return (
    <PreventRemoveContext.Provider value={noopPreventRemoveContext}>
      <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <TokenSyncAndSlot />
        </QueryClientProvider>
      </ClerkProvider>
    </PreventRemoveContext.Provider>
  );
}
