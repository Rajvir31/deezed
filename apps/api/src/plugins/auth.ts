import { FastifyRequest, FastifyReply } from "fastify";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { prisma } from "../lib/prisma.js";

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

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing authorization header" });
    }

    const token = authHeader.slice(7);
    const result = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      authorizedParties: [],
      clockSkewInMs: 30000,
    });

    const sub = (result as any)?.sub ?? (result as any)?.data?.sub;

    if (!sub) {
      const errors = (result as any)?.errors;
      const reason = errors
        ? errors.map((e: any) => e.message || e.reason || e.code).join("; ")
        : "no sub claim in token";
      return reply.status(401).send({ error: "Invalid token", detail: reason });
    }

    request.clerkId = sub;

    const user = await prisma.userProfile.findUnique({
      where: { clerkId: sub },
      select: { id: true },
    });

    if (user) {
      request.userId = user.id;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    request.log.error(err, "Auth failed: %s", message);
    return reply.status(401).send({ error: "Authentication failed", detail: message });
  }
}
