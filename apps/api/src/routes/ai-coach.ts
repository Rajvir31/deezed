import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/auth.js";
import { CoachRequestSchema } from "@deezed/shared";
import { coachChat } from "../services/coach.js";

export async function aiCoachRoutes(fastify: FastifyInstance) {
  // POST /ai/coach — chat with AI coach
  fastify.post("/ai/coach", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    const data = CoachRequestSchema.parse(request.body);

    // Get user profile for context
    const profile = await prisma.userProfile.findUnique({
      where: { id: request.userId },
    });

    if (!profile) {
      return reply.status(404).send({ error: "Profile not found" });
    }

    // Get current plan summary (if any)
    const currentPlan = await prisma.workoutPlan.findFirst({
      where: { userId: request.userId, isActive: true },
      select: { splitType: true, goal: true },
    });

    const response = await coachChat(data.message, data.conversationHistory, {
      experienceLevel: profile.experienceLevel,
      goal: profile.goal,
      currentPlanSummary: currentPlan
        ? `${currentPlan.splitType} split for ${currentPlan.goal}`
        : undefined,
    });

    // Persist AI result
    await prisma.aIResult.create({
      data: {
        userId: request.userId,
        type: "coach",
        inputRefs: {
          message: data.message,
          historyLength: data.conversationHistory.length,
        },
        outputJson: response as unknown as Record<string, unknown>,
      },
    });

    return response;
  });
}
