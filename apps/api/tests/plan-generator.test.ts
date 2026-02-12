import { describe, it, expect } from "vitest";
import { SPLIT_RECOMMENDATIONS } from "@deezed/shared";

describe("Plan Generator Logic", () => {
  describe("Split Recommendations", () => {
    it("recommends full body for 2 days", () => {
      expect(SPLIT_RECOMMENDATIONS[2]).toBe("full_body");
    });

    it("recommends full body for 3 days", () => {
      expect(SPLIT_RECOMMENDATIONS[3]).toBe("full_body");
    });

    it("recommends upper/lower for 4 days", () => {
      expect(SPLIT_RECOMMENDATIONS[4]).toBe("upper_lower");
    });

    it("recommends PPL for 5 days", () => {
      expect(SPLIT_RECOMMENDATIONS[5]).toBe("push_pull_legs");
    });

    it("recommends PPL for 6 days", () => {
      expect(SPLIT_RECOMMENDATIONS[6]).toBe("push_pull_legs");
    });
  });
});
