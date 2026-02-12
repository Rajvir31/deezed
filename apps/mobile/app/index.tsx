import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    // Defer so navigator / prevent-remove context is ready
    const t = setTimeout(() => {
      router.replace(isSignedIn ? "/(app)/(tabs)" : "/(auth)/sign-in");
    }, 0);
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0A1A", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }
  return null;
}
