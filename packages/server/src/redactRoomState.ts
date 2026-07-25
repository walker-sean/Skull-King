import type { RoomState } from "@skull-king/shared";

/**
 * The wire-protocol view of Room state for one Player's socket: every other
 * Player's hand is hidden, since a Player may only see their own hand.
 */
export function redactHandsFor(state: RoomState, viewerName: string | null): RoomState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.name === viewerName ? player : { ...player, hand: [] },
    ),
  };
}
