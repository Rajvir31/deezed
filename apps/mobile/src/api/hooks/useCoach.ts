import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";
import { useAuthStore } from "../../stores/auth";
import type { CoachMessage, CoachResponse } from "@deezed/shared";

export function useCoachChat() {
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (data: { message: string; conversationHistory: CoachMessage[] }) =>
      apiClient<CoachResponse>("/ai/coach", { method: "POST", body: data, token }),
  });
}
