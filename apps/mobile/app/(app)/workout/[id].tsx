import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentPlan } from "@/api/hooks/usePlan";
import { useStartWorkout, useLogSet, useFinishWorkout } from "@/api/hooks/useWorkout";
import { useWorkoutStore } from "@/stores/workout";

interface ExercisePrescription {
  exerciseName: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  rpeTarget: number;
  notes?: string;
  exerciseId?: string;
}

interface SetEntry {
  setNumber: number;
  weight: string;
  reps: string;
  rpe: string;
  logged: boolean;
}

export default function WorkoutScreen() {
  const { id, week, day } = useLocalSearchParams<{
    id: string;
    week: string;
    day: string;
  }>();
  const router = useRouter();
  const { data: plan } = useCurrentPlan();
  const startWorkout = useStartWorkout();
  const logSet = useLogSet();
  const finishWorkout = useFinishWorkout();
  const store = useWorkoutStore();

  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [sets, setSets] = useState<Record<string, SetEntry[]>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Get workout data for this day
  const weekNum = parseInt(week || "1");
  const dayNum = parseInt(day || "1");
  const weeks = (plan?.weeks || []) as Array<{
    weekNumber: number;
    days: Array<{
      dayNumber: number;
      label: string;
      exercises: ExercisePrescription[];
    }>;
  }>;
  const currentWeek = weeks.find((w) => w.weekNumber === weekNum);
  const currentDay = currentWeek?.days?.find((d) => d.dayNumber === dayNum);
  const exercises = currentDay?.exercises || [];

  // Initialize sets for each exercise
  useEffect(() => {
    const initialSets: Record<string, SetEntry[]> = {};
    exercises.forEach((ex, i) => {
      const key = `${i}-${ex.exerciseName}`;
      if (!sets[key]) {
        initialSets[key] = Array.from({ length: ex.sets }, (_, j) => ({
          setNumber: j + 1,
          weight: "",
          reps: String(ex.repsMin),
          rpe: "",
          logged: false,
        }));
      }
    });
    if (Object.keys(initialSets).length > 0) {
      setSets((prev) => ({ ...prev, ...initialSets }));
    }
  }, [exercises.length]);

  // Start workout session
  const handleStart = useCallback(async () => {
    if (!id) return;
    try {
      const session = await startWorkout.mutateAsync({
        planId: id,
        weekNumber: weekNum,
        dayNumber: dayNum,
      });
      setSessionId(session.id);
      store.startWorkout({
        sessionId: session.id,
        planId: id,
        weekNumber: weekNum,
        dayNumber: dayNum,
        dayLabel: currentDay?.label || "",
        startedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to start workout:", err);
    }
  }, [id, weekNum, dayNum]);

  // Rest timer
  useEffect(() => {
    if (!store.isTimerRunning) return;
    const interval = setInterval(() => {
      store.tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [store.isTimerRunning]);

  // Log a set
  const handleLogSet = async (exerciseIdx: number, setIdx: number) => {
    if (!sessionId) return;

    const ex = exercises[exerciseIdx];
    const key = `${exerciseIdx}-${ex.exerciseName}`;
    const set = sets[key]?.[setIdx];
    if (!set) return;

    const weight = parseFloat(set.weight) || 0;
    const reps = parseInt(set.reps) || 0;
    const rpe = parseFloat(set.rpe) || undefined;

    try {
      await logSet.mutateAsync({
        sessionId,
        exerciseId: ex.exerciseId || ex.exerciseName, // Use name as ID if no ID
        setNumber: set.setNumber,
        weight,
        reps,
        rpe,
      });

      // Mark as logged
      setSets((prev) => ({
        ...prev,
        [key]: prev[key].map((s, i) =>
          i === setIdx ? { ...s, logged: true } : s,
        ),
      }));

      // Start rest timer
      store.setRestTimer(ex.restSeconds);
    } catch (err) {
      console.error("Failed to log set:", err);
    }
  };

  // Finish workout
  const handleFinish = () => {
    Alert.alert(
      "Finish Workout",
      "Are you sure you want to finish this workout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish",
          style: "default",
          onPress: async () => {
            if (!sessionId) return;
            try {
              await finishWorkout.mutateAsync(sessionId);
              store.endWorkout();
              router.back();
            } catch (err) {
              console.error("Failed to finish workout:", err);
            }
          },
        },
      ],
    );
  };

  const currentExercise = exercises[currentExerciseIdx];
  const currentKey = currentExercise
    ? `${currentExerciseIdx}-${currentExercise.exerciseName}`
    : "";

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  if (!currentDay) {
    return (
      <SafeAreaView className="flex-1 bg-dark-900 items-center justify-center">
        <Text className="text-white text-lg">Workout not found</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.back()}>
          <Text className="text-brand-400">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-dark-800">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-white font-bold">{currentDay.label}</Text>
          <Text className="text-dark-400 text-xs">Week {weekNum} — Day {dayNum}</Text>
        </View>
        {sessionId ? (
          <TouchableOpacity onPress={handleFinish}>
            <Text className="text-accent-green font-bold">Done</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-12" />
        )}
      </View>

      {/* Rest Timer Banner */}
      {store.isTimerRunning && store.restTimerSeconds > 0 && (
        <View className="bg-brand-500/20 px-5 py-3 flex-row items-center justify-between">
          <Text className="text-brand-300">Rest</Text>
          <Text className="text-white font-bold text-xl">
            {formatTime(store.restTimerSeconds)}
          </Text>
          <TouchableOpacity onPress={() => store.stopTimer()}>
            <Text className="text-brand-400 font-semibold">Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {!sessionId ? (
        /* Pre-workout overview */
        <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
          <Text className="text-white text-xl font-bold mb-4">Exercises</Text>
          {exercises.map((ex, i) => (
            <View key={i} className="bg-dark-800 p-4 rounded-xl border border-dark-700 mb-3">
              <Text className="text-white font-semibold text-base">{ex.exerciseName}</Text>
              <Text className="text-dark-400 text-sm mt-1">
                {ex.sets} sets × {ex.repsMin}-{ex.repsMax} reps | Rest {ex.restSeconds}s | RPE {ex.rpeTarget}
              </Text>
              {ex.notes && (
                <Text className="text-dark-500 text-xs mt-1">{ex.notes}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        /* Active workout logging */
        <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Exercise selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2">
              {exercises.map((ex, i) => (
                <TouchableOpacity
                  key={i}
                  className={`px-4 py-2 rounded-full ${
                    currentExerciseIdx === i ? "bg-brand-500" : "bg-dark-800"
                  }`}
                  onPress={() => setCurrentExerciseIdx(i)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      currentExerciseIdx === i ? "text-white" : "text-dark-400"
                    }`}
                    numberOfLines={1}
                  >
                    {ex.exerciseName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Current exercise */}
          {currentExercise && (
            <View>
              <Text className="text-white text-xl font-bold mb-1">
                {currentExercise.exerciseName}
              </Text>
              <Text className="text-dark-400 mb-4">
                Target: {currentExercise.repsMin}-{currentExercise.repsMax} reps | RPE {currentExercise.rpeTarget}
              </Text>

              {/* Set headers */}
              <View className="flex-row mb-2 px-2">
                <Text className="text-dark-500 text-xs w-10">SET</Text>
                <Text className="text-dark-500 text-xs flex-1 text-center">WEIGHT</Text>
                <Text className="text-dark-500 text-xs flex-1 text-center">REPS</Text>
                <Text className="text-dark-500 text-xs flex-1 text-center">RPE</Text>
                <View className="w-16" />
              </View>

              {/* Sets */}
              {sets[currentKey]?.map((set, i) => (
                <View
                  key={i}
                  className={`flex-row items-center py-2 px-2 rounded-lg mb-1 ${
                    set.logged ? "bg-accent-green/10" : "bg-dark-800"
                  }`}
                >
                  <Text className="text-dark-400 font-bold w-10">{set.setNumber}</Text>
                  <TextInput
                    className="flex-1 text-white text-center bg-dark-700 mx-1 py-2 rounded-lg"
                    placeholder="lbs"
                    placeholderTextColor="#495057"
                    keyboardType="numeric"
                    value={set.weight}
                    editable={!set.logged}
                    onChangeText={(val) =>
                      setSets((prev) => ({
                        ...prev,
                        [currentKey]: prev[currentKey].map((s, j) =>
                          j === i ? { ...s, weight: val } : s,
                        ),
                      }))
                    }
                  />
                  <TextInput
                    className="flex-1 text-white text-center bg-dark-700 mx-1 py-2 rounded-lg"
                    placeholder="reps"
                    placeholderTextColor="#495057"
                    keyboardType="numeric"
                    value={set.reps}
                    editable={!set.logged}
                    onChangeText={(val) =>
                      setSets((prev) => ({
                        ...prev,
                        [currentKey]: prev[currentKey].map((s, j) =>
                          j === i ? { ...s, reps: val } : s,
                        ),
                      }))
                    }
                  />
                  <TextInput
                    className="flex-1 text-white text-center bg-dark-700 mx-1 py-2 rounded-lg"
                    placeholder="rpe"
                    placeholderTextColor="#495057"
                    keyboardType="numeric"
                    value={set.rpe}
                    editable={!set.logged}
                    onChangeText={(val) =>
                      setSets((prev) => ({
                        ...prev,
                        [currentKey]: prev[currentKey].map((s, j) =>
                          j === i ? { ...s, rpe: val } : s,
                        ),
                      }))
                    }
                  />
                  <TouchableOpacity
                    className={`w-16 py-2 rounded-lg items-center ${
                      set.logged ? "bg-accent-green/20" : "bg-brand-500"
                    }`}
                    onPress={() => handleLogSet(currentExerciseIdx, i)}
                    disabled={set.logged}
                  >
                    {set.logged ? (
                      <Ionicons name="checkmark" size={18} color="#10b981" />
                    ) : (
                      <Text className="text-white font-bold text-xs">LOG</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}

              {currentExercise.notes && (
                <View className="mt-4 bg-dark-800 p-3 rounded-xl">
                  <Text className="text-dark-400 text-sm">
                    <Text className="font-semibold">Note:</Text> {currentExercise.notes}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Bottom Action */}
      {!sessionId && (
        <View className="px-5 pb-8 pt-3 bg-dark-900 border-t border-dark-800">
          <TouchableOpacity
            className="bg-brand-500 py-4 rounded-xl items-center"
            onPress={handleStart}
            disabled={startWorkout.isPending}
          >
            {startWorkout.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Start Workout</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
