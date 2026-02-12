import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/auth.js";
import { CreateBodyMetricSchema } from "@deezed/shared";

export async function progressRoutes(fastify: FastifyInstance) {
  // GET /progress/summary — analytics overview
  fastify.get("/progress/summary", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    // Total completed workouts
    const totalWorkouts = await prisma.workoutSession.count({
      where: { userId: request.userId, completed: true },
    });

    // Calculate current streak
    const recentSessions = await prisma.workoutSession.findMany({
      where: { userId: request.userId, completed: true },
      orderBy: { finishedAt: "desc" },
      take: 60,
      select: { finishedAt: true },
    });

    let currentStreak = 0;
    if (recentSessions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let checkDate = new Date(today);

      for (const session of recentSessions) {
        if (!session.finishedAt) continue;
        const sessionDate = new Date(session.finishedAt);
        sessionDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor(
          (checkDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diffDays <= 1) {
          currentStreak++;
          checkDate = sessionDate;
        } else {
          break;
        }
      }
    }

    // Get all sets with exercise info for PRs, volume, and muscle breakdown
    const allSets = await prisma.setLog.findMany({
      where: {
        session: { userId: request.userId, completed: true },
      },
      orderBy: { weight: "desc" },
    });

    // Total volume (sum of weight × reps for all sets)
    const totalVolume = allSets.reduce((sum, s) => sum + s.weight * s.reps, 0);

    // Personal records (highest weight for each exercise)
    const prMap = new Map<string, { weight: number; reps: number; date: string }>();
    for (const set of allSets) {
      const existing = prMap.get(set.exerciseId);
      if (!existing || set.weight > existing.weight) {
        prMap.set(set.exerciseId, {
          weight: set.weight,
          reps: set.reps,
          date: set.timestamp.toISOString(),
        });
      }
    }

    // Get exercise names for PRs
    const exerciseIds = [...prMap.keys()];
    const exercises = await prisma.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true, name: true, muscleGroups: true },
    });

    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

    const personalRecords = [...prMap.entries()]
      .map(([exId, pr]) => ({
        exerciseName: exerciseMap.get(exId)?.name || "Unknown",
        weight: pr.weight,
        reps: pr.reps,
        date: pr.date,
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    // Volume by muscle group
    const volumeByMuscle: Record<string, number> = {};
    for (const set of allSets) {
      const exercise = exerciseMap.get(set.exerciseId);
      if (exercise) {
        for (const muscle of exercise.muscleGroups) {
          volumeByMuscle[muscle] = (volumeByMuscle[muscle] || 0) + set.weight * set.reps;
        }
      }
    }

    // Recent body metrics
    const recentMetrics = await prisma.bodyMetric.findMany({
      where: { userId: request.userId },
      orderBy: { date: "desc" },
      take: 30,
    });

    return {
      totalWorkouts,
      currentStreak,
      totalVolume,
      personalRecords,
      volumeByMuscle,
      recentMetrics: recentMetrics.map((m) => ({
        ...m,
        date: m.date.toISOString(),
        createdAt: m.createdAt.toISOString(),
      })),
    };
  });

  // POST /progress/metric — log a body metric
  fastify.post("/progress/metric", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    const data = CreateBodyMetricSchema.parse(request.body);

    const metric = await prisma.bodyMetric.create({
      data: {
        userId: request.userId,
        ...data,
        date: new Date(data.date),
      },
    });

    return reply.status(201).send({
      ...metric,
      date: metric.date.toISOString(),
      createdAt: metric.createdAt.toISOString(),
    });
  });
}
