import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { useAuthStore } from "../../stores/auth";
import type { PhysiqueUploadResponse, PhysiqueAIOutput, PhysiqueScenario, MuscleGroup } from "@deezed/shared";

export function usePhysiqueUploadUrl() {
  return useMutation({
    mutationFn: (data: { fileName: string; contentType: string }) =>
      apiClient<PhysiqueUploadResponse>("/physique/upload-url", {
        method: "POST",
        body: data,
        token: useAuthStore.getState().token,
      }),
  });
}

export function usePhysiqueAnalyze() {
  return useMutation({
    mutationFn: (data: {
      photoStorageKey: string;
      scenario: PhysiqueScenario;
      focusMuscle?: MuscleGroup;
    }) =>
      apiClient<PhysiqueAIOutput>("/physique/analyze-and-simulate", {
        method: "POST",
        body: data,
        token: useAuthStore.getState().token,
      }),
  });
}

export function usePhotos(type?: string) {
  const token = useAuthStore((s) => s.token);
  const queryStr = type ? `?type=${type}` : "";

  return useQuery({
    queryKey: ["photos", type],
    queryFn: () =>
      apiClient<Array<{ id: string; type: string; storageKey: string; signedUrl: string; createdAt: string }>>(
        `/photos${queryStr}`,
        { token },
      ),
    enabled: !!token,
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoId: string) =>
      apiClient(`/photos/${photoId}`, {
        method: "DELETE",
        token: useAuthStore.getState().token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    },
  });
}

export function useDeleteAllPhotos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient("/photos", {
        method: "DELETE",
        token: useAuthStore.getState().token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    },
  });
}
