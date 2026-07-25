import { describe, expect, it } from "vitest";
import { normalizeName } from "./normalizeName.js";

describe("normalizeName", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeName("  Alice  ")).toBe("Alice");
  });

  it("returns null for a blank or whitespace-only name", () => {
    expect(normalizeName("   ")).toBeNull();
    expect(normalizeName("")).toBeNull();
  });
});
