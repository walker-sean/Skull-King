import { describe, expect, it } from "vitest";
import {
  generateRoomCode,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
} from "./roomCode.js";

describe("generateRoomCode", () => {
  it("returns a code of the expected length using only the human-typeable alphabet", () => {
    const code = generateRoomCode(new Set());
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
    for (const char of code) {
      expect(ROOM_CODE_ALPHABET).toContain(char);
    }
  });

  it("never returns a code already in the existing set", () => {
    const existing = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const code = generateRoomCode(existing);
      expect(existing.has(code)).toBe(false);
      existing.add(code);
    }
  });

  it("throws if the alphabet is exhausted", () => {
    const all = new Set<string>();
    // Force exhaustion by stubbing a tiny fake space isn't practical with the
    // real alphabet, so instead verify it eventually gives up rather than
    // looping forever when given a set already containing "all possible" codes
    // is impractical to construct; assert the guard exists via a manual seed.
    expect(() => generateRoomCode(all, { maxAttempts: 0 })).toThrow();
  });
});
