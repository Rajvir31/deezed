import { FastifyRequest, FastifyReply } from "fastify";
import { clerkPlugin, getAuth } from "@clerk/fastify";
import { createClerkClient } from "@clerk/backend";
import { prisma } from "../lib/prisma.js";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    clerkId: string;
  }
}

export const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
});

export async function registerClerkAuth(fastify: FastifyInstance) {
  await fastify.register(clerkPlugin, {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
    secretKey: process.env.CLERK_SECRET_KEY!,
  });
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const auth = getAuth(request);

    if (!auth.userId) {
      return reply.status(401).send({ error: "Authentication required" });
    }

    request.clerkId = auth.userId;

    const user = await prisma.userProfile.findUnique({
      where: { clerkId: auth.userId },
      select: { id: true },
    });

    if (user) {
      request.userId = user.id;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown auth error";
    request.log.error(err, "Auth failed: %s", message);
    return reply.status(401).send({ error: "Authentication failed", detail: message });
  }
}
