import Replicate from "replicate";
import sharp from "sharp";
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
import { createDownloadUrl, uploadBuffer } from "./storage.js";

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
          safety_tolerance: 5,
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

  private buildIdentityLock(va?: PhysiqueVisionAnalysis): string {
    const facialHairDesc =
      va?.facialHair && va.facialHair !== "not visible"
        ? `This person's facial hair is: ${va.facialHair}. Keep their facial hair exactly the same.`
        : "Preserve the person's exact facial hair (or lack thereof).";

    return (
      `${facialHairDesc} ` +
      "Keep the exact same hairstyle, hair color, skin tone, tattoos, scars, face, expression, pose, clothing, and background. " +
      "The ONLY change should be to body musculature and body fat."
    );
  }

  private buildPrompt(input: IImageGeneratorInput): string {
    const changeDesc = this.buildChangeDescription(input);
    const lock = this.buildIdentityLock(input.visionAnalysis);

    if (input.scenario === "3_month_lock_in") {
      return `${changeDesc}. ${lock}`;
    }

    return `Make the ${input.focusMuscle ?? "muscles"} bigger and more defined. ${changeDesc}. ${lock}`;
  }

  private buildChangeDescription(input: IImageGeneratorInput): string {
    const { goal, experienceLevel, daysPerWeek, equipment } = input.userProfile;
    const va = input.visionAnalysis;

    const intensity = this.getIntensity(experienceLevel, daysPerWeek);
    const physiqueStyle = this.getPhysiqueStyle(equipment);

    const areas = va
      ? va.keyOpportunities.slice(0, 3).join(", ")
      : "chest, shoulders, and arms";

    const onlyBody = "Only modify the body and physique, nothing else.";

    if (goal === "hypertrophy") {
      return `Make this person's body ${intensity} more muscular with more size in the ${areas} and a ${physiqueStyle} look. ${onlyBody}`;
    }
    if (goal === "cut") {
      return `Make this person's body ${intensity} leaner with more visible muscle definition, a tighter midsection, and less body fat with a ${physiqueStyle} look. ${onlyBody}`;
    }
    if (goal === "strength") {
      return `Make this person's body look ${intensity} thicker and more solid with more mass in the ${areas} and a ${physiqueStyle} build. ${onlyBody}`;
    }
    return `Make this person's body look ${intensity} more athletic and toned with more definition in the ${areas} and a ${physiqueStyle} look. ${onlyBody}`;
  }

  private getIntensity(level: string, daysPerWeek: number): string {
    // More training days + less experience = more visible newbie gains
    if (level === "advanced") return "slightly";
    if (level === "beginner" && daysPerWeek >= 5) return "noticeably";
    if (level === "beginner") return "moderately";
    if (daysPerWeek >= 5) return "moderately";
    return "moderately";
  }

  private getPhysiqueStyle(equipment: string[]): string {
    if (equipment.includes("full_gym")) return "well-rounded muscular";
    if (equipment.includes("home_barbell")) return "strong and dense";
    if (equipment.includes("home_dumbbells")) return "toned and defined";
    if (equipment.includes("bodyweight_only")) return "lean and athletic";
    return "fit and toned";
  }
}

export function createImageGenerator(): IImageGenerator {
  return new FluxKontextImageGenerator(process.env.REPLICATE_API_TOKEN!);
}

// ═══════════════════════════════════════════════════════════
// Face-Preservation Composite (raw pixel blending)
// Reads both images pixel-by-pixel: everything above the
// chin is 100 % original pixels, then a short gradient
// blends into the FLUX-generated body below.
// ═══════════════════════════════════════════════════════════

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function compositePreserveFace(
  originalUrl: string,
  generatedUrl: string,
  faceEndPercent: number,
): Promise<Buffer> {
  const [origBuf, genBuf] = await Promise.all([
    fetchImageBuffer(originalUrl),
    fetchImageBuffer(generatedUrl),
  ]);

  const origMeta = await sharp(origBuf).metadata();
  const width = origMeta.width!;
  const height = origMeta.height!;

  // Clamp faceEndPercent to a sane range (fallback to 30 % if GPT returned junk)
  const pct = faceEndPercent >= 5 && faceEndPercent <= 70 ? faceEndPercent : 30;

  // Decode both images to raw RGBA at identical dimensions
  const [origRaw, genRaw] = await Promise.all([
    sharp(origBuf).resize(width, height).ensureAlpha().raw().toBuffer(),
    sharp(genBuf).resize(width, height).ensureAlpha().raw().toBuffer(),
  ]);

  const chinPx = Math.round((pct / 100) * height);
  // Keep original solid for 5 % of the image below the chin (safety margin)
  const solidEnd = Math.min(height, chinPx + Math.round(height * 0.05));
  // Then blend over a 6 % zone into the generated body
  const fadeEnd = Math.min(height, solidEnd + Math.round(height * 0.06));

  const out = Buffer.alloc(origRaw.length);
  for (let y = 0; y < height; y++) {
    // origWeight: 1.0 = 100 % original, 0.0 = 100 % generated
    let w: number;
    if (y <= solidEnd) {
      w = 1.0;
    } else if (y >= fadeEnd) {
      w = 0.0;
    } else {
      w = 1.0 - (y - solidEnd) / (fadeEnd - solidEnd);
    }

    const rowStart = y * width * 4;
    if (w === 1.0) {
      origRaw.copy(out, rowStart, rowStart, rowStart + width * 4);
    } else if (w === 0.0) {
      genRaw.copy(out, rowStart, rowStart, rowStart + width * 4);
    } else {
      const g = 1.0 - w;
      for (let x = 0; x < width; x++) {
        const i = rowStart + x * 4;
        out[i]     = Math.round(origRaw[i]     * w + genRaw[i]     * g);
        out[i + 1] = Math.round(origRaw[i + 1] * w + genRaw[i + 1] * g);
        out[i + 2] = Math.round(origRaw[i + 2] * w + genRaw[i + 2] * g);
        out[i + 3] = 255;
      }
    }
  }

  return sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
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
  "realisticChanges": "string — a single detailed sentence describing what specific visible physical changes are realistically achievable in 3 months of perfect training and nutrition for this person's starting point. Be specific about body fat reduction ranges and which muscles would visibly grow.",
  "facialHair": "string — describe exactly what facial hair is visible: 'clean-shaven', 'light stubble', 'short beard', 'full beard', 'mustache only', etc. If the face is not visible, say 'not visible'.",
  "faceEndPercent": "number — estimate what percentage from the TOP of the image the person's chin/jawline ends at. For example, if the chin is roughly 1/4 down the image, return 25. If only the body is visible (no face), return 0. Must be 0-100."
}

RULES:
- Base everything on what you can actually see in the photo.
- Be realistic and encouraging. Do not exaggerate or understate.
- The realisticChanges field must describe concrete physical changes (e.g. 'reduce body fat from ~20% to ~16%, add visible size to chest and shoulders, tighten midsection'), not abstract goals.
- The facialHair field MUST accurately describe the person's current facial hair state. This is critical for identity preservation.
- The faceEndPercent field MUST be a number (not a string). Estimate where the chin ends as a percentage from the top of the image. This is used to preserve the face during image transformation.
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
  userId: string;
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
        daysPerWeek: input.userProfile.daysPerWeek,
        equipment: input.userProfile.equipment,
        weight: input.userProfile.weight,
      },
      visionAnalysis,
    }),
  ]);

  // Step 3: Composite the original face back onto the generated body.
  // Parse faceEndPercent defensively — GPT can return a string or number.
  const faceEnd = Number(visionAnalysis.faceEndPercent) || 0;
  let finalImageUrl = imageResult.imageUrl;

  if (faceEnd > 0 && !imageResult.metadata.isMock) {
    try {
      const compositeBuf = await compositePreserveFace(
        photoUrl,
        imageResult.imageUrl,
        faceEnd,
      );

      const { storageKey } = await uploadBuffer(
        input.userId,
        "physique_output",
        compositeBuf,
        "image/png",
      );

      finalImageUrl = await createDownloadUrl(storageKey);
    } catch (compErr) {
      console.error("Face composite failed, returning raw FLUX image:", compErr);
    }
  }

  const fullResult: PhysiqueAIOutput = PhysiqueAIOutputSchema.parse({
    ...analysisResult,
    scenario: input.scenario,
    imageResult: {
      type: imageResult.metadata.isMock ? "mock_preview" : "generated",
      url: finalImageUrl,
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
