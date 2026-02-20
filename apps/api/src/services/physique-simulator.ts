import Replicate from "replicate";
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
// FLUX Kontext Pro Image Generator via Replicate
// ═══════════════════════════════════════════════════════════

export class FluxKontextImageGenerator implements IImageGenerator {
  private replicate: Replicate;

  constructor(apiToken: string) {
    this.replicate = new Replicate({ auth: apiToken });
  }

  async generate(input: IImageGeneratorInput): Promise<IImageGeneratorOutput> {
    const start = Date.now();

    const prompt = this.buildPrompt(input);

    const output = await this.replicate.run("black-forest-labs/flux-kontext-pro", {
      input: {
        prompt,
        input_image: input.sourceImageUrl,
        output_format: "jpg",
        aspect_ratio: "3:4",
      },
    });

    let imageUrl: string;
    if (typeof output === "string") {
      imageUrl = output;
    } else if (output && typeof (output as any).url === "string") {
      imageUrl = (output as any).url;
    } else if (output && typeof (output as any).url === "function") {
      imageUrl = (output as any).url();
    } else if (output && typeof (output as any).toString === "function") {
      imageUrl = (output as any).toString();
    } else {
      imageUrl = String(output);
    }

    return {
      imageUrl,
      metadata: {
        model: "flux-kontext-pro",
        processingTimeMs: Date.now() - start,
        isMock: false,
      },
    };
  }

  private buildPrompt(input: IImageGeneratorInput): string {
    const scenarioDesc = input.scenario === "3_month_lock_in"
      ? "after 3 months of dedicated strength training and clean nutrition"
      : `with significantly more developed ${input.focusMuscle ?? "muscles"}`;

    const goalHint = input.userProfile.goal === "muscle_gain"
      ? "more muscular with visible hypertrophy"
      : input.userProfile.goal === "fat_loss"
        ? "leaner with more visible muscle definition and less body fat"
        : "more athletic and toned with improved muscle definition";

    return [
      `Show this exact same person ${scenarioDesc}.`,
      `Make them look ${goalHint}.`,
      "Keep the same face, identity, skin tone, hair, pose, clothing, and background.",
      "The transformation should look realistic and achievable — natural lighting, real skin texture, no artificial glow or cartoon effects.",
      input.focusMuscle
        ? `Emphasize visible growth in the ${input.focusMuscle} area specifically.`
        : "Show balanced overall muscle development.",
      "Do NOT change the person's face or identity in any way.",
    ].join(" ");
  }
}

export function createImageGenerator(): IImageGenerator {
  return new FluxKontextImageGenerator(process.env.REPLICATE_API_TOKEN!);
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
