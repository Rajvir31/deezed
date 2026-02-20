import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SIGNED_URL_EXPIRY_SECONDS } from "@deezed/shared";
import { randomUUID } from "crypto";

let s3Client: S3Client;

export function initStorage() {
  const endpoint = process.env.S3_ENDPOINT!;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== undefined
    ? process.env.S3_FORCE_PATH_STYLE === "true"
    : endpoint.includes("localhost") || endpoint.includes("127.0.0.1") || endpoint.includes("r2.cloudflarestorage.com");

  s3Client = new S3Client({
    endpoint,
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
    forcePathStyle,
  });
}

export function getS3Client() {
  if (!s3Client) initStorage();
  return s3Client;
}

const BUCKET = () => process.env.S3_BUCKET || "deezed-photos";

/**
 * Generate a presigned upload URL for a user to upload a photo directly to S3.
 */
export async function createUploadUrl(
  userId: string,
  photoType: string,
  contentType: string,
): Promise<{ uploadUrl: string; storageKey: string; expiresIn: number }> {
  const key = `${userId}/${photoType}/${randomUUID()}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    ContentType: contentType,
    Metadata: {
      userId,
      photoType,
    },
    ServerSideEncryption: "AES256",
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
  });

  return {
    uploadUrl,
    storageKey: key,
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
  };
}

/**
 * Generate a presigned download URL for viewing a photo.
 */
export async function createDownloadUrl(storageKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET(),
    Key: storageKey,
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
  });
}

/**
 * Delete a single photo from S3.
 */
export async function deleteObject(storageKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET(),
    Key: storageKey,
  });

  await getS3Client().send(command);
}

/**
 * Delete multiple photos from S3 (batch).
 */
export async function deleteObjects(storageKeys: string[]): Promise<void> {
  if (storageKeys.length === 0) return;

  const command = new DeleteObjectsCommand({
    Bucket: BUCKET(),
    Delete: {
      Objects: storageKeys.map((key) => ({ Key: key })),
    },
  });

  await getS3Client().send(command);
}
