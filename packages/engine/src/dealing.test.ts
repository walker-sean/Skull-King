import { describe, expect, it } from "vitest";
import type { Card } from "@skull-king/shared";
import { dealRound, handSizeCap, handSizeForRound } from "./dealing.js";

function namesFor(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Player${i + 1}`);
}

describe("handSizeCap", () => {
  it("is floor(74 / player count)", () => {
    expect(handSizeCap(3)).toBe(24);
    expect(handSizeCap(4)).toBe(18);
    expect(handSizeCap(5)).toBe(14);
    expect(handSizeCap(6)).toBe(12);
    expect(handSizeCap(7)).toBe(10);
    expect(handSizeCap(8)).toBe(9);
  });
});

describe("handSizeForRound", () => {
  it("deals Round N's full number for 3-7 Players across all 10 Rounds", () => {
    for (let playerCount = 3; playerCount <= 7; playerCount++) {
      for (let round = 1; round <= 10; round++) {
        expect(handSizeForRound(round, playerCount)).toBe(round);
      }
    }
  });

  it("caps 8-Player Games at 9 once Round 10 would otherwise deal more", () => {
    for (let round = 1; round <= 9; round++) {
      expect(handSizeForRound(round, 8)).toBe(round);
    }
    expect(handSizeForRound(10, 8)).toBe(9);
  });
});

describe("dealRound", () => {
  it("deals Round N cards to each Player when within the Deck's capacity", () => {
    for (const playerCount of [3, 4, 5, 6, 7, 8]) {
      for (const round of [1, 3, 7]) {
        const { hands } = dealRound(namesFor(playerCount), round);
        for (const name of namesFor(playerCount)) {
          expect(hands.get(name)).toHaveLength(
            handSizeForRound(round, playerCount),
          );
        }
      }
    }
  });

  it("deals the capped hand size for Round 10 of an 8-Player Game", () => {
    const { hands } = dealRound(namesFor(8), 10);
    for (const name of namesFor(8)) {
      expect(hands.get(name)).toHaveLength(9);
    }
  });

  it("deals from a single shared shuffle, never exceeding a card kind's count in the Deck", () => {
    const names = namesFor(6);
    const { hands, remainingDeck } = dealRound(names, 5);
    const allCards = names.flatMap((name) => hands.get(name) ?? []);
    expect(allCards).toHaveLength(30);
    expect(remainingDeck).toHaveLength(74 - 30);

    const countOf = (cards: Card[], kind: string) =>
      cards.filter((card) => card.kind === kind).length;
    expect(countOf(allCards, "Pirate")).toBeLessThanOrEqual(5);
    expect(countOf(allCards, "Mermaid")).toBeLessThanOrEqual(2);
    expect(countOf(allCards, "Escape")).toBeLessThanOrEqual(5);
    expect(countOf(allCards, "Loot")).toBeLessThanOrEqual(2);
    expect(countOf(allCards, "Kraken")).toBeLessThanOrEqual(1);
    expect(countOf(allCards, "WhiteWhale")).toBeLessThanOrEqual(1);
    expect(countOf(allCards, "Tigress")).toBeLessThanOrEqual(1);
    expect(countOf(allCards, "SkullKing")).toBeLessThanOrEqual(1);
  });

  it("leaves every card not dealt to a Player in the remaining Deck", () => {
    const names = namesFor(6);
    const { hands, remainingDeck } = dealRound(names, 5);
    const dealtCount = names.reduce(
      (sum, name) => sum + (hands.get(name)?.length ?? 0),
      0,
    );
    expect(dealtCount + remainingDeck.length).toBe(74);
  });
});
