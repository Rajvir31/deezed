import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCoachChat } from "@/api/hooks/useCoach";
import type { CoachMessage, CoachResponse } from "@deezed/shared";

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  rationale?: string;
  suggestedActions?: CoachResponse["suggestedActions"];
}

export default function CoachScreen() {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [showRationale, setShowRationale] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const coachChat = useCoachChat();

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatEntry = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Build conversation history for context
    const history: CoachMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));

    try {
      const response = await coachChat.mutateAsync({
        message: text,
        conversationHistory: history,
      });

      const assistantMsg: ChatEntry = {
        role: "assistant",
        content: response.reply,
        timestamp: new Date().toISOString(),
        rationale: response.rationale,
        suggestedActions: response.suggestedActions,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatEntry = {
        role: "assistant",
        content: "Sorry, I had trouble processing that. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View className="px-5 py-4 border-b border-dark-800">
          <Text className="text-white text-xl font-bold">AI Coach</Text>
          <Text className="text-dark-400 text-sm">
            Ask about exercises, plateaus, program adjustments, and more
          </Text>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View className="items-center py-12">
              <View className="w-20 h-20 bg-brand-500/10 rounded-full items-center justify-center mb-4">
                <Ionicons name="chatbubbles" size={36} color="#7c3aed" />
              </View>
              <Text className="text-white text-lg font-bold mb-2">Hey! I'm your AI coach.</Text>
              <Text className="text-dark-400 text-center px-4">
                Ask me anything about your training. Here are some ideas:
              </Text>

              <View className="mt-6 gap-2 w-full">
                {[
                  "I missed my workout yesterday, what should I do?",
                  "Can you swap my barbell bench for something shoulder-friendly?",
                  "I've hit a plateau on my squat",
                  "Should I deload this week?",
                ].map((suggestion, i) => (
                  <TouchableOpacity
                    key={i}
                    className="bg-dark-800 p-3.5 rounded-xl border border-dark-700"
                    onPress={() => {
                      setInput(suggestion);
                    }}
                  >
                    <Text className="text-dark-300 text-sm">{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((msg, i) => (
            <View key={i} className="mb-4">
              <View
                className={`max-w-[85%] p-4 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-brand-500 self-end ml-auto rounded-br-sm"
                    : "bg-dark-800 self-start rounded-bl-sm border border-dark-700"
                }`}
              >
                <Text
                  className={`${
                    msg.role === "user" ? "text-white" : "text-dark-100"
                  }`}
                >
                  {msg.content}
                </Text>
              </View>

              {/* Rationale & Actions */}
              {msg.role === "assistant" && msg.rationale && (
                <View className="ml-1 mt-2">
                  <TouchableOpacity
                    className="flex-row items-center"
                    onPress={() =>
                      setShowRationale(showRationale === i ? null : i)
                    }
                  >
                    <Ionicons
                      name="bulb-outline"
                      size={14}
                      color="#7c3aed"
                    />
                    <Text className="text-brand-400 text-xs ml-1 font-medium">
                      {showRationale === i ? "Hide" : "Show"} rationale
                    </Text>
                  </TouchableOpacity>

                  {showRationale === i && (
                    <View className="bg-brand-500/10 p-3 rounded-xl mt-2 border border-brand-500/20">
                      <Text className="text-brand-300 text-sm">
                        {msg.rationale}
                      </Text>
                    </View>
                  )}

                  {/* Suggested Actions */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <View className="mt-2 gap-2">
                      {msg.suggestedActions.map((action, j) => (
                        <View
                          key={j}
                          className="bg-dark-800 p-3 rounded-xl border border-dark-700"
                        >
                          <View className="flex-row items-center mb-1">
                            <View className="bg-brand-500/20 px-2 py-0.5 rounded">
                              <Text className="text-brand-400 text-xs font-medium">
                                {action.type.replace(/_/g, " ")}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-dark-300 text-sm">
                            {action.description}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}

          {coachChat.isPending && (
            <View className="flex-row items-center p-4 bg-dark-800 rounded-2xl self-start rounded-bl-sm border border-dark-700 mb-4">
              <ActivityIndicator size="small" color="#7c3aed" />
              <Text className="text-dark-400 ml-2">Thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View className="px-5 py-3 border-t border-dark-800 bg-dark-900">
          <View className="flex-row items-end gap-2">
            <TextInput
              className="flex-1 bg-dark-800 text-white px-4 py-3 rounded-xl border border-dark-700 max-h-24"
              placeholder="Ask your AI coach..."
              placeholderTextColor="#6c757d"
              value={input}
              onChangeText={setInput}
              multiline
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              className={`w-12 h-12 rounded-xl items-center justify-center ${
                input.trim() ? "bg-brand-500" : "bg-dark-800"
              }`}
              onPress={handleSend}
              disabled={!input.trim() || coachChat.isPending}
            >
              <Ionicons
                name="send"
                size={18}
                color={input.trim() ? "white" : "#6c757d"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
