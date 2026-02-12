import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useSignUp, useAuth } from "@clerk/clerk-expo";
import { Link, Redirect } from "expo-router";

export default function SignUpScreen() {
  const { isSignedIn } = useAuth();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isSignedIn) return <Redirect href="/(app)/(tabs)" />;

  const handleSignUp = async () => {
    if (!isLoaded) return;
    setError("");
    setLoading(true);

    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(clerkError.errors?.[0]?.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded) return;
    setError("");
    setLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(clerkError.errors?.[0]?.message || "Verification failed");
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
        <View className="items-center mb-12">
          <Text className="text-5xl font-bold text-white tracking-tight">
            DEEZED
          </Text>
          <Text className="text-dark-400 text-base mt-2">
            Create your account
          </Text>
        </View>

        {!pendingVerification ? (
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
              className="bg-brand-500 py-4 rounded-xl items-center mt-2"
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-4">
            <Text className="text-white text-center text-base mb-2">
              We sent a verification code to {email}
            </Text>

            <TextInput
              className="bg-dark-800 text-white px-4 py-3.5 rounded-xl border border-dark-700 text-center text-xl tracking-widest"
              placeholder="000000"
              placeholderTextColor="#6c757d"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />

            {error ? (
              <Text className="text-accent-red text-sm text-center">{error}</Text>
            ) : null}

            <TouchableOpacity
              className="bg-brand-500 py-4 rounded-xl items-center"
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Verify Email</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-row justify-center mt-8">
          <Text className="text-dark-400">Already have an account? </Text>
          <Link href="/(auth)/sign-in">
            <Text className="text-brand-400 font-semibold">Sign In</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
