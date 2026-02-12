import { describe, it, expect } from "vitest";
import { verifyAge, validateContentType, validateFileSize } from "../src/services/moderation";

describe("Moderation Service", () => {
  describe("verifyAge", () => {
    it("returns true for someone over 18", () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 25);
      const result = verifyAge(dob.toISOString());
      expect(result.isOver18).toBe(true);
      expect(result.age).toBe(25);
    });

    it("returns false for someone under 18", () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 16);
      const result = verifyAge(dob.toISOString());
      expect(result.isOver18).toBe(false);
      expect(result.age).toBe(16);
    });

    it("returns true for exactly 18", () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 18);
      // Ensure birthday has passed this year
      dob.setMonth(0);
      dob.setDate(1);
      const result = verifyAge(dob.toISOString());
      expect(result.isOver18).toBe(true);
    });
  });

  describe("validateContentType", () => {
    it("accepts jpeg", () => {
      expect(validateContentType("image/jpeg")).toBe(true);
    });

    it("accepts png", () => {
      expect(validateContentType("image/png")).toBe(true);
    });

    it("accepts webp", () => {
      expect(validateContentType("image/webp")).toBe(true);
    });

    it("rejects gif", () => {
      expect(validateContentType("image/gif")).toBe(false);
    });

    it("rejects non-image types", () => {
      expect(validateContentType("application/pdf")).toBe(false);
    });
  });

  describe("validateFileSize", () => {
    it("accepts files under 10MB", () => {
      expect(validateFileSize(5 * 1024 * 1024)).toBe(true);
    });

    it("rejects files over 10MB", () => {
      expect(validateFileSize(11 * 1024 * 1024)).toBe(false);
    });

    it("accepts exactly 10MB", () => {
      expect(validateFileSize(10 * 1024 * 1024)).toBe(true);
    });
  });
});
