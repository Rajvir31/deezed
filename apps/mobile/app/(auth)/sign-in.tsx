import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useSignIn, useAuth } from "@clerk/clerk-expo";
import { Link, Redirect } from "expo-router";

export default function SignInScreen() {
  const { isSignedIn } = useAuth();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
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
      } else if (result.status === "needs_second_factor") {
        setNeeds2FA(true);
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

  const handle2FA = async () => {
    if (!isLoaded || !signIn) return;
    setError("");
    setLoading(true);

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "totp",
        code: totpCode.trim(),
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      } else {
        setError(`Unexpected status: ${result.status}`);
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string; code?: string }> };
      const msg = clerkError.errors?.[0]?.message || "Invalid code";
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
          {!needs2FA ? (
            <>
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
            </>
          ) : (
            <View>
              <Text className="text-white text-lg font-semibold mb-2 text-center">
                Two-Factor Authentication
              </Text>
              <Text className="text-dark-400 text-sm mb-4 text-center">
                Enter the 6-digit code from your authenticator app
              </Text>
              <TextInput
                className="bg-dark-800 text-white px-4 py-3.5 rounded-xl border border-dark-700 text-center text-xl tracking-widest"
                placeholder="000000"
                placeholderTextColor="#6c757d"
                value={totpCode}
                onChangeText={setTotpCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>
          )}

          {error ? (
            <Text className="text-accent-red text-sm text-center">{error}</Text>
          ) : null}

          <TouchableOpacity
            className={`py-4 rounded-xl items-center mt-2 ${isLoaded ? "bg-brand-500" : "bg-brand-500/50"}`}
            onPress={needs2FA ? handle2FA : handleSignIn}
            disabled={loading || !isLoaded}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">
                {needs2FA ? "Verify" : "Sign In"}
              </Text>
            )}
          </TouchableOpacity>

          {needs2FA && (
            <TouchableOpacity
              className="items-center mt-1"
              onPress={() => { setNeeds2FA(false); setTotpCode(""); setError(""); }}
            >
              <Text className="text-dark-400 text-sm">Back to sign in</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        {!needs2FA && (
          <View className="flex-row justify-center mt-8">
            <Text className="text-dark-400">Don't have an account? </Text>
            <Link href="/(auth)/sign-up">
              <Text className="text-brand-400 font-semibold">Sign Up</Text>
            </Link>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
