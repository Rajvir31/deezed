import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/auth.js";
import { CreatePowerliftLogSchema, BIG_THREE_LIFTS } from "@deezed/shared";

export async function powerliftRoutes(fastify: FastifyInstance) {
  // POST /powerlifts/log — log a top set
  fastify.post("/powerlifts/log", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    const data = CreatePowerliftLogSchema.parse(request.body);

    const log = await prisma.powerliftLog.create({
      data: {
        userId: request.userId,
        lift: data.lift,
        weight: data.weight,
        reps: data.reps,
        date: data.date ? new Date(data.date) : new Date(),
        notes: data.notes,
      },
    });

    return log;
  });

  // GET /powerlifts/history?lift=bench&limit=20 — history for one lift
  fastify.get("/powerlifts/history", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    const { lift, limit } = request.query as { lift?: string; limit?: string };

    if (!lift || !BIG_THREE_LIFTS.includes(lift as any)) {
      return reply.status(400).send({ error: "lift must be bench, squat, or deadlift" });
    }

    const logs = await prisma.powerliftLog.findMany({
      where: { userId: request.userId, lift },
      orderBy: { date: "desc" },
      take: Math.min(Number(limit) || 50, 100),
    });

    return logs;
  });

  // GET /powerlifts/summary — latest set + PR for each lift
  fastify.get("/powerlifts/summary", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    const summary: Record<string, {
      latest: { weight: number; reps: number; date: string } | null;
      pr: { weight: number; reps: number; date: string } | null;
      totalSessions: number;
    }> = {};

    for (const lift of BIG_THREE_LIFTS) {
      const [latest, totalSessions] = await Promise.all([
        prisma.powerliftLog.findFirst({
          where: { userId: request.userId, lift },
          orderBy: { date: "desc" },
        }),
        prisma.powerliftLog.count({
          where: { userId: request.userId, lift },
        }),
      ]);

      const pr = await prisma.powerliftLog.findFirst({
        where: { userId: request.userId, lift },
        orderBy: { weight: "desc" },
      });

      summary[lift] = {
        latest: latest
          ? { weight: latest.weight, reps: latest.reps, date: latest.date.toISOString() }
          : null,
        pr: pr
          ? { weight: pr.weight, reps: pr.reps, date: pr.date.toISOString() }
          : null,
        totalSessions,
      };
    }

    return summary;
  });
}
