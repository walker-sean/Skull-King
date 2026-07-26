import type { Card, PirateName } from "./card.js";
import type { RascalRoundScore, RoundScore } from "./events.js";

export type RoomStatus = "Lobby" | "Active" | "Paused" | "Completed";

export type ScoringMode = "Traditional" | "Rascal";

export const MIN_PLAYERS_TO_START = 3;
export const MAX_PLAYERS_TO_START = 8;

export interface Player {
  name: string;
  isHost: boolean;
  connected: boolean;
  /** This Player's dealt cards for the current Round; empty before dealing happens. */
  hand: Card[];
  /** This Player's private Bid for the current Round; null until they've submitted one. */
  bid: number | null;
  /** Tricks this Player has taken so far in the current Round; reset to 0 at the start of each Round. */
  tricksWon: number;
  /** This Player's running score total across every Round scored so far this Game. */
  score: number;
}

/** One Player's card played into the current Trick, in the order it was played. */
export interface TrickPlay {
  playerName: string;
  card: Card;
}

/**
 * A bonus-sharing pairing formed by a Loot card between whoever played it and whoever
 * won that Trick (see CONTEXT.md's Alliance entry).
 */
export interface Alliance {
  round: number;
  lootPlayerName: string;
  winnerName: string;
}

/**
 * An Advanced Pirate Ability (see CONTEXT.md) unlocked by winning the current Trick with
 * that named Pirate, awaiting invocation by the Player who won it.
 */
export interface PendingPirateAbility {
  playerName: string;
  pirateName: PirateName;
}

/**
 * The undealt Deck peeked at via Juanita Jade's Advanced Pirate Ability (see CONTEXT.md's
 * Advanced Pirate Ability entry), awaiting delivery to the Player who invoked it. Only that
 * Player may see `cards` (see redactRoomStateFor) — cleared by the next command that
 * mutates state, mirroring PendingPirateAbility's lifecycle.
 */
export interface PendingReveal {
  playerName: string;
  cards: Card[];
}

/**
 * A bet placed via Rascal of Roatan's Advanced Pirate Ability: 10 or 20 points riding on
 * hitting that Round's Bid, resolved when the Round is scored.
 */
export interface PirateBet {
  round: number;
  playerName: string;
  amount: 10 | 20;
}

/**
 * Bonus points a Player earned by capturing specific cards in a Trick this Round (see
 * CONTEXT.md's Bonus entry) — the Bonus Points table's numbered-14 and Mermaid–Pirate–Skull
 * King capture-chain awards. Recorded per Trick so a multi-Trick Round can accumulate more
 * than one.
 */
export interface CardBonus {
  round: number;
  playerName: string;
  points: number;
}

export interface RoomState {
  roomCode: string;
  status: RoomStatus;
  players: Player[];
  /** Locked in by the Host when starting the Game; null while the Room is still in Lobby. */
  scoringMode: ScoringMode | null;
  /** The Round number in progress (1-10); null while the Room is still in Lobby. */
  currentRound: number | null;
  /** Cards played into the Trick in progress, in play order; null while the Room is still in Lobby. */
  currentTrick: TrickPlay[] | null;
  /** Who leads the current (or next) Trick; null while the Room is still in Lobby. */
  trickLeader: string | null;
  /** Every Alliance formed so far this Game, in the order they were formed. */
  alliances: Alliance[];
  /** This Round's undealt cards, left over after dealing every Player's hand. */
  remainingDeck: Card[];
  /** The Advanced Pirate Ability awaiting invocation, if any Trick has unlocked one. */
  pendingPirateAbility: PendingPirateAbility | null;
  /** Every bet placed via Rascal of Roatan's ability so far this Game. */
  pirateBets: PirateBet[];
  /** Every capture Bonus earned so far this Game, one entry per bonus-earning Trick. */
  cardBonuses: CardBonus[];
  /** Every scored Round's full points breakdown so far this Game, in Round order. */
  roundScores: (RoundScore | RascalRoundScore)[];
  /** The undealt Deck peeked at via Juanita Jade's ability, awaiting delivery; null otherwise. */
  pendingReveal: PendingReveal | null;
}
