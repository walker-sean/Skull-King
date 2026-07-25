import type { DisconnectCommand, EngineResult, RoomState } from "@skull-king/shared";

/**
 * Marks a Player disconnected, and pauses an Active Room so it waits for them (see
 * docs/adr/0001-live-synchronous-multiplayer.md). Not client-triggerable — the server calls
 * this from its socket "disconnect" handler — so there's no rejection path: an unknown Room
 * or Player, or a Player who's already disconnected (e.g. a duplicate disconnect event),
 * is a silent no-op rather than a failure.
 */
export function disconnectPlayer(state: RoomState | null, command: DisconnectCommand): EngineResult {
  if (state === null) {
    return { state: null, events: [] };
  }

  const player = state.players.find((candidate) => candidate.name === command.playerName);
  if (player === undefined || !player.connected) {
    return { state, events: [] };
  }

  const players = state.players.map((candidate) =>
    candidate.name === player.name ? { ...candidate, connected: false } : candidate,
  );
  const roomPauses = state.status === "Active";

  return {
    state: { ...state, players, status: roomPauses ? "Paused" : state.status },
    events: [
      { type: "PlayerDisconnected", roomCode: command.roomCode, playerName: player.name },
      ...(roomPauses ? [{ type: "RoomPaused", roomCode: command.roomCode } as const] : []),
    ],
  };
}
