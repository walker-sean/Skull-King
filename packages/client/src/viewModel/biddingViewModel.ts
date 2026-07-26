import type { Card, RoomState } from "@skull-king/shared";
import { areAllBidsSubmitted } from "@skull-king/engine";

export interface BiddingPlayerView {
  name: string;
  isSelf: boolean;
  hasBid: boolean;
  /** This Player's Bid value once revealed; null before the reveal (or for the local Player, before they've submitted one). */
  bid: number | null;
}

export interface BiddingViewModel {
  currentRound: number | null;
  hand: Card[];
  handSize: number;
  localHasBid: boolean;
  localBid: number | null;
  allBidsRevealed: boolean;
  players: BiddingPlayerView[];
}

/** Derives what the Bidding screen renders from synced Room state plus the local Player's identity. */
export function selectBiddingView(
  state: RoomState,
  localPlayerName: string,
): BiddingViewModel {
  const localPlayer = state.players.find(
    (player) => player.name === localPlayerName,
  );
  const allBidsRevealed = areAllBidsSubmitted(state);

  return {
    currentRound: state.currentRound,
    hand: localPlayer?.hand ?? [],
    handSize: localPlayer?.hand.length ?? 0,
    localHasBid: localPlayer?.hasBid ?? false,
    localBid: localPlayer?.bid ?? null,
    allBidsRevealed,
    players: state.players.map((player) => ({
      name: player.name,
      isSelf: player.name === localPlayerName,
      hasBid: player.hasBid,
      bid: player.bid,
    })),
  };
}
