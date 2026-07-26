import type { Player, RoomState } from "@skull-king/shared";
import { dealRound } from "./dealing.js";

/** The Game's fixed number of Rounds (see CONTEXT.md's Round entry). */
export const LAST_ROUND = 10;

export interface RoundAdvanceResult {
  players: Player[];
  currentRound: number;
  status: RoomState["status"];
  trickLeader: string | null;
  remainingDeck: RoomState["remainingDeck"];
}

/**
 * Decides what happens once a Round has just been scored: either the Game is over (Round
 * 10 just finished), moving the Room to Completed with the final scoreboard already on
 * each Player's running total, or the next Round deals fresh — every Player's hand, Bid,
 * and Tricks Won reset so Bidding (#5) can restart cleanly, while each Player's running
 * score total carries forward untouched (see CONTEXT.md's Round entry). Lead rotates to
 * the next Player in seat order each Round, matching the rulebook's "player to their left
 * leads the first trick of the new round".
 */
export function advanceRound(
  round: number,
  scoredPlayers: readonly Player[],
): RoundAdvanceResult {
  if (round === LAST_ROUND) {
    return {
      players: [...scoredPlayers],
      currentRound: round,
      status: "Completed",
      trickLeader: null,
      remainingDeck: [],
    };
  }

  const nextRound = round + 1;
  const playerNames = scoredPlayers.map((player) => player.name);
  const { hands, remainingDeck } = dealRound(playerNames, nextRound);
  const players = scoredPlayers.map((player) => ({
    ...player,
    hand: hands.get(player.name) ?? [],
    bid: null,
    tricksWon: 0,
  }));
  const trickLeader = playerNames[(nextRound - 1) % playerNames.length] ?? null;

  return {
    players,
    currentRound: nextRound,
    status: "Active",
    trickLeader,
    remainingDeck,
  };
}
