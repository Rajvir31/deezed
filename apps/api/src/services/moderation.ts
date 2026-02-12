/**
 * Content Moderation Service
 *
 * MVP: Basic checks using file metadata and a placeholder for
 * real image classification. In production, integrate with:
 * - AWS Rekognition (DetectModerationLabels)
 * - Google Cloud Vision SafeSearch
 * - Azure Content Moderator
 * - OpenAI Vision moderation
 *
 * UPGRADE PATH:
 * 1. Replace checkImageContent() with a call to your chosen moderation API
 * 2. Keep the same ModerationResult interface
 * 3. Update thresholds and categories as needed
 */

export interface ModerationResult {
  approved: boolean;
  reasons: string[];
  confidence: number;
}

// ── Basic Content Type Check ─────────────────────────────
export function validateContentType(contentType: string): boolean {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  return allowed.includes(contentType);
}

// ── File Size Check ──────────────────────────────────────
const MAX_FILE_SIZE_MB = 10;
export function validateFileSize(sizeBytes: number): boolean {
  return sizeBytes <= MAX_FILE_SIZE_MB * 1024 * 1024;
}

/**
 * MVP Image Moderation
 *
 * Currently just validates metadata. In production, this would:
 * 1. Download the image from the storage URL
 * 2. Run it through a moderation API
 * 3. Check for: minors, explicit content, non-person images
 * 4. Return structured results
 */
export async function checkImageContent(
  _imageUrl: string,
): Promise<ModerationResult> {
  // MVP: Pass all images that pass metadata checks
  // In production, call a real moderation API here

  // Example of what production implementation would look like:
  // const response = await openai.chat.completions.create({
  //   model: "gpt-4o",
  //   messages: [
  //     {
  //       role: "system",
  //       content: "You are a content moderator. Analyze this image and determine if it's appropriate for a fitness app physique upload. It should be a shirtless male torso photo. Flag if: appears to be a minor, explicit nudity beyond typical shirtless male, not a person photo, appears non-consensual."
  //     },
  //     {
  //       role: "user",
  //       content: [{ type: "image_url", image_url: { url: imageUrl } }]
  //     }
  //   ],
  //   response_format: { type: "json_object" },
  // });

  return {
    approved: true,
    reasons: [],
    confidence: 0.5, // Low confidence indicates this is a basic check
  };
}

// ── Age Verification Check ───────────────────────────────
export function verifyAge(dateOfBirth: string): { isOver18: boolean; age: number } {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }

  return { isOver18: age >= 18, age };
}
