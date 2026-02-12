import { callAI } from "./ai.js";
import {
  PhysiqueAIOutputSchema,
  type PhysiqueAIOutput,
  type IImageGenerator,
  type IImageGeneratorInput,
  type IImageGeneratorOutput,
  FITNESS_DISCLAIMERS,
} from "@deezed/shared";
import { createDownloadUrl } from "./storage.js";

// ═══════════════════════════════════════════════════════════
// MVP Mock Image Generator
// ═══════════════════════════════════════════════════════════
// This returns a placeholder image URL. In production, swap
// this with a real image generation implementation.
//
// UPGRADE PATH:
// 1. Create a new class implementing IImageGenerator
//    (e.g., ReplicateImageGenerator, StabilityImageGenerator)
// 2. Update the factory function below to return the new impl
// 3. The rest of the system stays unchanged
// ═══════════════════════════════════════════════════════════

export class MockImageGenerator implements IImageGenerator {
  async generate(_input: IImageGeneratorInput): Promise<IImageGeneratorOutput> {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return {
      imageUrl: "https://placehold.co/400x600/1a1a2e/e94560?text=DEEZED+PREVIEW%0A%0APhysique+Simulation%0A(Coming+Soon)&font=montserrat",
      metadata: {
        model: "mock-v1",
        processingTimeMs: 1500,
        isMock: true,
      },
    };
  }
}

// ═══════════════════════════════════════════════════════════
// Example: Replicate-based generator (uncomment to use)
// ═══════════════════════════════════════════════════════════
// export class ReplicateImageGenerator implements IImageGenerator {
//   private replicate: Replicate;
//
//   constructor(apiToken: string) {
//     this.replicate = new Replicate({ auth: apiToken });
//   }
//
//   async generate(input: IImageGeneratorInput): Promise<IImageGeneratorOutput> {
//     const start = Date.now();
//     const output = await this.replicate.run(
//       "stability-ai/sdxl:...",
//       {
//         input: {
//           image: input.sourceImageUrl,
//           prompt: `fitness transformation, ${input.scenario}, muscular physique, ${input.focusMuscle || "balanced"}`,
//           negative_prompt: "nsfw, explicit, inappropriate",
//           strength: 0.5,
//         },
//       },
//     );
//     return {
//       imageUrl: output[0] as string,
//       metadata: {
//         model: "sdxl-replicate",
//         processingTimeMs: Date.now() - start,
//         isMock: false,
//       },
//     };
//   }
// }

// ── Factory ──────────────────────────────────────────────
// Change this to return a different implementation when upgrading
export function createImageGenerator(): IImageGenerator {
  // MVP: Use mock generator
  return new MockImageGenerator();

  // Production: uncomment and configure
  // return new ReplicateImageGenerator(process.env.REPLICATE_API_TOKEN!);
}

// ── Physique Analysis Prompt ─────────────────────────────
const PHYSIQUE_SYSTEM_PROMPT = `You are Deezed AI Physique Analyst, an expert at visual physique assessment and program design.

IMPORTANT DISCLAIMERS:
- You are NOT a medical professional.
- Your assessments are general fitness observations, not diagnoses.
- Always recommend consulting a healthcare professional for medical concerns.
- Physique previews are illustrative simulations, not guaranteed outcomes.

You analyze a user's current physique description and create a targeted plan.
Since you cannot see the actual photo, base your analysis on the user context provided.

RULES:
- Be encouraging and constructive.
- Focus on muscle development opportunities, not flaws.
- Provide realistic timeframe expectations.
- Output ONLY valid JSON.

OUTPUT JSON SCHEMA:
{
  "estimatedCurrent": {
    "postureNotes": ["string"],
    "muscleEmphasisOpportunities": ["string"],
    "estimatedTrainingAge": "string"
  },
  "scenario": "3_month_lock_in | single_muscle_focus",
  "planUpdate": {
    "splitType": "string",
    "weeklySchedule": ["string"],
    "keyExercises": [
      {
        "name": "string",
        "targetMuscle": "string",
        "sets": number,
        "repsRange": "string",
        "priority": "high | medium | low"
      }
    ],
    "progressionRules": ["string"]
  },
  "nutritionTargets": {
    "calories": number,
    "proteinGrams": number,
    "carbsGrams": number,
    "fatGrams": number,
    "notes": "string"
  },
  "explanation": "string - user-friendly summary"
}`;

// ── Analyze & Simulate ───────────────────────────────────
export async function analyzeAndSimulate(input: {
  photoStorageKey: string;
  scenario: string;
  focusMuscle?: string;
  userProfile: {
    experienceLevel: string;
    goal: string;
    daysPerWeek: number;
    equipment: string[];
    injuries: string[];
    weight?: number;
  };
}): Promise<PhysiqueAIOutput> {
  const imageGenerator = createImageGenerator();

  // Get signed URL for the uploaded photo
  const photoUrl = await createDownloadUrl(input.photoStorageKey);

  // Run AI analysis and image generation in parallel
  const [analysisResult, imageResult] = await Promise.all([
    callAI({
      systemPrompt: PHYSIQUE_SYSTEM_PROMPT,
      userPrompt: buildPhysiqueUserPrompt(input),
      temperature: 0.6,
      maxTokens: 4096,
      parse: (raw: string) => JSON.parse(raw),
    }),
    imageGenerator.generate({
      sourceImageUrl: photoUrl,
      scenario: input.scenario,
      focusMuscle: input.focusMuscle,
      userProfile: {
        experienceLevel: input.userProfile.experienceLevel,
        goal: input.userProfile.goal,
      },
    }),
  ]);

  // Combine and validate
  const fullResult: PhysiqueAIOutput = PhysiqueAIOutputSchema.parse({
    ...analysisResult,
    scenario: input.scenario,
    imageResult: {
      type: imageResult.metadata.isMock ? "mock_preview" : "generated",
      url: imageResult.imageUrl,
      metadata: imageResult.metadata,
    },
    disclaimers: [...FITNESS_DISCLAIMERS],
  });

  return fullResult;
}

function buildPhysiqueUserPrompt(input: {
  scenario: string;
  focusMuscle?: string;
  userProfile: {
    experienceLevel: string;
    goal: string;
    daysPerWeek: number;
    equipment: string[];
    injuries: string[];
    weight?: number;
  };
}): string {
  return `Analyze this user and create a targeted plan:

User Profile:
- Experience: ${input.userProfile.experienceLevel}
- Goal: ${input.userProfile.goal}
- Training days/week: ${input.userProfile.daysPerWeek}
- Equipment: ${input.userProfile.equipment.join(", ")}
- Injuries: ${input.userProfile.injuries.length > 0 ? input.userProfile.injuries.join(", ") : "None"}
${input.userProfile.weight ? `- Weight: ${input.userProfile.weight} lbs` : ""}

Scenario: ${input.scenario === "3_month_lock_in" ? "3 months of full dedication (diet + training adherence)" : `Focus on ${input.focusMuscle} development`}
${input.focusMuscle ? `Focus muscle: ${input.focusMuscle}` : ""}

Provide realistic assessment and a targeted plan for this scenario.
For the 3-month scenario, assume 100% adherence to training and nutrition.
For single muscle focus, optimize the program to prioritize that muscle while maintaining overall balance.`;
}
