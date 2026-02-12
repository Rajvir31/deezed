import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useProgressSummary, useLogMetric } from "@/api/hooks/useProgress";
import { usePhotos } from "@/api/hooks/usePhysique";
import { MUSCLE_GROUPS } from "@deezed/shared";

export default function ProgressScreen() {
  const { data: progress, isLoading } = useProgressSummary();
  const { data: photos } = usePhotos("progress");
  const logMetric = useLogMetric();
  const [showLogForm, setShowLogForm] = useState(false);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");

  const handleLogMetric = async () => {
    if (!weight && !bodyFat) return;

    await logMetric.mutateAsync({
      weight: weight ? parseFloat(weight) : undefined,
      bodyFatPercent: bodyFat ? parseFloat(bodyFat) : undefined,
      date: new Date().toISOString(),
    });

    setWeight("");
    setBodyFat("");
    setShowLogForm(false);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-dark-900 items-center justify-center">
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  // Prepare volume data for display
  const volumeEntries = Object.entries(progress?.volumeByMuscle || {})
    .sort((a, b) => (b[1] as number) - (a[1] as number));
  const maxVolume = volumeEntries.length > 0 ? (volumeEntries[0][1] as number) : 1;

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-white text-2xl font-bold mb-6">Progress</Text>

        {/* Stats */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-dark-800 p-4 rounded-xl border border-dark-700">
            <Text className="text-dark-400 text-xs">Total Volume</Text>
            <Text className="text-white text-lg font-bold">
              {Math.round(progress?.totalVolume || 0).toLocaleString()} lbs
            </Text>
          </View>
          <View className="flex-1 bg-dark-800 p-4 rounded-xl border border-dark-700">
            <Text className="text-dark-400 text-xs">Workouts</Text>
            <Text className="text-white text-lg font-bold">{progress?.totalWorkouts || 0}</Text>
          </View>
        </View>

        {/* Log Bodyweight */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-white text-lg font-bold">Body Metrics</Text>
          <TouchableOpacity
            className="bg-brand-500/20 px-4 py-2 rounded-lg"
            onPress={() => setShowLogForm(!showLogForm)}
          >
            <Text className="text-brand-400 font-semibold text-sm">
              {showLogForm ? "Cancel" : "+ Log"}
            </Text>
          </TouchableOpacity>
        </View>

        {showLogForm && (
          <View className="bg-dark-800 p-4 rounded-xl border border-dark-700 mb-4">
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-dark-300 text-xs mb-1">Weight (lbs)</Text>
                <TextInput
                  className="bg-dark-700 text-white px-3 py-2.5 rounded-lg"
                  placeholder="185"
                  placeholderTextColor="#495057"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>
              <View className="flex-1">
                <Text className="text-dark-300 text-xs mb-1">Body Fat %</Text>
                <TextInput
                  className="bg-dark-700 text-white px-3 py-2.5 rounded-lg"
                  placeholder="15"
                  placeholderTextColor="#495057"
                  keyboardType="numeric"
                  value={bodyFat}
                  onChangeText={setBodyFat}
                />
              </View>
            </View>
            <TouchableOpacity
              className="bg-brand-500 py-3 rounded-lg items-center"
              onPress={handleLogMetric}
              disabled={logMetric.isPending}
            >
              {logMetric.isPending ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-bold">Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Weight History */}
        {(progress?.recentMetrics?.length || 0) > 0 && (
          <View className="bg-dark-800 rounded-xl border border-dark-700 p-4 mb-6">
            {progress?.recentMetrics?.slice(0, 5).map((m, i) => (
              <View key={i} className="flex-row justify-between py-2 border-b border-dark-700 last:border-b-0">
                <Text className="text-dark-400 text-sm">
                  {new Date(m.date).toLocaleDateString()}
                </Text>
                <View className="flex-row gap-4">
                  {m.weight && <Text className="text-white text-sm">{m.weight} lbs</Text>}
                  {m.bodyFatPercent && (
                    <Text className="text-dark-300 text-sm">{m.bodyFatPercent}% BF</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Personal Records */}
        <Text className="text-white text-lg font-bold mb-3">Personal Records</Text>
        {(progress?.personalRecords?.length || 0) > 0 ? (
          <View className="gap-2 mb-6">
            {progress?.personalRecords?.slice(0, 5).map((pr, i) => (
              <View key={i} className="bg-dark-800 p-3 rounded-xl border border-dark-700 flex-row items-center">
                <Ionicons name="trophy" size={18} color="#f59e0b" />
                <View className="ml-3 flex-1">
                  <Text className="text-white font-medium">{pr.exerciseName}</Text>
                  <Text className="text-dark-400 text-xs">
                    {new Date(pr.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text className="text-accent-yellow font-bold">
                  {pr.weight} × {pr.reps}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View className="bg-dark-800 p-4 rounded-xl border border-dark-700 mb-6">
            <Text className="text-dark-400 text-center">
              Complete workouts to see your PRs
            </Text>
          </View>
        )}

        {/* Volume by Muscle Group */}
        <Text className="text-white text-lg font-bold mb-3">Volume by Muscle</Text>
        {volumeEntries.length > 0 ? (
          <View className="bg-dark-800 rounded-xl border border-dark-700 p-4 mb-6">
            {volumeEntries.map(([muscle, volume]) => (
              <View key={muscle} className="mb-3">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-dark-300 text-sm capitalize">{muscle}</Text>
                  <Text className="text-dark-400 text-xs">
                    {Math.round(volume as number).toLocaleString()} lbs
                  </Text>
                </View>
                <View className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${((volume as number) / maxVolume) * 100}%` }}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="bg-dark-800 p-4 rounded-xl border border-dark-700">
            <Text className="text-dark-400 text-center">
              Log workouts to see your volume breakdown
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
