import type { Player, RoomState } from "@skull-king/shared";

/** Derives who the Paused-Room overlay should name from synced Room state. */
export function selectDisconnectedPlayers(state: RoomState): Player[] {
  return state.players.filter((player) => !player.connected);
}
