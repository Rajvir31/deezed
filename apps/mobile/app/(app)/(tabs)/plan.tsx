import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCurrentPlan, useGeneratePlan } from "@/api/hooks/usePlan";
import { useState } from "react";
import { SwipeableTabs } from "@/components/SwipeableTabs";

interface PlanDay {
  dayNumber: number;
  label: string;
  isRestDay: boolean;
  exercises: Array<{
    exerciseName: string;
    sets: number;
    repsMin: number;
    repsMax: number;
    rpeTarget: number;
    muscleGroups: string[];
  }>;
}

interface PlanWeek {
  weekNumber: number;
  progressionNotes: string;
  days: PlanDay[];
}

export default function PlanScreen() {
  const router = useRouter();
  const { data: plan, isLoading, error } = useCurrentPlan();
  const generatePlan = useGeneratePlan();
  const [selectedWeek, setSelectedWeek] = useState(1);

  if (isLoading) {
    return (
      <View className="flex-1 bg-dark-900 items-center justify-center">
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (!plan || error) {
    return (
      <SafeAreaView className="flex-1 bg-dark-900 items-center justify-center px-8">
        <Ionicons name="barbell-outline" size={64} color="#343a40" />
        <Text className="text-white text-xl font-bold mt-4 mb-2">No Plan Yet</Text>
        <Text className="text-dark-400 text-center mb-8">
          Generate your personalized 4-week workout plan powered by AI.
        </Text>
        <TouchableOpacity
          className="bg-brand-500 px-8 py-4 rounded-xl"
          onPress={() => generatePlan.mutate()}
          disabled={generatePlan.isPending}
        >
          {generatePlan.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Generate Plan</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const weeks = (plan.weeks || []) as PlanWeek[];
  const currentWeek = weeks.find((w) => w.weekNumber === selectedWeek) || weeks[0];

  return (
    <SwipeableTabs>
    <SafeAreaView className="flex-1 bg-dark-900">
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-white text-2xl font-bold">Your Plan</Text>
            <Text className="text-dark-400 text-sm">
              {plan.splitType?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} — {plan.goal}
            </Text>
          </View>
          <TouchableOpacity
            className="bg-dark-800 px-4 py-2 rounded-xl border border-dark-700"
            onPress={() => generatePlan.mutate()}
            disabled={generatePlan.isPending}
          >
            <Text className="text-brand-400 font-semibold text-sm">Regenerate</Text>
          </TouchableOpacity>
        </View>

        {/* Week Selector */}
        <View className="flex-row gap-2 mb-6">
          {[1, 2, 3, 4].map((week) => (
            <TouchableOpacity
              key={week}
              className={`flex-1 py-3 rounded-xl items-center ${
                selectedWeek === week
                  ? "bg-brand-500"
                  : "bg-dark-800 border border-dark-700"
              }`}
              onPress={() => setSelectedWeek(week)}
            >
              <Text
                className={`font-bold ${
                  selectedWeek === week ? "text-white" : "text-dark-400"
                }`}
              >
                W{week}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Progression Notes */}
        {currentWeek?.progressionNotes && (
          <View className="bg-brand-500/10 p-4 rounded-xl border border-brand-500/20 mb-4">
            <Text className="text-brand-300 text-sm">{currentWeek.progressionNotes}</Text>
          </View>
        )}

        {/* Days */}
        {currentWeek?.days?.map((day) => (
          <View
            key={day.dayNumber}
            className="bg-dark-800 rounded-2xl border border-dark-700 mb-3 overflow-hidden"
          >
            <TouchableOpacity
              className="p-4"
              onPress={() => {
                if (!day.isRestDay) {
                  router.push({
                    pathname: "/(app)/workout/[id]",
                    params: {
                      id: plan.id,
                      week: String(selectedWeek),
                      day: String(day.dayNumber),
                    },
                  });
                }
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <View
                    className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${
                      day.isRestDay ? "bg-accent-green/20" : "bg-brand-500/20"
                    }`}
                  >
                    <Text
                      className={`font-bold text-xs ${
                        day.isRestDay ? "text-accent-green" : "text-brand-400"
                      }`}
                    >
                      D{day.dayNumber}
                    </Text>
                  </View>
                  <Text className="text-white font-semibold text-base">
                    {day.label}
                  </Text>
                </View>
                {!day.isRestDay && (
                  <View className="flex-row items-center">
                    <Text className="text-dark-400 text-xs mr-1">
                      {day.exercises?.length || 0} exercises
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#6c757d" />
                  </View>
                )}
              </View>

              {!day.isRestDay && (
                <View className="ml-11 gap-1">
                  {day.exercises?.slice(0, 4).map((ex, i) => (
                    <Text key={i} className="text-dark-300 text-sm">
                      {ex.exerciseName} — {ex.sets}×{ex.repsMin}-{ex.repsMax}
                    </Text>
                  ))}
                  {(day.exercises?.length || 0) > 4 && (
                    <Text className="text-dark-500 text-xs">
                      +{(day.exercises?.length || 0) - 4} more
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
    </SwipeableTabs>
  );
}
