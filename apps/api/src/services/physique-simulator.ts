import Replicate from "replicate";
import { callAI, callAIVision } from "./ai.js";
import {
  PhysiqueAIOutputSchema,
  type PhysiqueAIOutput,
  type PhysiqueVisionAnalysis,
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

    let output;
    try {
      output = await this.replicate.run("black-forest-labs/flux-kontext-pro", {
        input: {
          prompt,
          input_image: input.sourceImageUrl,
          safety_tolerance: 2,
          output_format: "png",
          aspect_ratio: "match_input_image",
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("flagged as sensitive") || msg.includes("E005")) {
        throw new Error(
          "Your photo was flagged by the image safety filter. Try using a photo from the neck or chin down — photos without faces are much less likely to be flagged.",
        );
      }
      throw err;
    }

    const raw = output as any;
    let imageUrl: string;
    if (typeof raw === "string") {
      imageUrl = raw;
    } else if (raw?.url?.href) {
      imageUrl = raw.url.href;
    } else if (typeof raw?.url === "string") {
      imageUrl = raw.url;
    } else {
      imageUrl = String(raw);
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
    const va = input.visionAnalysis;
    const goal = input.userProfile.goal;
    const level = input.userProfile.experienceLevel;

    // Build the core body-change instruction from vision analysis
    const changeDesc = this.buildChangeDescription(goal, level, va, input.focusMuscle);

    if (input.scenario === "3_month_lock_in") {
      return `${changeDesc} while maintaining the same face, expression, pose, clothing, and background.`;
    }

    return `Make the ${input.focusMuscle ?? "muscles"} slightly bigger and more defined. ${changeDesc} while maintaining the same face, expression, pose, clothing, and background.`;
  }

  private buildChangeDescription(
    goal: string,
    level: string,
    va: PhysiqueVisionAnalysis | undefined,
    focusMuscle?: string,
  ): string {
    const intensity = level === "advanced" ? "subtly" : "slightly";

    const areas = va
      ? va.keyOpportunities.slice(0, 3).join(", ")
      : "chest, shoulders, and arms";

    if (goal === "hypertrophy") {
      return `Make this person ${intensity} more muscular with a bit more size in the ${areas}`;
    }
    if (goal === "cut") {
      return `Make this person ${intensity} leaner with a bit more muscle definition and a tighter midsection${focusMuscle ? "" : ". Keep muscle size the same but reduce body fat slightly"}`;
    }
    if (goal === "strength") {
      return `Make this person look ${intensity} thicker and more solid, especially in the ${areas}`;
    }
    return `Make this person look ${intensity} more athletic and toned with a bit more definition in the ${areas}`;
  }
}

export function createImageGenerator(): IImageGenerator {
  return new FluxKontextImageGenerator(process.env.REPLICATE_API_TOKEN!);
}

// ═══════════════════════════════════════════════════════════
// GPT-4o Vision — Quick Physique Scan
// ═══════════════════════════════════════════════════════════

const VISION_SCAN_SYSTEM_PROMPT = `You are an expert fitness coach and physique analyst. You will be shown a photo of a person. Analyze their current physique and output ONLY valid JSON matching this schema:

{
  "bodyFatRange": "string — estimated body fat percentage range, e.g. '15-18%'",
  "buildType": "string — one of: slim, average, stocky, athletic, muscular",
  "muscleDevelopment": "string — brief description of overall visible muscle development, e.g. 'moderate chest and arm development, underdeveloped back and shoulders'",
  "keyOpportunities": ["string — top 3-4 muscle groups with most room for visible improvement"],
  "realisticChanges": "string — a single detailed sentence describing what specific visible physical changes are realistically achievable in 3 months of perfect training and nutrition for this person's starting point. Be specific about body fat reduction ranges and which muscles would visibly grow."
}

RULES:
- Base everything on what you can actually see in the photo.
- Be realistic and encouraging. Do not exaggerate or understate.
- The realisticChanges field must describe concrete physical changes (e.g. 'reduce body fat from ~20% to ~16%, add visible size to chest and shoulders, tighten midsection'), not abstract goals.
- Output ONLY the JSON object, nothing else.`;

export async function runVisionPhysiqueScan(
  photoUrl: string,
  experienceLevel: string,
): Promise<PhysiqueVisionAnalysis> {
  return callAIVision<PhysiqueVisionAnalysis>({
    systemPrompt: VISION_SCAN_SYSTEM_PROMPT,
    userPrompt: `Analyze this person's physique. They are a ${experienceLevel} lifter. Provide your assessment as JSON.`,
    imageUrl: photoUrl,
    temperature: 0.3,
    maxTokens: 512,
    parse: (raw) => JSON.parse(raw),
  });
}

// ═══════════════════════════════════════════════════════════
// Text-Based Physique Analysis Prompt (plan generation)
// ═══════════════════════════════════════════════════════════

const PHYSIQUE_SYSTEM_PROMPT = `You are Deezed AI Physique Analyst, an expert at visual physique assessment and program design.

IMPORTANT DISCLAIMERS:
- You are NOT a medical professional.
- Your assessments are general fitness observations, not diagnoses.
- Always recommend consulting a healthcare professional for medical concerns.
- Physique previews are illustrative simulations, not guaranteed outcomes.

You analyze a user's current physique and create a targeted plan.
Use the provided vision analysis of their photo to ground your assessment.

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

  const photoUrl = await createDownloadUrl(input.photoStorageKey);

  // Step 1: Run GPT-4o Vision to analyze the actual photo first
  const visionAnalysis = await runVisionPhysiqueScan(
    photoUrl,
    input.userProfile.experienceLevel,
  );

  // Step 2: Run text-based plan analysis and vision-informed image generation in parallel
  const [analysisResult, imageResult] = await Promise.all([
    callAI({
      systemPrompt: PHYSIQUE_SYSTEM_PROMPT,
      userPrompt: buildPhysiqueUserPrompt(input, visionAnalysis),
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
      visionAnalysis,
    }),
  ]);

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

function buildPhysiqueUserPrompt(
  input: {
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
  },
  visionAnalysis: PhysiqueVisionAnalysis,
): string {
  return `Analyze this user and create a targeted plan:

User Profile:
- Experience: ${input.userProfile.experienceLevel}
- Goal: ${input.userProfile.goal}
- Training days/week: ${input.userProfile.daysPerWeek}
- Equipment: ${input.userProfile.equipment.join(", ")}
- Injuries: ${input.userProfile.injuries.length > 0 ? input.userProfile.injuries.join(", ") : "None"}
${input.userProfile.weight ? `- Weight: ${input.userProfile.weight} lbs` : ""}

Photo Analysis (from vision scan):
- Build type: ${visionAnalysis.buildType}
- Estimated body fat: ${visionAnalysis.bodyFatRange}
- Muscle development: ${visionAnalysis.muscleDevelopment}
- Key opportunities: ${visionAnalysis.keyOpportunities.join(", ")}
- Realistic 3-month changes: ${visionAnalysis.realisticChanges}

Scenario: ${input.scenario === "3_month_lock_in" ? "3 months of full dedication (diet + training adherence)" : `Focus on ${input.focusMuscle} development`}
${input.focusMuscle ? `Focus muscle: ${input.focusMuscle}` : ""}

Provide realistic assessment and a targeted plan for this scenario.
For the 3-month scenario, assume 100% adherence to training and nutrition.
For single muscle focus, optimize the program to prioritize that muscle while maintaining overall balance.
Use the photo analysis above to ground your recommendations in this person's actual starting point.`;
}
