import type { RoomState } from "@skull-king/shared";
import { areAllBidsSubmitted } from "@skull-king/engine";

/**
 * The wire-protocol view of Room state for one Player's socket: every other Player's
 * hand is always hidden (a Player may only see their own hand), and every other
 * Player's Bid is hidden too until every Player has bid, at which point all Bids
 * reveal at once (see CONTEXT.md's Bid glossary entry and `areAllBidsSubmitted`). The
 * Round's undealt cards are never broadcast in the state itself. `pendingReveal` — the
 * one-time peek Juanita Jade's Advanced Pirate Ability grants — is likewise hidden from
 * every viewer except the Player it belongs to.
 */
export function redactRoomStateFor(
  state: RoomState,
  viewerName: string | null,
): RoomState {
  const bidsRevealed = areAllBidsSubmitted(state);
  return {
    ...state,
    remainingDeck: [],
    pendingReveal:
      state.pendingReveal !== null &&
      state.pendingReveal.playerName === viewerName
        ? state.pendingReveal
        : null,
    players: state.players.map((player) => {
      const isViewer = player.name === viewerName;
      return {
        ...player,
        hand: isViewer ? player.hand : [],
        bid: isViewer || bidsRevealed ? player.bid : null,
      };
    }),
  };
}
