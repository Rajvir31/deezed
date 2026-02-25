// ── Experience Levels ─────────────────────────────────────
export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

// ── Training Goals ───────────────────────────────────────
export const TRAINING_GOALS = ["hypertrophy", "strength", "cut"] as const;
export type TrainingGoal = (typeof TRAINING_GOALS)[number];

// ── Big 3 Powerlifts ────────────────────────────────────
export const BIG_THREE_LIFTS = ["bench", "squat", "deadlift"] as const;
export type BigThreeLift = (typeof BIG_THREE_LIFTS)[number];

// ── Equipment Access ─────────────────────────────────────
export const EQUIPMENT_OPTIONS = [
  "full_gym",
  "home_dumbbells",
  "home_barbell",
  "bodyweight_only",
  "resistance_bands",
] as const;
export type EquipmentAccess = (typeof EQUIPMENT_OPTIONS)[number];

// ── Workout Splits ───────────────────────────────────────
export const SPLIT_TYPES = [
  "full_body",
  "upper_lower",
  "push_pull_legs",
  "push_pull_legs_upper_lower",
  "bro_split",
] as const;
export type SplitType = (typeof SPLIT_TYPES)[number];

// ── Muscle Groups ────────────────────────────────────────
export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "forearms",
  "traps",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

// ── Day Labels ───────────────────────────────────────────
export const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

// ── Split Recommendations Based on Days/Week ─────────────
export const SPLIT_RECOMMENDATIONS: Record<number, SplitType> = {
  2: "full_body",
  3: "full_body",
  4: "upper_lower",
  5: "push_pull_legs",
  6: "push_pull_legs",
};

// ── Photo Types ──────────────────────────────────────────
export const PHOTO_TYPES = [
  "progress",
  "physique_input",
  "physique_output",
] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];

// ── AI Result Types ──────────────────────────────────────
export const AI_RESULT_TYPES = ["plan", "coach", "physique"] as const;
export type AIResultType = (typeof AI_RESULT_TYPES)[number];

// ── Physique Scenarios ───────────────────────────────────
export const PHYSIQUE_SCENARIOS = [
  "3_month_lock_in",
  "single_muscle_focus",
] as const;
export type PhysiqueScenario = (typeof PHYSIQUE_SCENARIOS)[number];

// ── Disclaimers ──────────────────────────────────────────
export const FITNESS_DISCLAIMERS = [
  "This is AI-generated fitness guidance, not medical advice.",
  "Consult a healthcare professional before starting any new exercise program.",
  "Results vary based on genetics, consistency, nutrition, sleep, and other factors.",
  "The physique preview is an illustrative simulation, not a guaranteed outcome.",
  "We do not store, train on, or share your photos with third parties.",
] as const;

// ── Signed URL Expiry ────────────────────────────────────
export const SIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

// ── Photo Retention ──────────────────────────────────────
export const PHOTO_RETENTION_POLICY =
  "Photos are kept until you delete them. You can delete individual photos or all photos at any time from Settings.";
