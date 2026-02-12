import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/auth.js";
import { StartWorkoutSchema, CreateSetLogSchema } from "@deezed/shared";

export async function workoutRoutes(fastify: FastifyInstance) {
  // POST /workout/start — start a new workout session
  fastify.post("/workout/start", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    const data = StartWorkoutSchema.parse(request.body);

    // Verify the plan belongs to the user
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: data.planId, userId: request.userId },
    });

    if (!plan) {
      return reply.status(404).send({ error: "Plan not found" });
    }

    // Check for existing incomplete session for this day
    const existing = await prisma.workoutSession.findFirst({
      where: {
        userId: request.userId,
        planId: data.planId,
        weekNumber: data.weekNumber,
        dayNumber: data.dayNumber,
        completed: false,
      },
      include: { sets: true },
    });

    if (existing) {
      // Return the existing session so user can continue
      return {
        ...existing,
        startedAt: existing.startedAt.toISOString(),
        finishedAt: existing.finishedAt?.toISOString() || null,
      };
    }

    const session = await prisma.workoutSession.create({
      data: {
        userId: request.userId,
        planId: data.planId,
        weekNumber: data.weekNumber,
        dayNumber: data.dayNumber,
      },
      include: { sets: true },
    });

    return reply.status(201).send({
      ...session,
      startedAt: session.startedAt.toISOString(),
      finishedAt: null,
    });
  });

  // POST /workout/log-set — log a set within an active session
  fastify.post("/workout/log-set", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const body = request.body as { sessionId: string } & Record<string, unknown>;
    const { sessionId, ...setData } = body;

    if (!sessionId) {
      return reply.status(400).send({ error: "sessionId is required" });
    }

    // Verify session belongs to user
    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId: request.userId },
    });

    if (!session) {
      return reply.status(404).send({ error: "Session not found" });
    }

    if (session.completed) {
      return reply.status(400).send({ error: "Session already completed" });
    }

    const data = CreateSetLogSchema.parse(setData);

    const setLog = await prisma.setLog.create({
      data: {
        sessionId,
        exerciseId: data.exerciseId,
        setNumber: data.setNumber,
        reps: data.reps,
        weight: data.weight,
        rpe: data.rpe,
      },
    });

    return reply.status(201).send({
      ...setLog,
      timestamp: setLog.timestamp.toISOString(),
    });
  });

  // POST /workout/finish — mark a session as complete
  fastify.post("/workout/finish", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const { sessionId } = request.body as { sessionId: string };

    if (!sessionId) {
      return reply.status(400).send({ error: "sessionId is required" });
    }

    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId: request.userId },
    });

    if (!session) {
      return reply.status(404).send({ error: "Session not found" });
    }

    const updated = await prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        completed: true,
        finishedAt: new Date(),
      },
      include: { sets: true },
    });

    return {
      ...updated,
      startedAt: updated.startedAt.toISOString(),
      finishedAt: updated.finishedAt?.toISOString() || null,
      sets: updated.sets.map((s) => ({
        ...s,
        timestamp: s.timestamp.toISOString(),
      })),
    };
  });

  // GET /workout/history — get past workout sessions
  fastify.get("/workout/history", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || "20"), 50);
    const offset = parseInt(query.offset || "0");

    const sessions = await prisma.workoutSession.findMany({
      where: { userId: request.userId, completed: true },
      orderBy: { finishedAt: "desc" },
      take: limit,
      skip: offset,
      include: { sets: true },
    });

    return sessions.map((s) => ({
      ...s,
      startedAt: s.startedAt.toISOString(),
      finishedAt: s.finishedAt?.toISOString() || null,
      sets: s.sets.map((set) => ({
        ...set,
        timestamp: set.timestamp.toISOString(),
      })),
    }));
  });
}
