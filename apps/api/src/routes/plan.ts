import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/auth.js";
import { GeneratePlanRequestSchema } from "@deezed/shared";
import { generateWorkoutPlan } from "../services/plan-generator.js";

export async function planRoutes(fastify: FastifyInstance) {
  // POST /plan/generate — generate a new workout plan via AI
  fastify.post("/plan/generate", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    // Get user profile for context
    const profile = await prisma.userProfile.findUnique({
      where: { id: request.userId },
    });

    if (!profile) {
      return reply.status(404).send({ error: "Profile not found" });
    }

    // Can also accept overrides from request body
    const bodyInput = GeneratePlanRequestSchema.safeParse(request.body);
    const input = bodyInput.success
      ? bodyInput.data
      : {
          experienceLevel: profile.experienceLevel,
          goal: profile.goal,
          daysPerWeek: profile.daysPerWeek,
          equipment: profile.equipment,
          injuries: profile.injuries,
        };

    // Deactivate existing plans
    await prisma.workoutPlan.updateMany({
      where: { userId: request.userId, isActive: true },
      data: { isActive: false },
    });

    // Generate plan via AI
    const aiPlan = await generateWorkoutPlan(input);

    // Persist the plan
    const plan = await prisma.workoutPlan.create({
      data: {
        userId: request.userId,
        splitType: aiPlan.splitType,
        goal: input.goal,
        weeks: aiPlan.weeks as unknown as Record<string, unknown>[],
        isActive: true,
      },
    });

    // Persist AI result for audit trail
    await prisma.aIResult.create({
      data: {
        userId: request.userId,
        type: "plan",
        inputRefs: input as unknown as Record<string, unknown>,
        outputJson: aiPlan as unknown as Record<string, unknown>,
      },
    });

    return {
      plan: {
        id: plan.id,
        splitType: plan.splitType,
        goal: plan.goal,
        weeks: plan.weeks,
        isActive: plan.isActive,
        createdAt: plan.createdAt.toISOString(),
      },
      explanation: aiPlan.explanation,
    };
  });

  // GET /plan/current — get the active workout plan
  fastify.get("/plan/current", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    const plan = await prisma.workoutPlan.findFirst({
      where: { userId: request.userId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!plan) {
      return reply.status(404).send({ error: "No active plan. Generate one first." });
    }

    return {
      id: plan.id,
      splitType: plan.splitType,
      goal: plan.goal,
      weeks: plan.weeks,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString(),
    };
  });
}
