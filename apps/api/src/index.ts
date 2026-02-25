import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { loadEnv } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { initStorage } from "./services/storage.js";
import { initOpenAI } from "./services/ai.js";
import { profileRoutes } from "./routes/profile.js";
import { planRoutes } from "./routes/plan.js";
import { workoutRoutes } from "./routes/workout.js";
import { progressRoutes } from "./routes/progress.js";
import { aiCoachRoutes } from "./routes/ai-coach.js";
import { physiqueRoutes } from "./routes/physique.js";
import { photoRoutes } from "./routes/photos.js";
import { powerliftRoutes } from "./routes/powerlifts.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    clerkId: string;
  }
}

async function main() {
  const env = loadEnv();

  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // ── CORS ─────────────────────────────────────────────
  await fastify.register(cors, {
    origin: true, // Allow all origins in dev; restrict in production
    credentials: true,
  });

  // ── Rate Limiting ────────────────────────────────────
  await fastify.register(rateLimit, {
    global: false, // Apply per-route
  });

  // ── Request Decorators ───────────────────────────────────
  fastify.decorateRequest("userId", "");
  fastify.decorateRequest("clerkId", "");

  // ── Initialize Services ──────────────────────────────
  initStorage();
  initOpenAI();

  // ── Rate-limited AI routes group ─────────────────────
  const aiRateLimitConfig = {
    max: env.RATE_LIMIT_AI_MAX,
    timeWindow: env.RATE_LIMIT_AI_WINDOW_MS,
  };

  // ── Health Check ─────────────────────────────────────
  fastify.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  // ── Register Routes ──────────────────────────────────
  await fastify.register(profileRoutes);
  await fastify.register(planRoutes);
  await fastify.register(workoutRoutes);
  await fastify.register(progressRoutes);
  await fastify.register(photoRoutes);
  await fastify.register(powerliftRoutes);

  // AI routes with rate limiting (scoped to this sub-instance)
  await fastify.register(async (instance) => {
    await instance.register(rateLimit, {
      max: aiRateLimitConfig.max,
      timeWindow: aiRateLimitConfig.timeWindow,
    });
    await instance.register(aiCoachRoutes);
    await instance.register(physiqueRoutes);
  });

  // ── Global Error Handler ─────────────────────────────
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Zod validation errors
    if (error.name === "ZodError") {
      return reply.status(400).send({
        error: "Validation error",
        details: JSON.parse(error.message),
      });
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: "Too many requests. Please try again later.",
      });
    }

    return reply.status(error.statusCode || 500).send({
      error: error.message || "Internal server error",
    });
  });

  // ── Start Server ─────────────────────────────────────
  try {
    await fastify.listen({ host: env.API_HOST, port: env.API_PORT });
    console.info(`🚀 Deezed API running at http://${env.API_HOST}:${env.API_PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  // ── Graceful Shutdown ────────────────────────────────
  const shutdown = async () => {
    console.info("Shutting down...");
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main();
