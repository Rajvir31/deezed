import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useProfile, useVerifyAge } from "@/api/hooks/useProfile";
import { usePhysiqueUploadUrl, usePhysiqueAnalyze } from "@/api/hooks/usePhysique";
import {
  MUSCLE_GROUPS,
  PHYSIQUE_SCENARIOS,
  PHOTO_RETENTION_POLICY,
  type PhysiqueScenario,
  type MuscleGroup,
  type PhysiqueAIOutput,
} from "@deezed/shared";

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PhysiqueScreen() {
  const { data: profile } = useProfile();
  const verifyAge = useVerifyAge();
  const getUploadUrl = usePhysiqueUploadUrl();
  const analyze = usePhysiqueAnalyze();

  const [showAgeGate, setShowAgeGate] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [scenario, setScenario] = useState<PhysiqueScenario>("3_month_lock_in");
  const [focusMuscle, setFocusMuscle] = useState<MuscleGroup | undefined>();
  const [result, setResult] = useState<PhysiqueAIOutput | null>(null);
  const [step, setStep] = useState<"upload" | "configure" | "result">("upload");

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need access to your photo library.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const asset = pickerResult.assets[0];
      setSelectedImage(asset.uri);

      try {
        // Get upload URL
        const uploadInfo = await getUploadUrl.mutateAsync({
          fileName: `physique-${Date.now()}.jpg`,
          contentType: "image/jpeg",
        });

        // Upload the image
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        await fetch(uploadInfo.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });

        setStorageKey(uploadInfo.storageKey);
        setStep("configure");
      } catch (err) {
        console.error("Upload failed:", err);
        Alert.alert("Upload Failed", "Please try again.");
      }
    }
  };

  const handleAnalyze = async () => {
    if (!storageKey) return;

    try {
      const res = await analyze.mutateAsync({
        photoStorageKey: storageKey,
        scenario,
        focusMuscle: scenario === "single_muscle_focus" ? focusMuscle : undefined,
      });
      setResult(res);
      setStep("result");
    } catch (err) {
      console.error("Analysis failed:", err);
      Alert.alert("Analysis Failed", "Please try again.");
    }
  };

  // Age Gate Check
  if (!profile?.isAgeVerified) {
    return (
      <SafeAreaView className="flex-1 bg-dark-900">
        <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <Text className="text-white text-2xl font-bold mb-2">Physique Simulator</Text>
          <Text className="text-dark-400 mb-8">
            See what your physique could look like with dedicated training.
          </Text>

          <View className="bg-dark-800 p-6 rounded-2xl border border-dark-700">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-accent-red/20 rounded-full items-center justify-center mb-4">
                <Ionicons name="shield-checkmark" size={32} color="#e94560" />
              </View>
              <Text className="text-white text-xl font-bold mb-2">Age Verification Required</Text>
              <Text className="text-dark-400 text-center">
                You must be 18 or older to use the physique feature.
                This involves uploading shirtless photos.
              </Text>
            </View>

            <TouchableOpacity
              className="bg-brand-500 py-4 rounded-xl items-center"
              onPress={async () => {
                try {
                  await verifyAge.mutateAsync({
                    dateOfBirth: new Date(
                      new Date().getFullYear() - 25,
                      0,
                      1,
                    ).toISOString(),
                    confirmsOver18: true,
                  });
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : "Unknown error";
                  Alert.alert("Verification Failed", message);
                }
              }}
              disabled={verifyAge.isPending}
            >
              {verifyAge.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">
                  I confirm I am 18 or older
                </Text>
              )}
            </TouchableOpacity>

            <Text className="text-dark-500 text-xs text-center mt-4">
              By confirming, you agree to our age verification policy.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Consent screen
  if (showConsent) {
    return (
      <SafeAreaView className="flex-1 bg-dark-900">
        <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <Text className="text-white text-2xl font-bold mb-6">Photo Privacy</Text>

          <View className="bg-dark-800 p-5 rounded-2xl border border-dark-700 mb-6">
            <Text className="text-white font-bold mb-3">How we handle your photos:</Text>

            <View className="gap-3">
              <View className="flex-row items-start">
                <Ionicons name="lock-closed" size={18} color="#10b981" className="mt-0.5 mr-3" />
                <Text className="text-dark-300 flex-1 ml-3">
                  Photos are encrypted at rest and accessed only via short-lived signed URLs.
                </Text>
              </View>
              <View className="flex-row items-start">
                <Ionicons name="trash" size={18} color="#10b981" className="mt-0.5 mr-3" />
                <Text className="text-dark-300 flex-1 ml-3">
                  {PHOTO_RETENTION_POLICY}
                </Text>
              </View>
              <View className="flex-row items-start">
                <Ionicons name="eye-off" size={18} color="#10b981" className="mt-0.5 mr-3" />
                <Text className="text-dark-300 flex-1 ml-3">
                  We do NOT train AI models on your photos or share them with third parties.
                </Text>
              </View>
              <View className="flex-row items-start">
                <Ionicons name="shield-checkmark" size={18} color="#10b981" className="mt-0.5 mr-3" />
                <Text className="text-dark-300 flex-1 ml-3">
                  Content moderation prevents inappropriate content from being processed.
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-dark-800 py-4 rounded-xl items-center border border-dark-700"
              onPress={() => setShowConsent(false)}
            >
              <Text className="text-white font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-brand-500 py-4 rounded-xl items-center"
              onPress={() => {
                setShowConsent(false);
                pickImage();
              }}
            >
              <Text className="text-white font-bold">I Understand</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-white text-2xl font-bold mb-2">Physique Simulator</Text>

        {step === "upload" && (
          <View>
            <Text className="text-dark-400 mb-6">
              Upload a shirtless photo to see what your physique could look like
              with consistent training and nutrition.
            </Text>

            <TouchableOpacity
              className="bg-dark-800 border-2 border-dashed border-dark-600 rounded-2xl p-10 items-center"
              onPress={() => setShowConsent(true)}
            >
              <Ionicons name="camera-outline" size={48} color="#6c757d" />
              <Text className="text-white font-bold mt-4 mb-1">Upload Photo</Text>
              <Text className="text-dark-400 text-sm text-center">
                Tap to select a front-facing shirtless photo
              </Text>
            </TouchableOpacity>

            <Text className="text-dark-500 text-xs text-center mt-4">
              Your photos are encrypted and never used for AI training.
            </Text>
          </View>
        )}

        {step === "configure" && (
          <View>
            {/* Photo Preview */}
            {selectedImage && (
              <View className="rounded-2xl overflow-hidden mb-6">
                <Image
                  source={{ uri: selectedImage }}
                  className="w-full h-72"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  className="absolute top-3 right-3 bg-dark-900/80 p-2 rounded-full"
                  onPress={() => {
                    setSelectedImage(null);
                    setStorageKey(null);
                    setStep("upload");
                  }}
                >
                  <Ionicons name="close" size={18} color="white" />
                </TouchableOpacity>
              </View>
            )}

            {/* Scenario Selection */}
            <Text className="text-white text-lg font-bold mb-3">Choose Scenario</Text>
            <View className="gap-3 mb-6">
              <TouchableOpacity
                className={`p-4 rounded-xl border ${
                  scenario === "3_month_lock_in"
                    ? "bg-brand-500/20 border-brand-500"
                    : "bg-dark-800 border-dark-700"
                }`}
                onPress={() => setScenario("3_month_lock_in")}
              >
                <Text className="text-white font-bold">3 Months Locked In</Text>
                <Text className="text-dark-400 text-sm mt-1">
                  Full diet + training adherence for 3 months
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`p-4 rounded-xl border ${
                  scenario === "single_muscle_focus"
                    ? "bg-brand-500/20 border-brand-500"
                    : "bg-dark-800 border-dark-700"
                }`}
                onPress={() => setScenario("single_muscle_focus")}
              >
                <Text className="text-white font-bold">Single Muscle Focus</Text>
                <Text className="text-dark-400 text-sm mt-1">
                  What if you only prioritized one muscle group?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Focus Muscle (if applicable) */}
            {scenario === "single_muscle_focus" && (
              <View className="mb-6">
                <Text className="text-white font-bold mb-3">Focus Muscle</Text>
                <View className="flex-row flex-wrap gap-2">
                  {MUSCLE_GROUPS.filter((m) =>
                    ["chest", "back", "shoulders", "biceps", "quads", "glutes"].includes(m),
                  ).map((muscle) => (
                    <TouchableOpacity
                      key={muscle}
                      className={`px-4 py-2.5 rounded-xl ${
                        focusMuscle === muscle
                          ? "bg-brand-500"
                          : "bg-dark-800 border border-dark-700"
                      }`}
                      onPress={() => setFocusMuscle(muscle)}
                    >
                      <Text
                        className={`font-medium ${
                          focusMuscle === muscle ? "text-white" : "text-dark-300"
                        }`}
                      >
                        {formatLabel(muscle)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              className="bg-brand-500 py-4 rounded-xl items-center"
              onPress={handleAnalyze}
              disabled={
                analyze.isPending ||
                (scenario === "single_muscle_focus" && !focusMuscle)
              }
            >
              {analyze.isPending ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color="white" />
                  <Text className="text-white font-bold">Analyzing...</Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-base">
                  Simulate Transformation
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === "result" && result && (
          <View>
            {/* Preview Image */}
            <View className="rounded-2xl overflow-hidden mb-6 relative">
              <Image
                source={{ uri: result.imageResult.url || "" }}
                className="w-full h-72"
                resizeMode="cover"
              />
              {result.imageResult.metadata.isMock && (
                <View className="absolute inset-0 bg-dark-900/60 items-center justify-center">
                  <Text className="text-white text-xl font-bold">Preview</Text>
                  <Text className="text-dark-300 text-sm mt-1">
                    Full simulation coming soon
                  </Text>
                </View>
              )}
            </View>

            {/* Explanation */}
            <View className="bg-brand-500/10 p-4 rounded-xl border border-brand-500/20 mb-4">
              <Text className="text-brand-300">{result.explanation}</Text>
            </View>

            {/* Current Assessment */}
            <Text className="text-white text-lg font-bold mb-3">Current Assessment</Text>
            <View className="bg-dark-800 p-4 rounded-xl border border-dark-700 mb-4">
              <Text className="text-dark-300 text-sm mb-2">
                Training age: {result.estimatedCurrent.estimatedTrainingAge}
              </Text>
              {result.estimatedCurrent.muscleEmphasisOpportunities.map((o, i) => (
                <Text key={i} className="text-white text-sm mb-1">• {o}</Text>
              ))}
            </View>

            {/* Plan Update */}
            <Text className="text-white text-lg font-bold mb-3">Recommended Plan</Text>
            <View className="bg-dark-800 p-4 rounded-xl border border-dark-700 mb-4">
              <Text className="text-brand-400 font-semibold mb-2">
                Split: {result.planUpdate.splitType}
              </Text>
              {result.planUpdate.keyExercises.slice(0, 6).map((ex, i) => (
                <View key={i} className="flex-row justify-between py-1.5 border-b border-dark-700">
                  <Text className="text-white text-sm flex-1">{ex.name}</Text>
                  <Text className="text-dark-400 text-sm">{ex.sets}×{ex.repsRange}</Text>
                  <View
                    className={`ml-2 px-2 py-0.5 rounded ${
                      ex.priority === "high" ? "bg-accent-red/20" : "bg-dark-700"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        ex.priority === "high" ? "text-accent-red" : "text-dark-400"
                      }`}
                    >
                      {ex.priority}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Nutrition Targets */}
            <Text className="text-white text-lg font-bold mb-3">Nutrition Guidance</Text>
            <View className="bg-dark-800 p-4 rounded-xl border border-dark-700 mb-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-dark-300">Calories</Text>
                <Text className="text-white font-bold">{result.nutritionTargets.calories}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-dark-300">Protein</Text>
                <Text className="text-white font-bold">{result.nutritionTargets.proteinGrams}g</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-dark-300">Carbs</Text>
                <Text className="text-white font-bold">{result.nutritionTargets.carbsGrams}g</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-dark-300">Fats</Text>
                <Text className="text-white font-bold">{result.nutritionTargets.fatGrams}g</Text>
              </View>
              <Text className="text-dark-500 text-xs mt-3">{result.nutritionTargets.notes}</Text>
            </View>

            {/* Disclaimers */}
            <View className="bg-accent-yellow/10 p-4 rounded-xl border border-accent-yellow/20 mb-4">
              <Text className="text-accent-yellow font-bold mb-2">Disclaimers</Text>
              {result.disclaimers.map((d, i) => (
                <Text key={i} className="text-dark-300 text-xs mb-1">• {d}</Text>
              ))}
            </View>

            {/* Try Again */}
            <TouchableOpacity
              className="bg-dark-800 py-4 rounded-xl items-center border border-dark-700"
              onPress={() => {
                setResult(null);
                setSelectedImage(null);
                setStorageKey(null);
                setStep("upload");
              }}
            >
              <Text className="text-white font-bold">Try Another Photo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
