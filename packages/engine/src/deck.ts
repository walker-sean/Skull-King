import type { Card, Suit } from "@skull-king/shared";

const SUITS: Suit[] = ["Parrot", "TreasureChest", "PirateMap", "JollyRoger"];

/** The 74 cards in play for this project's ruleset (see CONTEXT.md's Deck glossary entry). */
export const DECK_SIZE = 74;

export function buildDeck(): Card[] {
  const cards: Card[] = [];

  for (const suit of SUITS) {
    for (let rank = 1; rank <= 14; rank++) {
      cards.push({ kind: "Suited", suit, rank });
    }
  }

  for (let i = 0; i < 5; i++) cards.push({ kind: "Pirate" });
  cards.push({ kind: "Tigress" });
  cards.push({ kind: "SkullKing" });
  for (let i = 0; i < 2; i++) cards.push({ kind: "Mermaid" });
  for (let i = 0; i < 5; i++) cards.push({ kind: "Escape" });
  for (let i = 0; i < 2; i++) cards.push({ kind: "Loot" });
  cards.push({ kind: "Kraken" });
  cards.push({ kind: "WhiteWhale" });

  return cards;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j] as T, shuffled[i] as T];
  }
  return shuffled;
}
