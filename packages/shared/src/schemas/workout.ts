import { z } from "zod";
import { MUSCLE_GROUPS, EQUIPMENT_OPTIONS, SPLIT_TYPES } from "../constants";

// ── Exercise ─────────────────────────────────────────────
export const ExerciseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  muscleGroups: z.array(z.enum(MUSCLE_GROUPS)),
  equipment: z.array(z.enum(EQUIPMENT_OPTIONS)),
  instructions: z.string(),
  videoUrl: z.string().url().optional(),
});

export type Exercise = z.infer<typeof ExerciseSchema>;

// ── Exercise Prescription (within a plan day) ────────────
export const ExercisePrescriptionSchema = z.object({
  exerciseId: z.string().uuid(),
  exerciseName: z.string(),
  sets: z.number().int().min(1).max(10),
  repsMin: z.number().int().min(1),
  repsMax: z.number().int().min(1),
  restSeconds: z.number().int().min(30).max(600),
  rpeTarget: z.number().min(5).max(10),
  notes: z.string().optional(),
});

export type ExercisePrescription = z.infer<typeof ExercisePrescriptionSchema>;

// ── Plan Day ─────────────────────────────────────────────
export const PlanDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  label: z.string(), // e.g., "Push Day", "Upper Body"
  isRestDay: z.boolean(),
  exercises: z.array(ExercisePrescriptionSchema),
});

export type PlanDay = z.infer<typeof PlanDaySchema>;

// ── Plan Week ────────────────────────────────────────────
export const PlanWeekSchema = z.object({
  weekNumber: z.number().int().min(1).max(4),
  progressionNotes: z.string(),
  days: z.array(PlanDaySchema),
});

export type PlanWeek = z.infer<typeof PlanWeekSchema>;

// ── Workout Plan ─────────────────────────────────────────
export const WorkoutPlanSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  splitType: z.enum(SPLIT_TYPES),
  goal: z.string(),
  weeks: z.array(PlanWeekSchema),
  createdAt: z.string().datetime(),
  isActive: z.boolean(),
});

export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>;

// ── Set Log ──────────────────────────────────────────────
export const SetLogSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0),
  weight: z.number().min(0),
  rpe: z.number().min(1).max(10).optional(),
  timestamp: z.string().datetime(),
});

export type SetLog = z.infer<typeof SetLogSchema>;

export const CreateSetLogSchema = z.object({
  exerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0),
  weight: z.number().min(0),
  rpe: z.number().min(1).max(10).optional(),
});

export type CreateSetLog = z.infer<typeof CreateSetLogSchema>;

// ── Workout Session ──────────────────────────────────────
export const WorkoutSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  weekNumber: z.number().int(),
  dayNumber: z.number().int(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  completed: z.boolean(),
  sets: z.array(SetLogSchema),
});

export type WorkoutSession = z.infer<typeof WorkoutSessionSchema>;

export const StartWorkoutSchema = z.object({
  planId: z.string().uuid(),
  weekNumber: z.number().int().min(1).max(4),
  dayNumber: z.number().int().min(1).max(7),
});

export type StartWorkout = z.infer<typeof StartWorkoutSchema>;

// ── Plan Generation Request ──────────────────────────────
export const GeneratePlanRequestSchema = z.object({
  experienceLevel: z.string(),
  goal: z.string(),
  daysPerWeek: z.number().int().min(2).max(7),
  equipment: z.array(z.string()),
  injuries: z.array(z.string()),
});

export type GeneratePlanRequest = z.infer<typeof GeneratePlanRequestSchema>;
