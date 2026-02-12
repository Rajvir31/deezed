import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { useAuthStore } from "../../stores/auth";
import type { UserProfile, CreateProfile, UpdateProfile } from "@deezed/shared";

export function useProfile() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["profile"],
    queryFn: () => apiClient<UserProfile>("/profile", { token }),
    enabled: !!token,
    retry: false,
  });
}

export function useUpdateProfile() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProfile | UpdateProfile) =>
      apiClient<UserProfile>("/profile", { method: "PUT", body: data, token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useVerifyAge() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { dateOfBirth: string; confirmsOver18: true }) =>
      apiClient<{ verified: boolean; age: number }>("/profile/verify-age", {
        method: "POST",
        body: data,
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
