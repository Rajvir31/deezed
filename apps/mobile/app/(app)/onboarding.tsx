import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useOnboardingStore } from "@/stores/onboarding";
import { useAuthStore } from "@/stores/auth";
import { useUpdateProfile } from "@/api/hooks/useProfile";
import { useGeneratePlan } from "@/api/hooks/usePlan";
import { API_BASE_URL } from "@/api/client";
import {
  EXPERIENCE_LEVELS,
  TRAINING_GOALS,
  EQUIPMENT_OPTIONS,
  SPLIT_RECOMMENDATIONS,
  type ExperienceLevel,
  type TrainingGoal,
  type EquipmentAccess,
} from "@deezed/shared";

const STEP_TITLES = ["Your Name", "Experience", "Goal", "Schedule", "Equipment", "Almost Done"];

function OptionButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className={`px-5 py-3.5 rounded-xl border mb-3 ${
        selected
          ? "bg-brand-500/20 border-brand-500"
          : "bg-dark-800 border-dark-700"
      }`}
      onPress={onPress}
    >
      <Text className={`text-base ${selected ? "text-brand-300 font-semibold" : "text-white"}`}>
        {formatLabel(label)}
      </Text>
    </TouchableOpacity>
  );
}

function formatLabel(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OnboardingScreen() {
  const { getToken } = useAuth();
  const store = useOnboardingStore();
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const setToken = useAuthStore((s) => s.setToken);
  const updateProfile = useUpdateProfile();
  const generatePlan = useGeneratePlan();
  const router = useRouter();
  const [injury, setInjury] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [networkError, setNetworkError] = useState("");

  const canAdvance = (): boolean => {
    switch (store.step) {
      case 0: return store.displayName.length >= 1;
      case 1: return store.experienceLevel !== null;
      case 2: return store.goal !== null;
      case 3: return store.daysPerWeek >= 2 && store.daysPerWeek <= 7;
      case 4: return store.equipment.length >= 1;
      case 5: return true;
      default: return false;
    }
  };

  const handleNext = async () => {
    if (store.step < 5) {
      store.setStep(store.step + 1);
      return;
    }

    // Final step - save profile, then generate plan
    setLoading(true);
    setNetworkError("");
    setLoadingMessage("Saving your profile...");
    try {
      // Ensure we have a fresh Clerk token so the API can verify the request
      const token = await getToken();
      if (!token) {
        setNetworkError("Session not ready. Please sign out and sign back in, then try again.");
        return;
      }
      setToken(token);

      await updateProfile.mutateAsync({
        displayName: store.displayName,
        experienceLevel: store.experienceLevel!,
        goal: store.goal!,
        daysPerWeek: store.daysPerWeek,
        equipment: store.equipment,
        injuries: store.injuries,
      });

      // Profile saved — generate the workout plan (this calls OpenAI so it can take 20-30s)
      setLoadingMessage("Generating your workout plan with AI...\nThis may take up to 30 seconds.");

      try {
        await generatePlan.mutateAsync();
      } catch (planErr) {
        // Plan generation failed but profile is saved — let user proceed anyway
        console.error("Plan generation failed:", planErr);
      }

      setOnboarded(true);
      store.reset();
      router.replace("/(app)/(tabs)");
    } catch (err) {
      console.error("Onboarding error:", err);
      const isNetworkError =
        err instanceof TypeError && (err.message === "Network request failed" || err.message?.includes("Network"));
      const isAuthError = err instanceof Error && err.message === "Authentication failed";
      if (isNetworkError) {
        setNetworkError(
          `Can't reach API at ${API_BASE_URL}. Use your PC's Wi‑Fi IP (ipconfig → "Wireless LAN adapter Wi‑Fi" → IPv4, e.g. 192.168.1.x), not 172.19.x.x. Set EXPO_PUBLIC_API_URL in apps/mobile/.env then restart Expo (stop + npm run dev:mobile). Allow port 3001 in Windows Firewall if needed.`
        );
      } else if (isAuthError) {
        setNetworkError(
          "Authentication failed. Make sure CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY in apps/api/.env match your Clerk app. Then try signing out and back in."
        );
      } else {
        setNetworkError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const recommendedSplit = SPLIT_RECOMMENDATIONS[store.daysPerWeek] || "upper_lower";

  return (
    <View className="flex-1 bg-dark-900">
      <ScrollView className="flex-1 px-6 pt-16" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Progress */}
        <View className="flex-row gap-1.5 mb-8">
          {STEP_TITLES.map((_, i) => (
            <View
              key={i}
              className={`flex-1 h-1 rounded-full ${
                i <= store.step ? "bg-brand-500" : "bg-dark-700"
              }`}
            />
          ))}
        </View>

        <Text className="text-3xl font-bold text-white mb-2">
          {STEP_TITLES[store.step]}
        </Text>

        {/* Step 0: Name */}
        {store.step === 0 && (
          <View className="mt-6">
            <Text className="text-dark-300 mb-4">What should we call you?</Text>
            <TextInput
              className="bg-dark-800 text-white px-4 py-3.5 rounded-xl border border-dark-700 text-lg"
              placeholder="Your name"
              placeholderTextColor="#6c757d"
              value={store.displayName}
              onChangeText={store.setDisplayName}
            />
          </View>
        )}

        {/* Step 1: Experience */}
        {store.step === 1 && (
          <View className="mt-6">
            <Text className="text-dark-300 mb-4">How long have you been training?</Text>
            {EXPERIENCE_LEVELS.map((level) => (
              <OptionButton
                key={level}
                label={level}
                selected={store.experienceLevel === level}
                onPress={() => store.setExperienceLevel(level as ExperienceLevel)}
              />
            ))}
          </View>
        )}

        {/* Step 2: Goal */}
        {store.step === 2 && (
          <View className="mt-6">
            <Text className="text-dark-300 mb-4">What's your primary training goal?</Text>
            {TRAINING_GOALS.map((goal) => (
              <OptionButton
                key={goal}
                label={goal}
                selected={store.goal === goal}
                onPress={() => store.setGoal(goal as TrainingGoal)}
              />
            ))}
          </View>
        )}

        {/* Step 3: Days/Week */}
        {store.step === 3 && (
          <View className="mt-6">
            <Text className="text-dark-300 mb-4">How many days per week can you train?</Text>
            <View className="flex-row flex-wrap gap-3">
              {[2, 3, 4, 5, 6].map((d) => (
                <TouchableOpacity
                  key={d}
                  className={`w-16 h-16 rounded-xl items-center justify-center border ${
                    store.daysPerWeek === d
                      ? "bg-brand-500/20 border-brand-500"
                      : "bg-dark-800 border-dark-700"
                  }`}
                  onPress={() => store.setDaysPerWeek(d)}
                >
                  <Text
                    className={`text-xl font-bold ${
                      store.daysPerWeek === d ? "text-brand-300" : "text-white"
                    }`}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="mt-6 bg-dark-800 p-4 rounded-xl border border-dark-700">
              <Text className="text-brand-400 font-semibold mb-1">
                Recommended Split
              </Text>
              <Text className="text-white text-lg">{formatLabel(recommendedSplit)}</Text>
              <Text className="text-dark-400 text-sm mt-1">
                {store.daysPerWeek <= 3
                  ? "Full body training maximizes frequency for each muscle group."
                  : store.daysPerWeek === 4
                    ? "Upper/Lower lets you train each muscle twice per week."
                    : "Push/Pull/Legs gives dedicated focus to each movement pattern."}
              </Text>
            </View>
          </View>
        )}

        {/* Step 4: Equipment */}
        {store.step === 4 && (
          <View className="mt-6">
            <Text className="text-dark-300 mb-4">What equipment do you have access to?</Text>
            {EQUIPMENT_OPTIONS.map((eq) => (
              <OptionButton
                key={eq}
                label={eq}
                selected={store.equipment.includes(eq)}
                onPress={() => store.toggleEquipment(eq as EquipmentAccess)}
              />
            ))}
          </View>
        )}

        {/* Step 5: Injuries + Summary */}
        {store.step === 5 && (
          <View className="mt-6">
            <Text className="text-dark-300 mb-4">
              Any injuries or limitations? (optional)
            </Text>

            <View className="flex-row gap-2 mb-4">
              <TextInput
                className="flex-1 bg-dark-800 text-white px-4 py-3 rounded-xl border border-dark-700"
                placeholder="e.g., bad lower back"
                placeholderTextColor="#6c757d"
                value={injury}
                onChangeText={setInjury}
              />
              <TouchableOpacity
                className="bg-brand-500 px-5 rounded-xl justify-center"
                onPress={() => {
                  if (injury.trim()) {
                    store.addInjury(injury.trim());
                    setInjury("");
                  }
                }}
              >
                <Text className="text-white font-bold">Add</Text>
              </TouchableOpacity>
            </View>

            {store.injuries.map((inj, i) => (
              <View
                key={i}
                className="flex-row items-center bg-dark-800 p-3 rounded-xl mb-2 border border-dark-700"
              >
                <Text className="text-white flex-1">{inj}</Text>
                <TouchableOpacity onPress={() => store.removeInjury(inj)}>
                  <Text className="text-accent-red font-bold">X</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View className="mt-8 bg-dark-800 p-5 rounded-xl border border-dark-700">
              <Text className="text-brand-400 font-bold text-lg mb-3">Your Profile</Text>
              <Text className="text-dark-300 mb-1">Name: <Text className="text-white">{store.displayName}</Text></Text>
              <Text className="text-dark-300 mb-1">Level: <Text className="text-white">{formatLabel(store.experienceLevel || "")}</Text></Text>
              <Text className="text-dark-300 mb-1">Goal: <Text className="text-white">{formatLabel(store.goal || "")}</Text></Text>
              <Text className="text-dark-300 mb-1">Days/week: <Text className="text-white">{store.daysPerWeek}</Text></Text>
              <Text className="text-dark-300 mb-1">Split: <Text className="text-white">{formatLabel(recommendedSplit)}</Text></Text>
              <Text className="text-dark-300">Equipment: <Text className="text-white">{store.equipment.map(formatLabel).join(", ")}</Text></Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Buttons */}
      <View className="px-6 pb-10 pt-4 bg-dark-900 border-t border-dark-800">
        <View className="flex-row gap-3">
          {store.step > 0 && (
            <TouchableOpacity
              className="flex-1 bg-dark-800 py-4 rounded-xl items-center border border-dark-700"
              onPress={() => store.setStep(store.step - 1)}
            >
              <Text className="text-white font-semibold">Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className={`flex-1 py-4 rounded-xl items-center ${
              canAdvance() ? "bg-brand-500" : "bg-dark-700"
            }`}
            onPress={handleNext}
            disabled={!canAdvance() || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">
                {store.step < 5 ? "Continue" : "Generate My Plan"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        {loadingMessage ? (
          <Text className="text-dark-300 text-sm text-center mt-3 px-2">{loadingMessage}</Text>
        ) : null}
        {networkError ? (
          <Text className="text-accent-red text-sm text-center mt-3 px-2">{networkError}</Text>
        ) : null}
      </View>
    </View>
  );
}
