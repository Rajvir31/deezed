import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { useAuthStore } from "../../stores/auth";
import type { ProgressSummary, CreateBodyMetric } from "@deezed/shared";

export function useProgressSummary(enabled = true) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["progress", "summary"],
    queryFn: () => apiClient<ProgressSummary>("/progress/summary", { token }),
    enabled: !!token && enabled,
  });
}

export function useLogMetric() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBodyMetric) =>
      apiClient("/progress/metric", { method: "POST", body: data, token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}
