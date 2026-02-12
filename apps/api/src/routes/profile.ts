import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/auth.js";
import { CreateProfileSchema, UpdateProfileSchema, AgeVerificationSchema } from "@deezed/shared";
import { verifyAge } from "../services/moderation.js";

export async function profileRoutes(fastify: FastifyInstance) {
  // GET /profile — get current user profile
  fastify.get("/profile", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(404).send({ error: "Profile not found. Complete onboarding first." });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { id: request.userId },
    });

    if (!profile) {
      return reply.status(404).send({ error: "Profile not found" });
    }

    return profile;
  });

  // PUT /profile — create or update profile
  fastify.put("/profile", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    // If user already has a profile, update it
    if (request.userId) {
      const data = UpdateProfileSchema.parse(request.body);
      const profile = await prisma.userProfile.update({
        where: { id: request.userId },
        data: { ...data, onboardingComplete: true },
      });
      return profile;
    }

    // Otherwise, create a new profile
    const data = CreateProfileSchema.parse(request.body);

    // Get email from Clerk
    const { createClerkClient } = await import("@clerk/fastify");
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
    });
    const clerkUser = await clerk.users.getUser(request.clerkId);
    const email = clerkUser.emailAddresses[0]?.emailAddress || "";

    const profile = await prisma.userProfile.create({
      data: {
        clerkId: request.clerkId,
        email,
        ...data,
        onboardingComplete: true,
      },
    });

    // Set the userId on the request for subsequent calls
    request.userId = profile.id;

    return reply.status(201).send(profile);
  });

  // POST /profile/verify-age — age gate for physique feature
  fastify.post("/profile/verify-age", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    const data = AgeVerificationSchema.parse(request.body);
    const { isOver18, age } = verifyAge(data.dateOfBirth);

    if (!isOver18) {
      return reply.status(403).send({
        error: "You must be 18 or older to use the physique feature",
        age,
      });
    }

    await prisma.userProfile.update({
      where: { id: request.userId },
      data: {
        dateOfBirth: new Date(data.dateOfBirth),
        isAgeVerified: true,
      },
    });

    return { verified: true, age };
  });
}
