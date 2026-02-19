import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { useAuthStore } from "../../stores/auth";

interface PlanResponse {
  id: string;
  splitType: string;
  goal: string;
  weeks: unknown[];
  isActive: boolean;
  createdAt: string;
}

interface GeneratePlanResponse {
  plan: PlanResponse;
  explanation: string;
}

export function useCurrentPlan(enabled = true) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["plan", "current"],
    queryFn: () => apiClient<PlanResponse>("/plan/current", { token }),
    enabled: !!token && enabled,
    retry: false,
  });
}

export function useGeneratePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: {
      experienceLevel: string;
      goal: string;
      daysPerWeek: number;
      equipment: string[];
      injuries: string[];
    }) =>
      apiClient<GeneratePlanResponse>("/plan/generate", {
        method: "POST",
        body: data || {},
        token: useAuthStore.getState().token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan"] });
    },
  });
}
