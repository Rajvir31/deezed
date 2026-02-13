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
    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    if (!verifiedToken || !verifiedToken.sub) {
      return reply.status(401).send({ error: "Invalid token" });
    }

    request.clerkId = verifiedToken.sub;

    // Look up internal user ID from Clerk ID
    const user = await prisma.userProfile.findUnique({
      where: { clerkId: verifiedToken.sub },
      select: { id: true },
    });

    if (user) {
      request.userId = user.id;
    }
    // userId may be empty for first-time users before profile creation
  } catch (err) {
    request.log.error(err, "Auth failed");
    return reply.status(401).send({ error: "Authentication failed" });
  }
}
