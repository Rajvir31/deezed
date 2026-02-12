import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useProfile } from "@/api/hooks/useProfile";
import { useDeleteAllPhotos } from "@/api/hooks/usePhysique";
import { useAuthStore } from "@/stores/auth";

function SettingsRow({
  icon,
  iconColor,
  label,
  sublabel,
  onPress,
  danger,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-4 border-b border-dark-800"
      onPress={onPress}
    >
      <View className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${danger ? "bg-accent-red/10" : "bg-dark-800"}`}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={iconColor || (danger ? "#e94560" : "#adb5bd")} />
      </View>
      <View className="flex-1">
        <Text className={`font-medium ${danger ? "text-accent-red" : "text-white"}`}>
          {label}
        </Text>
        {sublabel && <Text className="text-dark-400 text-xs mt-0.5">{sublabel}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#495057" />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const deleteAllPhotos = useDeleteAllPhotos();
  const resetAuth = useAuthStore((s) => s.reset);

  const handleDeletePhotos = () => {
    Alert.alert(
      "Delete All Photos",
      "This will permanently delete all your photos (progress + physique). This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAllPhotos.mutateAsync();
              Alert.alert("Done", "All photos have been deleted.");
            } catch (err) {
              Alert.alert("Error", "Failed to delete photos. Please try again.");
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            // In production, call a DELETE /account endpoint
            Alert.alert(
              "Contact Support",
              "To delete your account, please contact support@deezed.app. We'll process your request within 48 hours.",
            );
          },
        },
      ],
    );
  };

  const handleSignOut = async () => {
    await signOut();
    resetAuth();
    router.replace("/(auth)/sign-in");
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <ScrollView className="flex-1 px-5 pt-4">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Settings</Text>
        </View>

        {/* Profile Card */}
        <View className="bg-dark-800 p-5 rounded-2xl border border-dark-700 mb-6">
          <View className="flex-row items-center">
            <View className="w-14 h-14 bg-brand-500/20 rounded-full items-center justify-center mr-4">
              <Text className="text-brand-400 text-xl font-bold">
                {(profile?.displayName || "?")[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className="text-white font-bold text-lg">
                {profile?.displayName || "User"}
              </Text>
              <Text className="text-dark-400 text-sm">{profile?.email}</Text>
            </View>
          </View>
        </View>

        {/* Account */}
        <Text className="text-dark-500 text-xs font-bold uppercase tracking-wide mb-2">
          Account
        </Text>
        <View className="mb-6">
          <SettingsRow
            icon="person-outline"
            label="Edit Profile"
            sublabel="Goals, equipment, schedule"
            onPress={() => router.push("/(app)/onboarding")}
          />
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            sublabel="Workout reminders"
            onPress={() => Alert.alert("Coming Soon", "Notifications will be available in a future update.")}
          />
        </View>

        {/* Privacy & Data */}
        <Text className="text-dark-500 text-xs font-bold uppercase tracking-wide mb-2">
          Privacy & Data
        </Text>
        <View className="mb-6">
          <SettingsRow
            icon="shield-checkmark-outline"
            iconColor="#10b981"
            label="Privacy Policy"
            sublabel="How we handle your data"
            onPress={() => Alert.alert("Privacy", "We encrypt your data at rest, never train on your photos, and you can delete your data at any time.")}
          />
          <SettingsRow
            icon="download-outline"
            label="Export Data"
            sublabel="Download your workout history"
            onPress={() => Alert.alert("Coming Soon", "Data export will be available in a future update.")}
          />
          <SettingsRow
            icon="images-outline"
            label="Delete All Photos"
            sublabel="Remove all progress & physique photos"
            onPress={handleDeletePhotos}
            danger
          />
        </View>

        {/* Danger Zone */}
        <Text className="text-dark-500 text-xs font-bold uppercase tracking-wide mb-2">
          Account Actions
        </Text>
        <View className="mb-6">
          <SettingsRow
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleSignOut}
          />
          <SettingsRow
            icon="trash-outline"
            label="Delete Account"
            sublabel="Permanently delete all data"
            onPress={handleDeleteAccount}
            danger
          />
        </View>

        {/* App Info */}
        <View className="items-center py-8">
          <Text className="text-dark-600 text-xs">Deezed v0.1.0</Text>
          <Text className="text-dark-600 text-xs mt-1">
            AI-powered fitness guidance. Not medical advice.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
