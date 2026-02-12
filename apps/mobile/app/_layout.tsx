import "../global.css";
import { useEffect } from "react";
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

// Only syncs token to store; redirects happen inside routes (avoids "prevent remove context" error)
function TokenSyncAndSlot() {
  const { isSignedIn, getToken } = useAuth();
  const setToken = useAuthStore((s) => s.setToken);

  useEffect(() => {
    const syncToken = async () => {
      if (isSignedIn) {
        const token = await getToken();
        setToken(token);
      } else {
        setToken(null);
      }
    };
    syncToken();
  }, [isSignedIn, getToken, setToken]);

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
