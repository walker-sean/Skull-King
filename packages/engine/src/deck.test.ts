import { describe, expect, it } from "vitest";
import { buildDeck, DECK_SIZE, shuffle } from "./deck.js";

describe("buildDeck", () => {
  it("builds the full 74-card Deck", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(DECK_SIZE);
  });

  it("has the correct composition per group", () => {
    const deck = buildDeck();
    const suited = deck.filter((card) => card.kind === "Suited");
    expect(suited).toHaveLength(56);
    for (const suit of ["Parrot", "TreasureChest", "PirateMap", "JollyRoger"] as const) {
      const suitCards = suited.filter((card) => card.kind === "Suited" && card.suit === suit);
      expect(suitCards.map((card) => (card.kind === "Suited" ? card.rank : null)).sort(
        (a, b) => (a ?? 0) - (b ?? 0),
      )).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    }

    const countOf = (kind: string) => deck.filter((card) => card.kind === kind).length;
    expect(countOf("Pirate")).toBe(5);
    expect(countOf("Tigress")).toBe(1);
    expect(countOf("SkullKing")).toBe(1);
    expect(countOf("Mermaid")).toBe(2);
    expect(countOf("Escape")).toBe(5);
    expect(countOf("Loot")).toBe(2);
    expect(countOf("Kraken")).toBe(1);
    expect(countOf("WhiteWhale")).toBe(1);
  });
});

describe("shuffle", () => {
  it("returns every input item exactly once, in some order", () => {
    const items = Array.from({ length: 74 }, (_, i) => i);
    const shuffled = shuffle(items);
    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
  });

  it("does not mutate the input array", () => {
    const items = [1, 2, 3, 4, 5];
    const copy = [...items];
    shuffle(items);
    expect(items).toEqual(copy);
  });
});
