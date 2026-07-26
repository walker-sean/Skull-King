import type { Card, RoomState } from "@skull-king/shared";
import { currentTurnPlayerName, legalPlays } from "@skull-king/engine";

export interface HandCardView {
  card: Card;
  legal: boolean;
}

export interface TrickCardView {
  playerName: string;
  card: Card;
  isSelf: boolean;
}

export interface TrickPlayerView {
  name: string;
  isSelf: boolean;
  isCurrentTurn: boolean;
  tricksWon: number;
}

export type TrickOutcome =
  | { type: "Won"; winnerName: string }
  | { type: "Voided" };

export interface TrickPlayViewModel {
  currentRound: number | null;
  hand: HandCardView[];
  isYourTurn: boolean;
  currentTurnPlayerName: string | null;
  currentTrick: TrickCardView[];
  players: TrickPlayerView[];
  outcome: TrickOutcome | null;
}

/** Derives what the Trick-play screen renders from synced Room state plus the local Player's identity. */
export function selectTrickPlayView(
  state: RoomState,
  localPlayerName: string,
  outcome: TrickOutcome | null,
): TrickPlayViewModel {
  const localPlayer = state.players.find(
    (player) => player.name === localPlayerName,
  );
  const hand = localPlayer?.hand ?? [];
  const currentTrick = state.currentTrick ?? [];
  const legal = legalPlays(hand, currentTrick);
  const turnPlayerName = currentTurnPlayerName(state);

  return {
    currentRound: state.currentRound,
    hand: hand.map((card) => ({ card, legal: legal.includes(card) })),
    isYourTurn: turnPlayerName === localPlayerName,
    currentTurnPlayerName: turnPlayerName,
    currentTrick: currentTrick.map((play) => ({
      playerName: play.playerName,
      card: play.card,
      isSelf: play.playerName === localPlayerName,
    })),
    players: state.players.map((player) => ({
      name: player.name,
      isSelf: player.name === localPlayerName,
      isCurrentTurn: player.name === turnPlayerName,
      tricksWon: player.tricksWon,
    })),
    outcome,
  };
}

/**
 * Narrates how the Trick most recently in progress resolved, derived by comparing the Room
 * state just before and just after: the Trick just completed when it was non-empty and the
 * next state's Trick has emptied out. The winner is whichever Player's tricksWon increased;
 * if no one's did, a Kraken or White Whale voided the Trick instead (see CONTEXT.md's Kraken
 * and White Whale entries). Returns null when no Trick just completed (mid-Trick, or not yet
 * in Trick-play at all).
 *
 * Skipped whenever that same Trick also ended the Round (roundScores grew): advanceRound
 * resets every Player's tricksWon to 0 for the next Round in the same transition, wiping out
 * the very signal this derivation relies on — narrating from it would risk misreporting a
 * genuine win as a void. This is safe to skip: routing already leaves the Trick-play screen
 * once the next Round's Bidding phase resets, so no outcome would be shown here anyway.
 */
export function deriveTrickOutcome(
  previous: RoomState | null,
  next: RoomState,
): TrickOutcome | null {
  if (
    previous === null ||
    previous.currentTrick === null ||
    next.currentTrick === null
  ) {
    return null;
  }

  const trickJustCompleted =
    previous.currentTrick.length > 0 && next.currentTrick.length === 0;
  if (!trickJustCompleted) {
    return null;
  }

  if (next.roundScores.length !== previous.roundScores.length) {
    return null;
  }

  const winner = next.players.find((player) => {
    const before = previous.players.find(
      (candidate) => candidate.name === player.name,
    );
    return before !== undefined && player.tricksWon > before.tricksWon;
  });

  return winner !== undefined
    ? { type: "Won", winnerName: winner.name }
    : { type: "Voided" };
}
