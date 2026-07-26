import type { Card } from "@skull-king/shared";
import { buildDeck, DECK_SIZE, shuffle } from "./deck.js";

/**
 * The largest hand size the Deck can support for a given Player count
 * (see CONTEXT.md's Hand Size Cap glossary entry): floor(74 / player count).
 */
export function handSizeCap(playerCount: number): number {
  return Math.floor(DECK_SIZE / playerCount);
}

/** Round N deals N cards per Player, held at the Hand Size Cap once N exceeds it. */
export function handSizeForRound(round: number, playerCount: number): number {
  return Math.min(round, handSizeCap(playerCount));
}

export interface DealtRound {
  hands: Map<string, Card[]>;
  /** Cards left undealt after every Player's hand is dealt (see Bendt the Bandit and Juanita Jade's Advanced Pirate Abilities). */
  remainingDeck: Card[];
}

/**
 * Deals a fresh shuffle of the full Deck for the given Round, giving each named
 * Player a hand sized per `handSizeForRound`. Every Round reshuffles from scratch
 * rather than continuing a prior Round's deal.
 */
export function dealRound(
  playerNames: readonly string[],
  round: number,
): DealtRound {
  const handSize = handSizeForRound(round, playerNames.length);
  const deck = shuffle(buildDeck());

  const hands = new Map<string, Card[]>();
  playerNames.forEach((name, index) => {
    hands.set(name, deck.slice(index * handSize, (index + 1) * handSize));
  });

  return { hands, remainingDeck: deck.slice(playerNames.length * handSize) };
}
