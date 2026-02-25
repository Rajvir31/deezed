import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Polyline, Line, Text as SvgText, Circle } from "react-native-svg";
import {
  usePowerliftSummary,
  usePowerliftHistory,
  useLogPowerlift,
  useEditPowerlift,
  useDeletePowerlift,
} from "@/api/hooks/usePowerlifts";
import { BIG_THREE_LIFTS, type BigThreeLift } from "@deezed/shared";
import { SwipeableTabs } from "@/components/SwipeableTabs";

const LIFT_META: Record<BigThreeLift, { label: string; color: string; icon: string }> = {
  bench: { label: "Bench Press", color: "#7c3aed", icon: "fitness" },
  squat: { label: "Squat", color: "#e94560", icon: "body" },
  deadlift: { label: "Deadlift", color: "#f59e0b", icon: "barbell" },
};

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function Big3Screen() {
  const { data: summary, isLoading: summaryLoading } = usePowerliftSummary();
  const logPowerlift = useLogPowerlift();
  const editPowerlift = useEditPowerlift();
  const deletePowerlift = useDeletePowerlift();

  const [selectedLift, setSelectedLift] = useState<BigThreeLift | null>(null);
  const [chartLift, setChartLift] = useState<BigThreeLift>("bench");
  const [weightInput, setWeightInput] = useState("");
  const [repsInput, setRepsInput] = useState("");
  const [dateInput, setDateInput] = useState("");

  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editDate, setEditDate] = useState("");

  const { data: historyData } = usePowerliftHistory(chartLift);

  const handleOpenLog = (lift: BigThreeLift) => {
    if (selectedLift === lift) {
      setSelectedLift(null);
      return;
    }
    setSelectedLift(lift);
    setDateInput(new Date().toISOString().split("T")[0]);

    const entry = summary?.[lift];
    if (entry?.latest) {
      if (entry.latest.reps >= 5) {
        setWeightInput(String(entry.latest.weight + 5));
      } else {
        setWeightInput(String(entry.latest.weight));
      }
      setRepsInput("");
    } else {
      setWeightInput("");
      setRepsInput("");
    }
  };

  const handleLog = async () => {
    if (!selectedLift || !weightInput || !repsInput) return;

    const w = parseFloat(weightInput);
    const r = parseInt(repsInput, 10);
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) {
      Alert.alert("Invalid input", "Enter a valid weight and reps.");
      return;
    }

    try {
      await logPowerlift.mutateAsync({
        lift: selectedLift,
        weight: w,
        reps: r,
        date: dateInput ? new Date(dateInput + "T12:00:00").toISOString() : undefined,
      });
      setSelectedLift(null);
      setWeightInput("");
      setRepsInput("");
      setDateInput("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Failed to log", msg);
    }
  };

  const handleHistoryAction = (log: { id: string; weight: number; reps: number; date: string }) => {
    Alert.alert(
      `${log.weight} x ${log.reps}  —  ${new Date(log.date).toLocaleDateString()}`,
      undefined,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Edit",
          onPress: () => {
            setEditingLogId(log.id);
            setEditWeight(String(log.weight));
            setEditReps(String(log.reps));
            setEditDate(new Date(log.date).toISOString().split("T")[0]);
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert("Delete this log?", "This cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deletePowerlift.mutateAsync(log.id);
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : "Unknown error";
                    Alert.alert("Failed to delete", msg);
                  }
                },
              },
            ]);
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingLogId) return;
    const w = parseFloat(editWeight);
    const r = parseInt(editReps, 10);
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) {
      Alert.alert("Invalid input", "Enter a valid weight and reps.");
      return;
    }
    try {
      await editPowerlift.mutateAsync({
        id: editingLogId,
        weight: w,
        reps: r,
        date: editDate ? new Date(editDate + "T12:00:00").toISOString() : undefined,
      });
      setEditingLogId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Failed to update", msg);
    }
  };

  if (summaryLoading) {
    return (
      <View className="flex-1 bg-dark-900 items-center justify-center">
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <SwipeableTabs>
      <SafeAreaView className="flex-1 bg-dark-900">
        <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <Text className="text-white text-2xl font-bold mb-2">Big 3</Text>
          <Text className="text-dark-400 mb-6">Track your bench, squat, and deadlift top sets.</Text>

          {/* Lift Cards */}
          <View className="gap-3 mb-6">
            {BIG_THREE_LIFTS.map((lift) => {
              const meta = LIFT_META[lift];
              const entry = summary?.[lift];
              const isOpen = selectedLift === lift;
              const readyToGoUp = entry?.latest && entry.latest.reps >= 5;

              return (
                <View key={lift}>
                  <TouchableOpacity
                    className={`bg-dark-800 p-4 rounded-xl border ${
                      isOpen ? "border-brand-500" : "border-dark-700"
                    }`}
                    onPress={() => handleOpenLog(lift)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3">
                        <View
                          className="w-10 h-10 rounded-full items-center justify-center"
                          style={{ backgroundColor: meta.color + "30" }}
                        >
                          <Ionicons
                            name={meta.icon as any}
                            size={20}
                            color={meta.color}
                          />
                        </View>
                        <View>
                          <Text className="text-white font-bold text-base">{meta.label}</Text>
                          {entry?.latest ? (
                            <Text className="text-dark-400 text-sm">
                              {entry.latest.weight} lbs x {entry.latest.reps} reps
                            </Text>
                          ) : (
                            <Text className="text-dark-500 text-sm">No sets logged yet</Text>
                          )}
                        </View>
                      </View>
                      <View className="flex-row items-center gap-2">
                        {readyToGoUp && (
                          <View className="bg-green-500/20 px-2.5 py-1 rounded-lg">
                            <Text className="text-green-400 text-xs font-bold">GO UP</Text>
                          </View>
                        )}
                        <Ionicons
                          name={isOpen ? "chevron-up" : "add-circle-outline"}
                          size={22}
                          color={isOpen ? "#7c3aed" : "#6c757d"}
                        />
                      </View>
                    </View>

                    {entry?.pr && (
                      <View className="flex-row items-center mt-2 pt-2 border-t border-dark-700">
                        <Ionicons name="trophy" size={14} color="#f59e0b" />
                        <Text className="text-dark-400 text-xs ml-1.5">
                          PR: {entry.pr.weight} lbs x {entry.pr.reps}
                        </Text>
                        <Text className="text-dark-500 text-xs ml-2">
                          ({entry.totalSessions} sessions)
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Inline Log Form */}
                  {isOpen && (
                    <View className="bg-dark-800 p-4 rounded-xl border border-brand-500/30 mt-1">
                      <Text className="text-white font-semibold mb-3">
                        Log Top Set — {meta.label}
                      </Text>
                      <View className="flex-row gap-3 mb-3">
                        <View className="flex-1">
                          <Text className="text-dark-300 text-xs mb-1">Weight (lbs)</Text>
                          <TextInput
                            className="bg-dark-700 text-white px-3 py-2.5 rounded-lg text-center text-lg"
                            placeholder="0"
                            placeholderTextColor="#495057"
                            keyboardType="numeric"
                            value={weightInput}
                            onChangeText={setWeightInput}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-dark-300 text-xs mb-1">Reps</Text>
                          <TextInput
                            className="bg-dark-700 text-white px-3 py-2.5 rounded-lg text-center text-lg"
                            placeholder="0"
                            placeholderTextColor="#495057"
                            keyboardType="numeric"
                            value={repsInput}
                            onChangeText={setRepsInput}
                          />
                        </View>
                      </View>
                      <View className="mb-3">
                        <Text className="text-dark-300 text-xs mb-1">Date</Text>
                        <TextInput
                          className="bg-dark-700 text-white px-3 py-2.5 rounded-lg text-center"
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="#495057"
                          value={dateInput}
                          onChangeText={setDateInput}
                        />
                      </View>
                      {readyToGoUp && (
                        <Text className="text-green-400 text-xs mb-3">
                          You hit 5 reps last time — weight auto-increased by 5 lbs
                        </Text>
                      )}
                      <TouchableOpacity
                        className="bg-brand-500 py-3 rounded-xl items-center"
                        onPress={handleLog}
                        disabled={logPowerlift.isPending}
                      >
                        {logPowerlift.isPending ? (
                          <ActivityIndicator color="white" size="small" />
                        ) : (
                          <Text className="text-white font-bold">Save Set</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Progression Chart */}
          <Text className="text-white text-lg font-bold mb-3">Progression</Text>
          <View className="flex-row gap-2 mb-3">
            {BIG_THREE_LIFTS.map((lift) => (
              <TouchableOpacity
                key={lift}
                className={`flex-1 py-2 rounded-lg items-center ${
                  chartLift === lift ? "bg-brand-500" : "bg-dark-800 border border-dark-700"
                }`}
                onPress={() => setChartLift(lift)}
              >
                <Text
                  className={`font-semibold text-sm ${
                    chartLift === lift ? "text-white" : "text-dark-400"
                  }`}
                >
                  {LIFT_META[lift].label.split(" ")[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ProgressionChart
            data={historyData || []}
            color={LIFT_META[chartLift].color}
          />

          {/* History List */}
          <Text className="text-white text-lg font-bold mt-6 mb-3">History</Text>
          {historyData && historyData.length > 0 ? (
            <View className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
              {historyData.slice(0, 20).map((log, i) => (
                <View key={log.id}>
                  {editingLogId === log.id ? (
                    <View className="p-3.5 bg-dark-700/50">
                      <View className="flex-row gap-2 mb-2">
                        <View className="flex-1">
                          <Text className="text-dark-300 text-xs mb-1">Weight</Text>
                          <TextInput
                            className="bg-dark-700 text-white px-3 py-2 rounded-lg text-center"
                            keyboardType="numeric"
                            value={editWeight}
                            onChangeText={setEditWeight}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-dark-300 text-xs mb-1">Reps</Text>
                          <TextInput
                            className="bg-dark-700 text-white px-3 py-2 rounded-lg text-center"
                            keyboardType="numeric"
                            value={editReps}
                            onChangeText={setEditReps}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-dark-300 text-xs mb-1">Date</Text>
                          <TextInput
                            className="bg-dark-700 text-white px-3 py-2 rounded-lg text-center text-xs"
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#495057"
                            value={editDate}
                            onChangeText={setEditDate}
                          />
                        </View>
                      </View>
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          className="flex-1 bg-dark-600 py-2 rounded-lg items-center"
                          onPress={() => setEditingLogId(null)}
                        >
                          <Text className="text-dark-300 font-semibold">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="flex-1 bg-brand-500 py-2 rounded-lg items-center"
                          onPress={handleSaveEdit}
                          disabled={editPowerlift.isPending}
                        >
                          {editPowerlift.isPending ? (
                            <ActivityIndicator color="white" size="small" />
                          ) : (
                            <Text className="text-white font-semibold">Save</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      className={`flex-row justify-between items-center p-3.5 ${
                        i < Math.min(historyData.length, 20) - 1 ? "border-b border-dark-700" : ""
                      }`}
                      onPress={() => handleHistoryAction(log)}
                      activeOpacity={0.6}
                    >
                      <Text className="text-dark-400 text-sm">
                        {new Date(log.date).toLocaleDateString()}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-white font-bold">
                          {log.weight} x {log.reps}
                        </Text>
                        {log.reps >= 5 && (
                          <View className="bg-green-500/20 px-1.5 py-0.5 rounded">
                            <Text className="text-green-400 text-xs font-bold">5+</Text>
                          </View>
                        )}
                        <Ionicons name="ellipsis-vertical" size={14} color="#6c757d" />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-dark-800 p-4 rounded-xl border border-dark-700">
              <Text className="text-dark-400 text-center">
                No {LIFT_META[chartLift].label.toLowerCase()} sessions logged yet
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </SwipeableTabs>
  );
}

// ── Simple SVG Line Chart ─────────────────────────────────
function ProgressionChart({
  data,
  color,
}: {
  data: { weight: number; date: string }[];
  color: string;
}) {
  if (data.length < 2) {
    return (
      <View className="bg-dark-800 rounded-xl border border-dark-700 p-6 items-center">
        <Ionicons name="analytics-outline" size={32} color="#495057" />
        <Text className="text-dark-400 text-sm mt-2">
          Log at least 2 sessions to see your chart
        </Text>
      </View>
    );
  }

  const chartW = SCREEN_WIDTH - 40;
  const chartH = 180;
  const padL = 45;
  const padR = 15;
  const padT = 15;
  const padB = 30;

  // Chronological order for the chart
  const sorted = [...data].reverse();

  const weights = sorted.map((d) => d.weight);
  const minW = Math.floor(Math.min(...weights) / 5) * 5 - 5;
  const maxW = Math.ceil(Math.max(...weights) / 5) * 5 + 5;
  const range = maxW - minW || 1;

  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const points = sorted.map((d, i) => {
    const x = padL + (i / (sorted.length - 1)) * innerW;
    const y = padT + innerH - ((d.weight - minW) / range) * innerH;
    return { x, y, weight: d.weight, date: d.date };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Y-axis labels (3-4 ticks)
  const ticks = 4;
  const yLabels = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round(minW + (range / ticks) * i),
  );

  return (
    <View className="bg-dark-800 rounded-xl border border-dark-700 p-3">
      <Svg width={chartW} height={chartH}>
        {/* Grid lines + Y labels */}
        {yLabels.map((val) => {
          const y = padT + innerH - ((val - minW) / range) * innerH;
          return (
            <Line
              key={val}
              x1={padL}
              y1={y}
              x2={chartW - padR}
              y2={y}
              stroke="#2a2a3e"
              strokeWidth={1}
            />
          );
        })}
        {yLabels.map((val) => {
          const y = padT + innerH - ((val - minW) / range) * innerH;
          return (
            <SvgText
              key={`label-${val}`}
              x={padL - 8}
              y={y + 4}
              fill="#6c757d"
              fontSize={10}
              textAnchor="end"
            >
              {val}
            </SvgText>
          );
        })}

        {/* Line */}
        <Polyline
          points={polylineStr}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={color} />
        ))}

        {/* X-axis date labels (first and last) */}
        <SvgText
          x={padL}
          y={chartH - 5}
          fill="#6c757d"
          fontSize={10}
          textAnchor="start"
        >
          {new Date(sorted[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </SvgText>
        <SvgText
          x={chartW - padR}
          y={chartH - 5}
          fill="#6c757d"
          fontSize={10}
          textAnchor="end"
        >
          {new Date(sorted[sorted.length - 1].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </SvgText>
      </Svg>
    </View>
  );
}
