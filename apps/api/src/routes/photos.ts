import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../plugins/auth.js";
import { createUploadUrl, createDownloadUrl, deleteObject, deleteObjects } from "../services/storage.js";

export async function photoRoutes(fastify: FastifyInstance) {
  // GET /photos — list user's photos with signed download URLs
  fastify.get("/photos", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    const query = request.query as { type?: string };

    const where: Record<string, unknown> = { userId: request.userId };
    if (query.type) {
      where.type = query.type;
    }

    const photos = await prisma.photoAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Generate signed URLs for each photo
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        signedUrl: await createDownloadUrl(photo.storageKey),
        createdAt: photo.createdAt.toISOString(),
      })),
    );

    return photosWithUrls;
  });

  // POST /photos/upload-url — get a signed upload URL for progress photos
  fastify.post("/photos/upload-url", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    const { contentType } = request.body as { contentType: string };

    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      return reply.status(400).send({ error: "Invalid content type" });
    }

    const result = await createUploadUrl(request.userId, "progress", contentType);

    // Create photo asset record
    await prisma.photoAsset.create({
      data: {
        userId: request.userId,
        type: "progress",
        storageKey: result.storageKey,
      },
    });

    return result;
  });

  // DELETE /photos/:id — delete a single photo
  fastify.delete("/photos/:id", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const photo = await prisma.photoAsset.findFirst({
      where: { id, userId: request.userId },
    });

    if (!photo) {
      return reply.status(404).send({ error: "Photo not found" });
    }

    // Delete from S3
    await deleteObject(photo.storageKey);

    // Delete from database
    await prisma.photoAsset.delete({
      where: { id },
    });

    return { deleted: true };
  });

  // DELETE /photos — delete all user photos
  fastify.delete("/photos", {
    preHandler: [authenticate],
  }, async (request, reply) => {
    if (!request.userId) {
      return reply.status(400).send({ error: "Complete onboarding first" });
    }

    const photos = await prisma.photoAsset.findMany({
      where: { userId: request.userId },
      select: { storageKey: true },
    });

    if (photos.length === 0) {
      return { deleted: 0 };
    }

    // Delete from S3
    await deleteObjects(photos.map((p) => p.storageKey));

    // Delete from database
    await prisma.photoAsset.deleteMany({
      where: { userId: request.userId },
    });

    return { deleted: photos.length };
  });
}
