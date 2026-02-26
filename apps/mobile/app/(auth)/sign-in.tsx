import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useSignIn, useAuth } from "@clerk/clerk-expo";
import { Link, Redirect } from "expo-router";

export default function SignInScreen() {
  const { isSignedIn } = useAuth();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isSignedIn) return <Redirect href="/(app)/(tabs)" />;

  const handleSignIn = async () => {
    if (!isLoaded || !signIn) {
      setError("Still loading, please wait…");
      return;
    }
    if (isSignedIn) return;
    setError("");
    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      } else {
        setError(`Unexpected status: ${result.status}`);
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string; code?: string }> };
      const msg = clerkError.errors?.[0]?.message || "Sign in failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-dark-900"
    >
      <View className="flex-1 justify-center px-8">
        {/* Logo / Brand */}
        <View className="items-center mb-12">
          <Text className="text-5xl font-bold text-white tracking-tight">
            DEEZED
          </Text>
          <Text className="text-dark-400 text-base mt-2">
            AI-Powered Workout Intelligence
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          <View>
            <Text className="text-dark-300 text-sm mb-2 font-medium">Email</Text>
            <TextInput
              className="bg-dark-800 text-white px-4 py-3.5 rounded-xl border border-dark-700"
              placeholder="you@example.com"
              placeholderTextColor="#6c757d"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View>
            <Text className="text-dark-300 text-sm mb-2 font-medium">Password</Text>
            <TextInput
              className="bg-dark-800 text-white px-4 py-3.5 rounded-xl border border-dark-700"
              placeholder="••••••••"
              placeholderTextColor="#6c757d"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {error ? (
            <Text className="text-accent-red text-sm text-center">{error}</Text>
          ) : null}

          <TouchableOpacity
            className={`py-4 rounded-xl items-center mt-2 ${isLoaded ? "bg-brand-500" : "bg-brand-500/50"}`}
            onPress={handleSignIn}
            disabled={loading || !isLoaded}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="flex-row justify-center mt-8">
          <Text className="text-dark-400">Don't have an account? </Text>
          <Link href="/(auth)/sign-up">
            <Text className="text-brand-400 font-semibold">Sign Up</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
