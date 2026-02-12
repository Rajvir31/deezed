import { z } from "zod";

// ── Coach Message ────────────────────────────────────────
export const CoachMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string().datetime(),
});

export type CoachMessage = z.infer<typeof CoachMessageSchema>;

// ── Coach Request ────────────────────────────────────────
export const CoachRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationHistory: z.array(CoachMessageSchema).max(50).default([]),
});

export type CoachRequest = z.infer<typeof CoachRequestSchema>;

// ── Coach Response ───────────────────────────────────────
export const CoachResponseSchema = z.object({
  reply: z.string(),
  rationale: z.string(),
  suggestedActions: z.array(
    z.object({
      type: z.enum(["swap_exercise", "adjust_volume", "adjust_intensity", "rest_day", "deload", "other"]),
      description: z.string(),
      planUpdate: z
        .object({
          weekNumber: z.number().optional(),
          dayNumber: z.number().optional(),
          exerciseChanges: z
            .array(
              z.object({
                oldExercise: z.string().optional(),
                newExercise: z.string().optional(),
                sets: z.number().optional(),
                repsMin: z.number().optional(),
                repsMax: z.number().optional(),
              }),
            )
            .optional(),
        })
        .optional(),
    }),
  ),
});

export type CoachResponse = z.infer<typeof CoachResponseSchema>;

// ── AI Plan Generation Output ────────────────────────────
export const AIPlanOutputSchema = z.object({
  explanation: z.string(),
  splitType: z.string(),
  weeks: z.array(
    z.object({
      weekNumber: z.number(),
      progressionNotes: z.string(),
      days: z.array(
        z.object({
          dayNumber: z.number(),
          label: z.string(),
          isRestDay: z.boolean(),
          exercises: z.array(
            z.object({
              exerciseName: z.string(),
              muscleGroups: z.array(z.string()),
              sets: z.number(),
              repsMin: z.number(),
              repsMax: z.number(),
              restSeconds: z.number(),
              rpeTarget: z.number(),
              notes: z.string().optional(),
            }),
          ),
        }),
      ),
    }),
  ),
});

export type AIPlanOutput = z.infer<typeof AIPlanOutputSchema>;

// ── AI Result (persisted) ────────────────────────────────
export const AIResultSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(["plan", "coach", "physique"]),
  inputRefs: z.record(z.unknown()),
  outputJson: z.record(z.unknown()),
  createdAt: z.string().datetime(),
});

export type AIResult = z.infer<typeof AIResultSchema>;
