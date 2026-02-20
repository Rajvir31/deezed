import { z } from "zod";
import { PHYSIQUE_SCENARIOS, MUSCLE_GROUPS } from "../constants";

// ── Physique Upload Request ──────────────────────────────
export const PhysiqueUploadRequestSchema = z.object({
  fileName: z.string(),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export type PhysiqueUploadRequest = z.infer<typeof PhysiqueUploadRequestSchema>;

// ── Physique Upload Response (signed URL) ────────────────
export const PhysiqueUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  storageKey: z.string(),
  expiresIn: z.number(),
});

export type PhysiqueUploadResponse = z.infer<typeof PhysiqueUploadResponseSchema>;

// ── Physique Analyze Request ─────────────────────────────
export const PhysiqueAnalyzeRequestSchema = z.object({
  photoStorageKey: z.string(),
  scenario: z.enum(PHYSIQUE_SCENARIOS),
  focusMuscle: z.enum(MUSCLE_GROUPS).optional(), // required when scenario is single_muscle_focus
});

export type PhysiqueAnalyzeRequest = z.infer<typeof PhysiqueAnalyzeRequestSchema>;

// ── Physique AI Output ───────────────────────────────────
export const PhysiqueAIOutputSchema = z.object({
  estimatedCurrent: z.object({
    postureNotes: z.array(z.string()),
    muscleEmphasisOpportunities: z.array(z.string()),
    estimatedTrainingAge: z.string(),
  }),
  scenario: z.enum(PHYSIQUE_SCENARIOS),
  planUpdate: z.object({
    splitType: z.string(),
    weeklySchedule: z.array(z.string()),
    keyExercises: z.array(
      z.object({
        name: z.string(),
        targetMuscle: z.string(),
        sets: z.number(),
        repsRange: z.string(),
        priority: z.enum(["high", "medium", "low"]),
      }),
    ),
    progressionRules: z.array(z.string()),
  }),
  nutritionTargets: z.object({
    calories: z.number(),
    proteinGrams: z.number(),
    carbsGrams: z.number(),
    fatGrams: z.number(),
    notes: z.string(),
  }),
  imageResult: z.object({
    type: z.enum(["mock_preview", "generated"]),
    url: z.string().optional(),
    metadata: z.object({
      model: z.string().optional(),
      processingTime: z.number().optional(),
      isMock: z.boolean(),
    }),
  }),
  disclaimers: z.array(z.string()),
  explanation: z.string(),
});

export type PhysiqueAIOutput = z.infer<typeof PhysiqueAIOutputSchema>;

// ── Photo Asset ──────────────────────────────────────────
export const PhotoAssetSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(["progress", "physique_input", "physique_output"]),
  storageKey: z.string(),
  signedUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
});

export type PhotoAsset = z.infer<typeof PhotoAssetSchema>;

// ────────────────────────────────────────────────────────
// Image Generation Interface
// This interface defines the contract for image generation providers.
// The MVP uses a mock implementation. To upgrade:
// 1. Create a new class implementing IImageGenerator
// 2. Swap the implementation in the DI container / service factory
// ────────────────────────────────────────────────────────

export interface PhysiqueVisionAnalysis {
  bodyFatRange: string;
  buildType: string;
  muscleDevelopment: string;
  keyOpportunities: string[];
  realisticChanges: string;
}

export interface IImageGeneratorInput {
  sourceImageUrl: string;
  scenario: string;
  focusMuscle?: string;
  userProfile: {
    experienceLevel: string;
    goal: string;
    daysPerWeek: number;
    equipment: string[];
    weight?: number;
  };
  visionAnalysis?: PhysiqueVisionAnalysis;
}

export interface IImageGeneratorOutput {
  imageUrl: string;
  metadata: {
    model: string;
    processingTimeMs: number;
    isMock: boolean;
  };
}

/**
 * Interface for physique image generation.
 *
 * MVP: MockImageGenerator returns a watermarked placeholder.
 *
 * Upgrade path:
 * - Implement ReplicateImageGenerator using Replicate API (SDXL, etc.)
 * - Implement StabilityImageGenerator using Stability AI
 * - Implement custom model via RunPod/Modal
 *
 * Each implementation must:
 * 1. Accept a source photo URL
 * 2. Return a generated/transformed image URL
 * 3. Include processing metadata
 * 4. Handle errors gracefully
 */
export interface IImageGenerator {
  generate(input: IImageGeneratorInput): Promise<IImageGeneratorOutput>;
}
