import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useProfile } from "@/api/hooks/useProfile";
import { useCurrentPlan } from "@/api/hooks/usePlan";
import { useProgressSummary } from "@/api/hooks/useProgress";

export default function HomeScreen() {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: plan, isLoading: planLoading } = useCurrentPlan();
  const { data: progress } = useProgressSummary();

  if (profileLoading || planLoading) {
    return (
      <View className="flex-1 bg-dark-900 items-center justify-center">
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  // Redirect to onboarding if not onboarded
  if (!profile?.onboardingComplete) {
    router.replace("/(app)/onboarding");
    return null;
  }

  // Determine today's workout
  const today = new Date();
  const dayOfWeek = today.getDay() || 7; // 1=Mon ... 7=Sun
  const weeks = (plan?.weeks as Array<{
    weekNumber: number;
    days: Array<{
      dayNumber: number;
      label: string;
      isRestDay: boolean;
      exercises: unknown[];
    }>;
  }>) || [];
  const currentWeek = weeks[0]; // Simplified: just show week 1
  const todayWorkout = currentWeek?.days?.find((d) => d.dayNumber === dayOfWeek);

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-dark-400 text-sm">Welcome back</Text>
            <Text className="text-white text-2xl font-bold">
              {profile?.displayName || "Athlete"}
            </Text>
          </View>
          <TouchableOpacity
            className="w-10 h-10 bg-dark-800 rounded-full items-center justify-center"
            onPress={() => router.push("/(app)/settings")}
          >
            <Ionicons name="settings-outline" size={20} color="#adb5bd" />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-dark-800 p-4 rounded-xl border border-dark-700">
            <Text className="text-dark-400 text-xs mb-1">Workouts</Text>
            <Text className="text-white text-2xl font-bold">
              {progress?.totalWorkouts || 0}
            </Text>
          </View>
          <View className="flex-1 bg-dark-800 p-4 rounded-xl border border-dark-700">
            <Text className="text-dark-400 text-xs mb-1">Streak</Text>
            <Text className="text-brand-400 text-2xl font-bold">
              {progress?.currentStreak || 0}
            </Text>
          </View>
          <View className="flex-1 bg-dark-800 p-4 rounded-xl border border-dark-700">
            <Text className="text-dark-400 text-xs mb-1">PRs</Text>
            <Text className="text-accent-green text-2xl font-bold">
              {progress?.personalRecords?.length || 0}
            </Text>
          </View>
        </View>

        {/* Today's Workout Card */}
        <Text className="text-white text-lg font-bold mb-3">Today's Workout</Text>

        {todayWorkout && !todayWorkout.isRestDay ? (
          <TouchableOpacity
            className="bg-brand-500/10 p-5 rounded-2xl border border-brand-500/30 mb-6"
            onPress={() =>
              router.push({
                pathname: "/(app)/workout/[id]",
                params: {
                  id: plan?.id || "",
                  week: "1",
                  day: String(dayOfWeek),
                },
              })
            }
          >
            <View className="flex-row items-center mb-3">
              <View className="w-12 h-12 bg-brand-500/20 rounded-xl items-center justify-center mr-4">
                <Ionicons name="barbell" size={24} color="#8b5cf6" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">
                  {todayWorkout.label}
                </Text>
                <Text className="text-dark-400 text-sm">
                  {todayWorkout.exercises?.length || 0} exercises
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8b5cf6" />
            </View>

            <TouchableOpacity
              className="bg-brand-500 py-3.5 rounded-xl items-center mt-2"
              onPress={() =>
                router.push({
                  pathname: "/(app)/workout/[id]",
                  params: {
                    id: plan?.id || "",
                    week: "1",
                    day: String(dayOfWeek),
                  },
                })
              }
            >
              <Text className="text-white font-bold text-base">Start Workout</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <View className="bg-dark-800 p-5 rounded-2xl border border-dark-700 mb-6">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-accent-green/20 rounded-xl items-center justify-center mr-4">
                <Ionicons name="bed" size={24} color="#10b981" />
              </View>
              <View>
                <Text className="text-white text-lg font-bold">Rest Day</Text>
                <Text className="text-dark-400 text-sm">
                  Recovery is part of the process
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <Text className="text-white text-lg font-bold mb-3">Quick Actions</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-dark-800 p-4 rounded-xl border border-dark-700 items-center"
            onPress={() => router.push("/(app)/(tabs)/coach")}
          >
            <Ionicons name="chatbubbles-outline" size={28} color="#7c3aed" />
            <Text className="text-white text-sm mt-2 font-medium">AI Coach</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-dark-800 p-4 rounded-xl border border-dark-700 items-center"
            onPress={() => router.push("/(app)/(tabs)/physique")}
          >
            <Ionicons name="body-outline" size={28} color="#e94560" />
            <Text className="text-white text-sm mt-2 font-medium">Physique</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-dark-800 p-4 rounded-xl border border-dark-700 items-center"
            onPress={() => router.push("/(app)/(tabs)/progress")}
          >
            <Ionicons name="trending-up-outline" size={28} color="#10b981" />
            <Text className="text-white text-sm mt-2 font-medium">Progress</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
