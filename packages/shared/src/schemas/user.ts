import { z } from "zod";
import {
  EXPERIENCE_LEVELS,
  TRAINING_GOALS,
  EQUIPMENT_OPTIONS,
  MUSCLE_GROUPS,
} from "../constants.js";

// ── Profile ──────────────────────────────────────────────
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  clerkId: z.string(),
  email: z.string().email(),
  displayName: z.string().min(1).max(50),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  goal: z.enum(TRAINING_GOALS),
  daysPerWeek: z.number().int().min(2).max(7),
  equipment: z.array(z.enum(EQUIPMENT_OPTIONS)).min(1),
  injuries: z.array(z.string()).default([]),
  dateOfBirth: z.string().datetime().optional(),
  isAgeVerified: z.boolean().default(false),
  onboardingComplete: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// ── Profile Create/Update ────────────────────────────────
export const CreateProfileSchema = z.object({
  displayName: z.string().min(1).max(50),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  goal: z.enum(TRAINING_GOALS),
  daysPerWeek: z.number().int().min(2).max(7),
  equipment: z.array(z.enum(EQUIPMENT_OPTIONS)).min(1),
  injuries: z.array(z.string()).default([]),
});

export type CreateProfile = z.infer<typeof CreateProfileSchema>;

export const UpdateProfileSchema = CreateProfileSchema.partial();
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;

// ── Age Verification ─────────────────────────────────────
export const AgeVerificationSchema = z.object({
  dateOfBirth: z.string().datetime(),
  confirmsOver18: z.literal(true, {
    errorMap: () => ({ message: "You must confirm you are 18 or older" }),
  }),
});

export type AgeVerification = z.infer<typeof AgeVerificationSchema>;

// ── Body Metric ──────────────────────────────────────────
export const BodyMetricSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  weight: z.number().positive().optional(),
  bodyFatPercent: z.number().min(1).max(60).optional(),
  chest: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  hips: z.number().positive().optional(),
  bicepLeft: z.number().positive().optional(),
  bicepRight: z.number().positive().optional(),
  thighLeft: z.number().positive().optional(),
  thighRight: z.number().positive().optional(),
  date: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type BodyMetric = z.infer<typeof BodyMetricSchema>;

export const CreateBodyMetricSchema = BodyMetricSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
});
export type CreateBodyMetric = z.infer<typeof CreateBodyMetricSchema>;

// ── Progress Summary ─────────────────────────────────────
export const ProgressSummarySchema = z.object({
  totalWorkouts: z.number(),
  currentStreak: z.number(),
  totalVolume: z.number(),
  personalRecords: z.array(
    z.object({
      exerciseName: z.string(),
      weight: z.number(),
      reps: z.number(),
      date: z.string().datetime(),
    }),
  ),
  volumeByMuscle: z.record(z.enum(MUSCLE_GROUPS), z.number()),
  recentMetrics: z.array(BodyMetricSchema),
});

export type ProgressSummary = z.infer<typeof ProgressSummarySchema>;
