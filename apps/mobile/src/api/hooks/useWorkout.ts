import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { useAuthStore } from "../../stores/auth";
import type { CreateSetLog } from "@deezed/shared";

interface WorkoutSession {
  id: string;
  planId: string;
  weekNumber: number;
  dayNumber: number;
  startedAt: string;
  finishedAt: string | null;
  completed: boolean;
  sets: Array<{
    id: string;
    exerciseId: string;
    setNumber: number;
    reps: number;
    weight: number;
    rpe: number | null;
    timestamp: string;
  }>;
}

export function useStartWorkout() {
  return useMutation({
    mutationFn: (data: { planId: string; weekNumber: number; dayNumber: number }) =>
      apiClient<WorkoutSession>("/workout/start", {
        method: "POST",
        body: data,
        token: useAuthStore.getState().token,
      }),
  });
}

export function useLogSet() {
  return useMutation({
    mutationFn: (data: CreateSetLog & { sessionId: string }) =>
      apiClient("/workout/log-set", {
        method: "POST",
        body: data,
        token: useAuthStore.getState().token,
      }),
  });
}

export function useFinishWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient<WorkoutSession>("/workout/finish", {
        method: "POST",
        body: { sessionId },
        token: useAuthStore.getState().token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}

export function useWorkoutHistory() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["workout", "history"],
    queryFn: () => apiClient<WorkoutSession[]>("/workout/history", { token }),
    enabled: !!token,
  });
}
