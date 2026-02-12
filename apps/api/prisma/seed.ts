import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXERCISES = [
  // Chest
  { name: "Barbell Bench Press", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["full_gym", "home_barbell"], instructions: "Lie on bench, grip bar slightly wider than shoulders, lower to chest, press up." },
  { name: "Dumbbell Incline Press", muscleGroups: ["chest", "shoulders", "triceps"], equipment: ["full_gym", "home_dumbbells"], instructions: "Set bench to 30-45°, press dumbbells from chest level overhead." },
  { name: "Cable Flyes", muscleGroups: ["chest"], equipment: ["full_gym"], instructions: "Stand between cables, bring handles together in front of chest with slight elbow bend." },
  { name: "Push-ups", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["bodyweight_only"], instructions: "Hands shoulder-width apart, lower chest to ground, push back up." },
  { name: "Dumbbell Chest Flyes", muscleGroups: ["chest"], equipment: ["full_gym", "home_dumbbells"], instructions: "Lie flat, extend arms out to sides with slight elbow bend, bring together over chest." },

  // Back
  { name: "Barbell Deadlift", muscleGroups: ["back", "hamstrings", "glutes"], equipment: ["full_gym", "home_barbell"], instructions: "Hinge at hips, grip bar, drive through heels to stand. Keep back neutral." },
  { name: "Pull-ups", muscleGroups: ["back", "biceps"], equipment: ["full_gym", "bodyweight_only"], instructions: "Hang from bar, pull chin above bar, lower with control." },
  { name: "Barbell Row", muscleGroups: ["back", "biceps"], equipment: ["full_gym", "home_barbell"], instructions: "Hinge forward 45°, pull bar to lower chest, squeeze shoulder blades." },
  { name: "Lat Pulldown", muscleGroups: ["back", "biceps"], equipment: ["full_gym"], instructions: "Grip bar wide, pull to upper chest, control the return." },
  { name: "Seated Cable Row", muscleGroups: ["back", "biceps"], equipment: ["full_gym"], instructions: "Sit upright, pull handle to torso, squeeze shoulder blades together." },
  { name: "Dumbbell Row", muscleGroups: ["back", "biceps"], equipment: ["full_gym", "home_dumbbells"], instructions: "One arm on bench, row dumbbell to hip, control the lowering." },

  // Shoulders
  { name: "Overhead Press", muscleGroups: ["shoulders", "triceps"], equipment: ["full_gym", "home_barbell"], instructions: "Press bar from front of shoulders to overhead lockout." },
  { name: "Dumbbell Lateral Raise", muscleGroups: ["shoulders"], equipment: ["full_gym", "home_dumbbells"], instructions: "Raise dumbbells out to sides to shoulder height, control descent." },
  { name: "Face Pulls", muscleGroups: ["shoulders", "traps"], equipment: ["full_gym", "resistance_bands"], instructions: "Pull rope/band to face level, externally rotating at top." },
  { name: "Dumbbell Shoulder Press", muscleGroups: ["shoulders", "triceps"], equipment: ["full_gym", "home_dumbbells"], instructions: "Press dumbbells from shoulder level to overhead." },

  // Biceps
  { name: "Barbell Curl", muscleGroups: ["biceps"], equipment: ["full_gym", "home_barbell"], instructions: "Curl bar from thighs to shoulders, keep elbows pinned." },
  { name: "Dumbbell Curl", muscleGroups: ["biceps"], equipment: ["full_gym", "home_dumbbells"], instructions: "Curl dumbbells alternating or together, full range of motion." },
  { name: "Hammer Curls", muscleGroups: ["biceps", "forearms"], equipment: ["full_gym", "home_dumbbells"], instructions: "Curl with neutral grip (palms facing each other)." },

  // Triceps
  { name: "Tricep Pushdown", muscleGroups: ["triceps"], equipment: ["full_gym"], instructions: "Push cable attachment down, keeping elbows at sides." },
  { name: "Overhead Tricep Extension", muscleGroups: ["triceps"], equipment: ["full_gym", "home_dumbbells"], instructions: "Hold weight overhead, lower behind head, extend back up." },
  { name: "Dips", muscleGroups: ["triceps", "chest"], equipment: ["full_gym", "bodyweight_only"], instructions: "Lower body between parallel bars, press back up." },

  // Quads
  { name: "Barbell Squat", muscleGroups: ["quads", "glutes", "hamstrings"], equipment: ["full_gym", "home_barbell"], instructions: "Bar on upper back, squat to parallel or below, drive up." },
  { name: "Leg Press", muscleGroups: ["quads", "glutes"], equipment: ["full_gym"], instructions: "Feet shoulder-width on platform, lower sled, press back up." },
  { name: "Bulgarian Split Squat", muscleGroups: ["quads", "glutes"], equipment: ["full_gym", "home_dumbbells", "bodyweight_only"], instructions: "Rear foot on bench, lower front knee to 90°, drive up." },
  { name: "Leg Extension", muscleGroups: ["quads"], equipment: ["full_gym"], instructions: "Extend legs against pad, squeeze quads at top." },
  { name: "Goblet Squat", muscleGroups: ["quads", "glutes"], equipment: ["home_dumbbells"], instructions: "Hold dumbbell at chest, squat deep, drive up." },

  // Hamstrings
  { name: "Romanian Deadlift", muscleGroups: ["hamstrings", "glutes"], equipment: ["full_gym", "home_barbell", "home_dumbbells"], instructions: "Hinge at hips with slight knee bend, lower weight along shins, feel hamstring stretch." },
  { name: "Leg Curl", muscleGroups: ["hamstrings"], equipment: ["full_gym"], instructions: "Curl heels toward glutes against pad resistance." },
  { name: "Nordic Hamstring Curl", muscleGroups: ["hamstrings"], equipment: ["bodyweight_only"], instructions: "Kneel, anchor feet, slowly lower torso forward, catch yourself." },

  // Glutes
  { name: "Hip Thrust", muscleGroups: ["glutes", "hamstrings"], equipment: ["full_gym", "home_barbell"], instructions: "Back against bench, drive hips up with barbell on lap, squeeze at top." },
  { name: "Cable Pull-Through", muscleGroups: ["glutes", "hamstrings"], equipment: ["full_gym"], instructions: "Face away from cable, hinge and pull through legs, squeeze glutes." },

  // Calves
  { name: "Standing Calf Raise", muscleGroups: ["calves"], equipment: ["full_gym", "bodyweight_only"], instructions: "Rise onto toes, pause at top, lower slowly." },
  { name: "Seated Calf Raise", muscleGroups: ["calves"], equipment: ["full_gym"], instructions: "Sit with pad on knees, raise heels, control descent." },

  // Abs
  { name: "Cable Crunch", muscleGroups: ["abs"], equipment: ["full_gym"], instructions: "Kneel at cable, crunch down bringing elbows to knees." },
  { name: "Hanging Leg Raise", muscleGroups: ["abs"], equipment: ["full_gym", "bodyweight_only"], instructions: "Hang from bar, raise legs to parallel or above." },
  { name: "Plank", muscleGroups: ["abs"], equipment: ["bodyweight_only"], instructions: "Hold push-up position on forearms, keep body straight." },
  { name: "Ab Wheel Rollout", muscleGroups: ["abs"], equipment: ["full_gym"], instructions: "Kneel, roll wheel out maintaining core tension, pull back." },
];

async function main() {
  console.info("🌱 Seeding exercise library...");

  for (const exercise of EXERCISES) {
    await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: exercise,
      create: exercise,
    });
  }

  console.info(`✅ Seeded ${EXERCISES.length} exercises.`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
