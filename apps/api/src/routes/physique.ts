import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/auth.js";
import { PhysiqueUploadRequestSchema, PhysiqueAnalyzeRequestSchema } from "@deezed/shared";
import { createUploadUrl } from "../services/storage.js";
import { analyzeAndSimulate } from "../services/physique-simulator.js";
import { checkImageContent } from "../services/moderation.js";

export async function physiqueRoutes(fastify: FastifyInstance) {
  // POST /physique/upload-url — get a signed URL for photo upload
  fastify.post("/physique/upload-url", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    // Check age verification
    const profile = await prisma.userProfile.findUnique({
      where: { id: request.userId },
      select: { isAgeVerified: true },
    });

    if (!profile?.isAgeVerified) {
      return reply.status(403).send({
        error: "Age verification required",
        message: "Please verify your age (18+) before using the physique feature.",
      });
    }

    const data = PhysiqueUploadRequestSchema.parse(request.body);

    const result = await createUploadUrl(
      request.userId,
      "physique_input",
      data.contentType,
    );

    // Create photo asset record
    await prisma.photoAsset.create({
      data: {
        userId: request.userId,
        type: "physique_input",
        storageKey: result.storageKey,
      },
    });

    return result;
  });

  // POST /physique/analyze-and-simulate — run physique analysis
  fastify.post("/physique/analyze-and-simulate", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    const data = PhysiqueAnalyzeRequestSchema.parse(request.body);

    // Verify the photo belongs to the user
    const photo = await prisma.photoAsset.findFirst({
      where: {
        storageKey: data.photoStorageKey,
        userId: request.userId,
        type: "physique_input",
      },
    });

    if (!photo) {
      return reply.status(404).send({ error: "Photo not found" });
    }

    // Run content moderation check
    const moderationResult = await checkImageContent(data.photoStorageKey);
    if (!moderationResult.approved) {
      return reply.status(400).send({
        error: "Image did not pass content moderation",
        reasons: moderationResult.reasons,
      });
    }

    // Get user profile for context
    const profile = await prisma.userProfile.findUnique({
      where: { id: request.userId },
    });

    if (!profile) {
      return reply.status(404).send({ error: "Profile not found" });
    }

    // Get latest weight if available
    const latestMetric = await prisma.bodyMetric.findFirst({
      where: { userId: request.userId },
      orderBy: { date: "desc" },
      select: { weight: true },
    });

    // Run analysis
    const result = await analyzeAndSimulate({
      photoStorageKey: data.photoStorageKey,
      scenario: data.scenario,
      focusMuscle: data.focusMuscle,
      userProfile: {
        experienceLevel: profile.experienceLevel,
        goal: profile.goal,
        daysPerWeek: profile.daysPerWeek,
        equipment: profile.equipment,
        injuries: profile.injuries,
        weight: latestMetric?.weight ?? undefined,
      },
    });

    // Persist AI result
    await prisma.aIResult.create({
      data: {
        userId: request.userId,
        type: "physique",
        inputRefs: {
          photoStorageKey: data.photoStorageKey,
          scenario: data.scenario,
          focusMuscle: data.focusMuscle,
        },
        outputJson: result as unknown as Record<string, unknown>,
      },
    });

    return result;
  });
}
