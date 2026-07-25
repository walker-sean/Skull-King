import {
  MAX_PLAYERS_TO_START,
  MIN_PLAYERS_TO_START,
  type EngineResult,
  type RoomState,
  type StartGameCommand,
  type StartGameRejectedReason,
} from "@skull-king/shared";

function rejected(
  state: RoomState | null,
  roomCode: string,
  reason: StartGameRejectedReason,
): EngineResult {
  return {
    state,
    events: [{ type: "StartGameRejected", roomCode, reason }],
  };
}

export function startGame(state: RoomState | null, command: StartGameCommand): EngineResult {
  if (state === null) {
    return rejected(null, command.roomCode, "RoomNotFound");
  }

  const host = state.players.find((player) => player.isHost);
  if (host === undefined || host.name !== command.actorName) {
    return rejected(state, command.roomCode, "NotHost");
  }

  if (state.status !== "Lobby") {
    return rejected(state, command.roomCode, "RoomNotInLobby");
  }

  if (state.players.length < MIN_PLAYERS_TO_START) {
    return rejected(state, command.roomCode, "TooFewPlayers");
  }

  if (state.players.length > MAX_PLAYERS_TO_START) {
    return rejected(state, command.roomCode, "TooManyPlayers");
  }

  return {
    state: { ...state, status: "Active", scoringMode: command.scoringMode },
    events: [
      { type: "GameStarted", roomCode: command.roomCode, scoringMode: command.scoringMode },
    ],
  };
}
