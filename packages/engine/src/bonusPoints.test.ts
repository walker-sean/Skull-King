import { describe, expect, it } from "vitest";
import type { Card, TrickPlay } from "@skull-king/shared";
import { captureBonusPoints } from "./bonusPoints.js";

function play(playerName: string, card: Card): TrickPlay {
  return { playerName, card };
}

describe("captureBonusPoints", () => {
  it("awards +10 for capturing a standard-suit numbered-14 card", () => {
    const trick = [
      play("Alice", { kind: "Suited", suit: "Parrot", rank: 14 }),
      play("Bob", { kind: "Suited", suit: "Parrot", rank: 3 }),
    ];

    expect(captureBonusPoints(trick, "Alice")).toBe(10);
  });

  it("awards +20 for capturing the trump-suit numbered-14 card", () => {
    const trick = [
      play("Alice", { kind: "Suited", suit: "JollyRoger", rank: 14 }),
      play("Bob", { kind: "Suited", suit: "Parrot", rank: 3 }),
    ];

    expect(captureBonusPoints(trick, "Alice")).toBe(20);
  });

  it("sums multiple numbered-14 cards captured in the same Trick", () => {
    const trick = [
      play("Alice", { kind: "Suited", suit: "JollyRoger", rank: 14 }),
      play("Bob", { kind: "Suited", suit: "Parrot", rank: 14 }),
      play("Carol", { kind: "Suited", suit: "TreasureChest", rank: 14 }),
    ];

    // +20 (trump 14) + 10 (Parrot 14) + 10 (TreasureChest 14)
    expect(captureBonusPoints(trick, "Alice")).toBe(40);
  });

  it("awards no bonus for a numbered-14 card that isn't captured by anyone (no such case, but non-14 ranks score nothing)", () => {
    const trick = [
      play("Alice", { kind: "Suited", suit: "Parrot", rank: 13 }),
      play("Bob", { kind: "Suited", suit: "Parrot", rank: 5 }),
    ];

    expect(captureBonusPoints(trick, "Alice")).toBe(0);
  });

  it("awards +20 each for capturing a Mermaid with a Pirate", () => {
    const trick = [
      play("Alice", { kind: "Pirate", name: "HarryTheGiant" }),
      play("Bob", { kind: "Mermaid" }),
      play("Carol", { kind: "Mermaid" }),
    ];

    expect(captureBonusPoints(trick, "Alice")).toBe(40);
  });

  it("awards +30 each for capturing a Pirate with the Skull King", () => {
    const trick = [
      play("Alice", { kind: "SkullKing" }),
      play("Bob", { kind: "Pirate", name: "HarryTheGiant" }),
    ];

    expect(captureBonusPoints(trick, "Alice")).toBe(30);
  });

  it("awards +40 for capturing the Skull King with a Mermaid", () => {
    const trick = [
      play("Alice", { kind: "Mermaid" }),
      play("Bob", { kind: "SkullKing" }),
    ];

    expect(captureBonusPoints(trick, "Alice")).toBe(40);
  });

  it("treats a Tigress declared as a Pirate the same as a Pirate for the capture chain", () => {
    const trick = [
      play("Alice", { kind: "SkullKing" }),
      play("Bob", { kind: "Tigress", declaredAs: "Pirate" }),
    ];

    expect(captureBonusPoints(trick, "Alice")).toBe(30);
  });

  it("matches the rulebook's worked example: Mermaid wins over a Pirate and the Skull King, earning only the Skull King bonus plus a numbered-14", () => {
    const trick = [
      play("Lawrence", { kind: "Suited", suit: "TreasureChest", rank: 14 }),
      play("Charlotte", { kind: "Pirate", name: "HarryTheGiant" }),
      play("Anne", { kind: "SkullKing" }),
      play("Morgan", { kind: "Mermaid" }),
    ];

    // +10 (yellow 14) + 40 (Skull King via Mermaid); no Pirate-capture bonus since the
    // Pirate didn't win.
    expect(captureBonusPoints(trick, "Morgan")).toBe(50);
  });

  it("awards nothing when no Bonus-earning card was captured", () => {
    const trick = [
      play("Alice", { kind: "Suited", suit: "Parrot", rank: 5 }),
      play("Bob", { kind: "Escape" }),
    ];

    expect(captureBonusPoints(trick, "Alice")).toBe(0);
  });
});
