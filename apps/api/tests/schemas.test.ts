import { describe, it, expect } from "vitest";
import {
  CreateProfileSchema,
  StartWorkoutSchema,
  CreateSetLogSchema,
  CoachRequestSchema,
  PhysiqueAnalyzeRequestSchema,
  AIPlanOutputSchema,
  CoachResponseSchema,
  PhysiqueAIOutputSchema,
} from "@deezed/shared";

describe("Zod Schemas", () => {
  describe("CreateProfileSchema", () => {
    it("accepts valid profile data", () => {
      const data = {
        displayName: "John",
        experienceLevel: "intermediate",
        goal: "hypertrophy",
        daysPerWeek: 4,
        equipment: ["full_gym"],
        injuries: [],
      };
      const result = CreateProfileSchema.parse(data);
      expect(result.displayName).toBe("John");
      expect(result.daysPerWeek).toBe(4);
    });

    it("rejects invalid days per week", () => {
      const data = {
        displayName: "John",
        experienceLevel: "intermediate",
        goal: "hypertrophy",
        daysPerWeek: 8, // too many
        equipment: ["full_gym"],
      };
      expect(() => CreateProfileSchema.parse(data)).toThrow();
    });

    it("rejects empty display name", () => {
      const data = {
        displayName: "",
        experienceLevel: "beginner",
        goal: "strength",
        daysPerWeek: 3,
        equipment: ["bodyweight_only"],
      };
      expect(() => CreateProfileSchema.parse(data)).toThrow();
    });

    it("rejects invalid experience level", () => {
      const data = {
        displayName: "Test",
        experienceLevel: "pro",
        goal: "hypertrophy",
        daysPerWeek: 4,
        equipment: ["full_gym"],
      };
      expect(() => CreateProfileSchema.parse(data)).toThrow();
    });
  });

  describe("StartWorkoutSchema", () => {
    it("accepts valid workout start", () => {
      const data = {
        planId: "550e8400-e29b-41d4-a716-446655440000",
        weekNumber: 1,
        dayNumber: 3,
      };
      const result = StartWorkoutSchema.parse(data);
      expect(result.weekNumber).toBe(1);
    });

    it("rejects week number > 4", () => {
      expect(() =>
        StartWorkoutSchema.parse({
          planId: "550e8400-e29b-41d4-a716-446655440000",
          weekNumber: 5,
          dayNumber: 1,
        }),
      ).toThrow();
    });
  });

  describe("CreateSetLogSchema", () => {
    it("accepts valid set log", () => {
      const data = {
        exerciseId: "550e8400-e29b-41d4-a716-446655440000",
        setNumber: 1,
        reps: 10,
        weight: 135,
        rpe: 8,
      };
      const result = CreateSetLogSchema.parse(data);
      expect(result.reps).toBe(10);
      expect(result.weight).toBe(135);
    });

    it("allows optional rpe", () => {
      const data = {
        exerciseId: "550e8400-e29b-41d4-a716-446655440000",
        setNumber: 1,
        reps: 10,
        weight: 135,
      };
      const result = CreateSetLogSchema.parse(data);
      expect(result.rpe).toBeUndefined();
    });

    it("rejects negative weight", () => {
      expect(() =>
        CreateSetLogSchema.parse({
          exerciseId: "550e8400-e29b-41d4-a716-446655440000",
          setNumber: 1,
          reps: 10,
          weight: -5,
        }),
      ).toThrow();
    });
  });

  describe("CoachRequestSchema", () => {
    it("accepts valid coach request", () => {
      const data = {
        message: "How do I break through a bench press plateau?",
        conversationHistory: [],
      };
      const result = CoachRequestSchema.parse(data);
      expect(result.message).toContain("plateau");
    });

    it("rejects empty message", () => {
      expect(() =>
        CoachRequestSchema.parse({ message: "", conversationHistory: [] }),
      ).toThrow();
    });
  });

  describe("PhysiqueAnalyzeRequestSchema", () => {
    it("accepts 3 month lock in scenario", () => {
      const data = {
        photoStorageKey: "user123/physique_input/abc",
        scenario: "3_month_lock_in",
      };
      const result = PhysiqueAnalyzeRequestSchema.parse(data);
      expect(result.scenario).toBe("3_month_lock_in");
    });

    it("accepts single muscle focus with focus muscle", () => {
      const data = {
        photoStorageKey: "user123/physique_input/abc",
        scenario: "single_muscle_focus",
        focusMuscle: "chest",
      };
      const result = PhysiqueAnalyzeRequestSchema.parse(data);
      expect(result.focusMuscle).toBe("chest");
    });
  });

  describe("AI Output Schemas", () => {
    it("validates AI plan output structure", () => {
      const mockOutput = {
        explanation: "Here's your plan",
        splitType: "push_pull_legs",
        weeks: [
          {
            weekNumber: 1,
            progressionNotes: "Focus on form",
            days: [
              {
                dayNumber: 1,
                label: "Push Day",
                isRestDay: false,
                exercises: [
                  {
                    exerciseName: "Bench Press",
                    muscleGroups: ["chest"],
                    sets: 4,
                    repsMin: 8,
                    repsMax: 12,
                    restSeconds: 120,
                    rpeTarget: 7,
                  },
                ],
              },
            ],
          },
        ],
      };
      const result = AIPlanOutputSchema.parse(mockOutput);
      expect(result.weeks).toHaveLength(1);
      expect(result.weeks[0].days[0].exercises[0].exerciseName).toBe("Bench Press");
    });

    it("validates coach response structure", () => {
      const mockResponse = {
        reply: "Try pausing at the bottom of your bench press.",
        rationale: "Paused reps help build strength at the sticking point.",
        suggestedActions: [
          {
            type: "adjust_intensity" as const,
            description: "Add 2-second paused reps on first set",
          },
        ],
      };
      const result = CoachResponseSchema.parse(mockResponse);
      expect(result.suggestedActions).toHaveLength(1);
    });

    it("validates physique AI output structure", () => {
      const mockOutput = {
        estimatedCurrent: {
          postureNotes: ["Good posture"],
          muscleEmphasisOpportunities: ["Chest development potential"],
          estimatedTrainingAge: "2-3 years",
        },
        scenario: "3_month_lock_in",
        planUpdate: {
          splitType: "push_pull_legs",
          weeklySchedule: ["Push", "Pull", "Legs", "Rest", "Push", "Pull", "Rest"],
          keyExercises: [
            {
              name: "Incline Dumbbell Press",
              targetMuscle: "chest",
              sets: 4,
              repsRange: "8-12",
              priority: "high" as const,
            },
          ],
          progressionRules: ["Add 5lbs when hitting 12 reps on all sets"],
        },
        nutritionTargets: {
          calories: 2800,
          proteinGrams: 180,
          carbsGrams: 350,
          fatGrams: 80,
          notes: "Focus on whole foods",
        },
        imageResult: {
          type: "mock_preview" as const,
          url: "https://example.com/mock.png",
          metadata: { model: "mock-v1", processingTime: 1500, isMock: true },
        },
        disclaimers: ["This is not medical advice"],
        explanation: "Based on your profile...",
      };
      const result = PhysiqueAIOutputSchema.parse(mockOutput);
      expect(result.nutritionTargets.calories).toBe(2800);
    });
  });
});
