import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { useAuthStore } from "../../stores/auth";
import type { CreatePowerliftLog, UpdatePowerliftLog, PowerliftLog, BigThreeLift } from "@deezed/shared";

type LiftSummaryEntry = {
  latest: { weight: number; reps: number; date: string } | null;
  pr: { weight: number; reps: number; date: string } | null;
  totalSessions: number;
};

export type PowerliftSummary = Record<BigThreeLift, LiftSummaryEntry>;

export function usePowerliftSummary(enabled = true) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["powerlifts", "summary"],
    queryFn: () => apiClient<PowerliftSummary>("/powerlifts/summary", { token }),
    enabled: !!token && enabled,
  });
}

export function usePowerliftHistory(lift: BigThreeLift, enabled = true) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["powerlifts", "history", lift],
    queryFn: () =>
      apiClient<PowerliftLog[]>(`/powerlifts/history?lift=${lift}&limit=50`, { token }),
    enabled: !!token && enabled,
  });
}

export function useLogPowerlift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePowerliftLog) =>
      apiClient("/powerlifts/log", {
        method: "POST",
        body: data,
        token: useAuthStore.getState().token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["powerlifts"] });
    },
  });
}

export function useEditPowerlift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdatePowerliftLog & { id: string }) =>
      apiClient(`/powerlifts/log/${id}`, {
        method: "PUT",
        body: data,
        token: useAuthStore.getState().token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["powerlifts"] });
    },
  });
}

export function useDeletePowerlift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient(`/powerlifts/log/${id}`, {
        method: "DELETE",
        token: useAuthStore.getState().token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["powerlifts"] });
    },
  });
}
